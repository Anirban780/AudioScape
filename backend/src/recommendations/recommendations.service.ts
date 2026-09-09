import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TracksService } from '../tracks/tracks.service';
import { TfIdfEngine, UserHistoryItem, CandidateQueryGroup, RecommendedTrackResult } from './tfidf-engine';
import { TrackItemDto } from './dto/cache-related-tracks.dto';
import { CURATED_GENRES, CURATED_CATEGORIES } from './curated-genres';
import { QueryType } from '@prisma/client';
import { calculateTasteWeight, calculateQualityScore } from './taste-weight.util';
import { getValidThumbnailUrl } from '../utils/youtubeUtils';

/**
 * ============================================================================
 * SERVICE: RECOMMENDATIONS & EXPLORE FEED BUSINESS LOGIC
 * ============================================================================
 * @module RecommendationsModule
 * 
 * PURPOSE:
 * Orchestrates content-based music recommendation computation, server-side explore feed
 * generation, play queue assembly, and legacy keyword search caching.
 * 
 * CACHING ARCHITECTURE:
 * - Layer 0 (In-Memory): Stores computed recommendation arrays per user ID with a 1-hour TTL.
 *   Cache is invalidated whenever the user records a new track listen event.
 * - Layer 1 (PostgreSQL SearchQuery Cache): Reuses cached search query results (24h TTL)
 *   as the candidate corpus for TF-IDF vectorization and explore feed sections.
 * ============================================================================
 */
@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  // In-memory cache mapping userId -> { tracks, expiresAt }
  private readonly recCache = new Map<string, { tracks: RecommendedTrackResult[]; expiresAt: number }>();
  // In-memory cache mapping userId -> { data: Map<string, number>, expiresAt: number }
  private readonly affinityCache = new Map<string, { data: Map<string, number>; expiresAt: number }>();
  // In-memory cache mapping `${userId || 'anonymous'}:${limitPerCategory}` -> { feed, expiresAt }
  private readonly exploreFeedCache = new Map<string, { feed: any[]; expiresAt: number }>();
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour
  private readonly EXPLORE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 Minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly tracksService: TracksService,
    private readonly tfidfEngine: TfIdfEngine,
  ) {}

  invalidateUserCache(userId: string): void {
    if (this.recCache.has(userId)) {
      this.logger.log(`Invalidated recommendation cache for user: ${userId}`);
      this.recCache.delete(userId);
    }
    if (this.affinityCache.has(userId)) {
      this.logger.log(`Invalidated category affinity cache for user: ${userId}`);
      this.affinityCache.delete(userId);
    }
    // Invalidate explore feed cache for this user
    for (const key of this.exploreFeedCache.keys()) {
      if (key.startsWith(userId)) {
        this.logger.log(`Invalidated explore feed cache for user: ${userId}`);
        this.exploreFeedCache.delete(key);
      }
    }
  }

  /**
   * Computes or fetches cached personalized music recommendations for a user.
   * Multi-Signal Track-Level Expansion Architecture:
   * - Signal 1 (60%): Top artists expansion leveraging B-Tree and GIN trigram indexes.
   * - Signal 2 (25%): Genre & tag array overlap matching.
   * - Signal 3 (15%): Recent search query candidates with rank-position decay.
   * - 80% Discovery / 20% Rediscovery: Strict 10-track session exclusion with up to 4 rediscovery tracks from older history.
   * - 100% PostgreSQL execution (0 YouTube API quota consumption).
   * 
   * @param userId - Internal PostgreSQL user UUID
   * @param topN - Number of recommended tracks to return (default: 20)
   * @returns Object containing success boolean and recommendations array
   */
  async getRecommendations(userId: string, topN: number = 20) {
    if (!userId) {
      throw new HttpException('User ID is required for recommendations', HttpStatus.BAD_REQUEST);
    }

    // STEP 1: Check In-Memory Cache (Layer 0)
    const cached = this.recCache.get(userId);
    if (cached && cached.expiresAt > Date.now() && cached.tracks.length >= topN) {
      this.logger.log(`In-memory cache HIT for user recommendations: ${userId}`);
      return {
        success: true,
        recommendations: cached.tracks.slice(0, topN),
        cached: true,
      };
    }

    // STEP 2: Load User Listen History (Last 100 played tracks)
    const historyRecords = await this.prisma.listenHistory.findMany({
      where: { userId },
      orderBy: { lastPlayedAt: 'desc' },
      take: 100,
      include: {
        track: {
          include: {
            queryResults: {
              include: {
                query: true,
              },
            },
          },
        },
      },
    });

    // Cold-start fallback for brand new users with no listening history
    if (!historyRecords || historyRecords.length === 0) {
      this.logger.log(`Cold start user (${userId}). Serving curated catalog recommendations.`);
      const coldStartRecs = await this.getColdStartRecommendations(topN);
      return {
        success: true,
        recommendations: coldStartRecs,
        cached: false,
      };
    }

    const now = new Date();
    const nowTime = now.getTime();

    // STEP 3: History Segmentation & Exclusion Rules
    // Rule A: Strictly exclude the 10 most recently played tracks (immediate session fatigue protection)
    const immediateSessionIds = new Set(historyRecords.slice(0, 10).map((h) => h.trackId));
    // Rule B: All played tracks excluded from fresh discovery pool
    const allHistoryTrackIds = new Set(historyRecords.map((h) => h.trackId));

    // Rule C: Rediscovery Pool (20% slot allocation / 4 tracks: tracks played > 14 days ago OR playCount <= 2, excluding immediate 10)
    const rediscoveryPool = historyRecords
      .filter((h) => {
        if (immediateSessionIds.has(h.trackId)) return false;
        if (h.track.isEmbeddable === false) return false;
        const days = (nowTime - new Date(h.lastPlayedAt).getTime()) / (1000 * 60 * 60 * 24);
        return days > 14 || h.playCount <= 2;
      })
      .map((h) => {
        const tasteWeight = calculateTasteWeight(
          { liked: h.liked, lastPlayedAt: h.lastPlayedAt, playCount: h.playCount },
          now,
        );
        const qualityScore = calculateQualityScore(h.track);
        return {
          history: h,
          score: tasteWeight * qualityScore,
        };
      })
      .sort((a, b) => b.score - a.score);

    // STEP 4: Seed Profile Extraction (Aggregated from user's full history)
    const artistWeights = new Map<string, number>();
    const tagWeights = new Map<string, number>();
    const userSearchQueryIds = new Set<string>();

    for (const h of historyRecords) {
      const weight = calculateTasteWeight(
        { liked: h.liked, lastPlayedAt: h.lastPlayedAt, playCount: h.playCount },
        now,
      );

      // Aggregate artist weights
      const artist = (h.track.artistName || h.track.artist || '').trim();
      if (artist && artist.toLowerCase() !== 'unknown artist') {
        artistWeights.set(artist, (artistWeights.get(artist) || 0) + weight);
      }

      // Aggregate genre and tag weights
      const combinedTags = [...(h.track.genre || []), ...(h.track.tags || [])];
      for (const tag of combinedTags) {
        const cleaned = tag.toLowerCase().trim();
        if (cleaned.length > 2) {
          tagWeights.set(cleaned, (tagWeights.get(cleaned) || 0) + weight);
        }
      }

      // Collect user search query references
      for (const qr of h.track.queryResults) {
        if (qr.query?.id) {
          userSearchQueryIds.add(qr.query.id);
        }
      }
    }

    const sortedArtists = [...artistWeights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    const maxArtistWeight = sortedArtists.length > 0 ? sortedArtists[0][1] : 1.0;

    const sortedTags = [...tagWeights.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    const maxTagWeight = sortedTags.length > 0 ? sortedTags[0][1] : 1.0;

    // STEP 5: Multi-Signal Candidate Track Retrieval (100% PostgreSQL)
    interface CandidateItem {
      track: any;
      score: number;
      sourceKeyword: string;
      signal: 'artist' | 'genre' | 'search' | 'rediscover' | 'curated';
    }
    const candidateMap = new Map<string, CandidateItem>();

    // SIGNAL 1: Top Artists Expansion (Target Weight: 60%)
    // Uses B-Tree and GIN trigram indexes created in Phase 2
    for (const [artist, weight] of sortedArtists) {
      try {
        const artistTracks = await this.prisma.tracks.findMany({
          where: {
            OR: [
              { artist: { equals: artist, mode: 'insensitive' } },
              { artistName: { equals: artist, mode: 'insensitive' } },
              { artist: { contains: artist, mode: 'insensitive' } },
              { artistName: { contains: artist, mode: 'insensitive' } },
            ],
            isEmbeddable: true,
            youtubeVideoId: { notIn: Array.from(allHistoryTrackIds) },
          },
          take: 6,
          orderBy: { likeCount: 'desc' },
        });

        for (const track of artistTracks) {
          if (!candidateMap.has(track.youtubeVideoId)) {
            const quality = calculateQualityScore(track);
            const jitter = 0.95 + Math.random() * 0.1;
            const score = 0.60 * (weight / maxArtistWeight) * quality * jitter;
            candidateMap.set(track.youtubeVideoId, {
              track,
              score,
              sourceKeyword: artist,
              signal: 'artist',
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`Artist expansion query failed for artist '${artist}': ${err.message}`);
      }
    }

    // SIGNAL 2: Genre & Tag Overlap Matching (Target Weight: 25%)
    if (sortedTags.length > 0) {
      const topTagNames = sortedTags.slice(0, 8).map(([tag]) => tag);
      try {
        const genreTracks = await this.prisma.tracks.findMany({
          where: {
            OR: [
              { genre: { hasSome: topTagNames } },
              { tags: { hasSome: topTagNames } },
            ],
            isEmbeddable: true,
            youtubeVideoId: {
              notIn: [
                ...Array.from(allHistoryTrackIds),
                ...Array.from(candidateMap.keys()),
              ],
            },
          },
          take: 30,
          orderBy: { likeCount: 'desc' },
        });

        for (const track of genreTracks) {
          if (!candidateMap.has(track.youtubeVideoId)) {
            const trackTags = [...(track.genre || []), ...(track.tags || [])].map((t) => t.toLowerCase().trim());
            let overlapWeight = 0;
            let dominantTag = topTagNames[0];
            let highestTagW = 0;

            for (const t of trackTags) {
              const w = tagWeights.get(t) || 0;
              if (w > 0) {
                overlapWeight += w;
                if (w > highestTagW) {
                  highestTagW = w;
                  dominantTag = t;
                }
              }
            }

            const quality = calculateQualityScore(track);
            const jitter = 0.95 + Math.random() * 0.1;
            const score = 0.25 * (Math.min(maxTagWeight, overlapWeight) / maxTagWeight) * quality * jitter;
            candidateMap.set(track.youtubeVideoId, {
              track,
              score,
              sourceKeyword: dominantTag ? (dominantTag.charAt(0).toUpperCase() + dominantTag.slice(1)) : 'Daily Mix',
              signal: 'genre',
            });
          }
        }
      } catch (err: any) {
        this.logger.warn(`Genre expansion query failed: ${err.message}`);
      }
    }

    // SIGNAL 3: Recent User Searches (Target Weight: 15%)
    try {
      const searchResults = await this.prisma.queryTrackResult.findMany({
        where: {
          OR: [
            ...(userSearchQueryIds.size > 0 ? [{ queryId: { in: Array.from(userSearchQueryIds) } }] : []),
            { query: { queryType: QueryType.USER_SEARCH } },
          ],
          track: {
            isEmbeddable: true,
            youtubeVideoId: {
              notIn: [
                ...Array.from(allHistoryTrackIds),
                ...Array.from(candidateMap.keys()),
              ],
            },
          },
        },
        include: {
          track: true,
          query: true,
        },
        take: 20,
        orderBy: { rankPosition: 'asc' },
      });

      for (const res of searchResults) {
        if (!candidateMap.has(res.track.youtubeVideoId)) {
          const rankDecay = 1.0 / Math.max(1, res.rankPosition || 1);
          const quality = calculateQualityScore(res.track);
          const jitter = 0.95 + Math.random() * 0.1;
          const score = 0.15 * rankDecay * quality * jitter;
          candidateMap.set(res.track.youtubeVideoId, {
            track: res.track,
            score,
            sourceKeyword: res.query.rawQuery,
            signal: 'search',
          });
        }
      }
    } catch (err: any) {
      this.logger.warn(`Search query expansion failed: ${err.message}`);
    }

    // BACKFILL: If candidate pool is still smaller than topN, backfill with top catalog tracks
    if (candidateMap.size < topN) {
      try {
        const needed = topN - candidateMap.size;
        const backfillTracks = await this.prisma.tracks.findMany({
          where: {
            isEmbeddable: true,
            youtubeVideoId: {
              notIn: [
                ...Array.from(immediateSessionIds),
                ...Array.from(candidateMap.keys()),
              ],
            },
          },
          take: needed + 10,
          orderBy: { likeCount: 'desc' },
        });

        for (const track of backfillTracks) {
          if (!candidateMap.has(track.youtubeVideoId)) {
            const quality = calculateQualityScore(track);
            candidateMap.set(track.youtubeVideoId, {
              track,
              score: 0.10 * quality,
              sourceKeyword: track.artist || track.artistName || 'Curated',
              signal: 'curated',
            });
          }
          if (candidateMap.size >= topN + 5) break;
        }
      } catch (err: any) {
        this.logger.warn(`Catalog backfill failed: ${err.message}`);
      }
    }

    // STEP 6: 80% Discovery vs 20% Rediscovery Slot Assembly
    // Slices top-scoring fresh discovery tracks and interleaves 4 rediscovery tracks
    // from the user's older or lightly-played history.
    const sortedDiscovery = Array.from(candidateMap.values()).sort((a, b) => b.score - a.score);

    // Rediscovery Allocation:
    // For topN >= 20, allocate 4 rediscovery tracks (or proportional if topN is smaller)
    // Capped by the number of qualifying rediscovery candidates available in rediscoveryPool.
    const maxRediscoveryTarget = topN >= 20 ? 4 : Math.min(4, Math.max(1, Math.floor(topN * 0.20)));
    const rediscoveryCount = Math.min(maxRediscoveryTarget, rediscoveryPool.length);
    const discoveryCount = Math.max(0, topN - rediscoveryCount);

    // Extract fresh discovery tracks
    const selectedCandidates: CandidateItem[] = sortedDiscovery.slice(0, discoveryCount);

    // Extract up to 4 top-scoring rediscovery tracks
    if (rediscoveryCount > 0) {
      const topRediscoveries = rediscoveryPool.slice(0, rediscoveryCount);
      const rediscoveryItems: CandidateItem[] = topRediscoveries.map((item) => {
        const artistName = item.history.track.artistName || item.history.track.artist || 'Favorite';
        return {
          track: item.history.track,
          score: Math.max(0.90, item.score),
          sourceKeyword: `Rediscover: ${artistName}`,
          signal: 'rediscover',
        };
      });

      // Interleave rediscovery tracks evenly across the recommendation set
      // For a 20-track payload (16 fresh + 4 rediscovery), tracks are placed at indices ~3, ~8, ~13, ~18
      // creating an optimal pacing of ~4 new songs followed by 1 familiar rediscovery song.
      rediscoveryItems.forEach((rediscoveryItem, idx) => {
        const spacingInterval = Math.max(3, Math.floor(selectedCandidates.length / (rediscoveryCount + 1)));
        const targetIndex = Math.min(selectedCandidates.length, (idx + 1) * spacingInterval + idx);
        selectedCandidates.splice(targetIndex, 0, rediscoveryItem);
      });
    }

    // Format output matching frontend schema and RecommendedTrackResult interface
    const finalRecommendations: RecommendedTrackResult[] = selectedCandidates.map((c) => ({
      videoId: c.track.youtubeVideoId,
      title: c.track.title,
      artist: c.track.artist || c.track.artistName || 'Unknown Artist',
      thumbNail: getValidThumbnailUrl(c.track.thumbnailUrl) || '',
      sourceKeyword: c.sourceKeyword,
      similarityScore: Math.round(c.score * 100) / 100,
    }));

    // Store in Layer 0 In-Memory Cache (1-Hour TTL)
    this.recCache.set(userId, {
      tracks: finalRecommendations,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return {
      success: true,
      recommendations: finalRecommendations,
      cached: false,
    };
  }

  /**
   * Generates cold-start recommendations for users with 0 listening history.
   * Pulls high-engagement, embeddable tracks across diverse catalog genres.
   */
  private async getColdStartRecommendations(count: number = 20): Promise<RecommendedTrackResult[]> {
    try {
      const tracks = await this.prisma.tracks.findMany({
        where: {
          isEmbeddable: true,
        },
        take: Math.max(50, count * 2),
        orderBy: { likeCount: 'desc' },
      });

      const shuffled = this.shuffleArray(tracks).slice(0, count);
      return shuffled.map((t) => ({
        videoId: t.youtubeVideoId,
        title: t.title,
        artist: t.artist || t.artistName || 'Unknown Artist',
        thumbNail: getValidThumbnailUrl(t.thumbnailUrl) || '',
        sourceKeyword: (t.genre && t.genre[0]) || t.artist || 'Trending',
        similarityScore: 1.0,
      }));
    } catch (err: any) {
      this.logger.error(`Cold-start query failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Retrieves paginated personalized recommendations for infinite scroll or paginated browse pages.
   * 
   * @param userId - User PostgreSQL UUID
   * @param page - 1-based page number
   * @param limit - Tracks per page (default: 20)
   * @param shuffle - Whether to randomize candidate order before pagination
   * @returns Paginated recommendation result object
   */
  async getPaginatedRecommendations(
    userId: string,
    page: number = 1,
    limit: number = 20,
    shuffle: boolean = false,
  ) {
    const recResult = await this.getRecommendations(userId, 100);
    let pool = [...(recResult.recommendations || [])];

    if (shuffle) {
      pool = this.shuffleArray(pool);
    }

    const total = pool.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.max(1, Math.min(page, totalPages));
    const startIndex = (safePage - 1) * limit;
    const paginatedItems = pool.slice(startIndex, startIndex + limit);

    return {
      success: true,
      page: safePage,
      limit,
      total,
      totalPages,
      recommendations: paginatedItems,
    };
  }

  /**
   * Caches keyword search results from legacy frontend or explore pre-warming into PostgreSQL.
   * 
   * @param keyword - Search query or genre keyword string
   * @param tracks - Array of track item objects
   */
  async cacheRelatedTracks(keyword: string, tracks: TrackItemDto[]) {
    if (!keyword || !keyword.trim()) {
      throw new HttpException('Keyword parameter is required', HttpStatus.BAD_REQUEST);
    }

    const normalizedQuery = keyword.toLowerCase().trim();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    try {
      // Upsert SearchQuery row
      const searchQuery = await this.prisma.searchQuery.upsert({
        where: { normalizedQuery },
        update: {
          rawQuery: keyword,
          lastSearchedAt: new Date(),
          expiresAt,
          resultCount: tracks.length,
          queryType: QueryType.CURATED_KEYWORD,
        },
        create: {
          normalizedQuery,
          rawQuery: keyword,
          queryType: QueryType.CURATED_KEYWORD,
          expiresAt,
          resultCount: tracks.length,
        },
      });

      // Upsert tracks & junction results
      for (let idx = 0; idx < tracks.length; idx++) {
        const item = tracks[idx];
        const trackId = item.id || item.videoId;
        if (!trackId) continue;

        const title = item.name || item.title || 'Unknown Title';
        const artist = item.artist || item.channelTitle || 'Unknown Artist';
        const thumbnailUrl = item.thumbnail || item.thumbNail || null;

        await this.prisma.tracks.upsert({
          where: { youtubeVideoId: trackId },
          update: {
            title,
            artist,
            thumbnailUrl,
            genre: item.genre || [],
            lastFetchedAt: new Date(),
          },
          create: {
            youtubeVideoId: trackId,
            title,
            artist,
            thumbnailUrl,
            genre: item.genre || [],
          },
        });

        await this.prisma.queryTrackResult.upsert({
          where: {
            queryId_trackId: {
              queryId: searchQuery.id,
              trackId,
            },
          },
          update: {
            rankPosition: idx + 1,
          },
          create: {
            queryId: searchQuery.id,
            trackId,
            rankPosition: idx + 1,
          },
        });
      }

      return {
        success: true,
        message: `Successfully cached ${tracks.length} tracks for keyword '${keyword}'`,
      };
    } catch (err: any) {
      this.logger.error(`Error caching related tracks: ${err.message}`);
      throw new HttpException('Failed to cache related tracks in database', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
  /**
   * Helper array shuffling utility (Fisher-Yates) for randomizing explore genres.
   */
  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Computes category affinity weights for a user based on their listen history.
   * Leverages relational joins (ListenHistory -> Tracks -> QueryTrackResult -> SearchQuery).
   * 
   * WHY:
   * Provides zero-overhead personalization. By checking which categories the user's listened
   * tracks belonged to, we get a direct signal of their genre preferences without fuzzy text matching.
   * 
   * HOW:
   * - Checks `affinityCache` to see if cached data is still fresh (1-hour TTL).
   * - Gathers up to 100 history items for the user, including category links.
   * - Calculates composite taste weight for each played track.
   * - Accumulates weight per curated category keyword.
   * - Stores results in in-memory cache and returns the affinity map.
   */
  async getCategoryAffinity(userId: string): Promise<Map<string, number>> {
    const now = Date.now();
    const cached = this.affinityCache.get(userId);
    if (cached && cached.expiresAt > now) {
      this.logger.log(`Affinity cache HIT for user: ${userId}`);
      return cached.data;
    }

    const history = await this.prisma.listenHistory.findMany({
      where: { userId },
      take: 100,
      orderBy: { lastPlayedAt: 'desc' },
      include: {
        track: {
          include: {
            queryResults: {
              include: {
                query: {
                  select: {
                    rawQuery: true,
                    queryType: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const affinity = new Map<string, number>();
    const nowLocalDate = new Date();

    for (const h of history) {
      const weight = calculateTasteWeight({
        liked: h.liked,
        lastPlayedAt: h.lastPlayedAt,
        playCount: h.playCount,
      }, nowLocalDate);

      for (const qr of h.track.queryResults) {
        if (qr.query.queryType === QueryType.CURATED_KEYWORD) {
          const key = qr.query.rawQuery.toLowerCase().trim();
          affinity.set(key, (affinity.get(key) || 0) + weight);
        } else if (qr.query.queryType === QueryType.USER_SEARCH) {
          // Tokenize user search query and match against CURATED_CATEGORIES
          const searchStems = this.extractStemTokens(qr.query.rawQuery);
          for (const category of CURATED_CATEGORIES) {
            const catStems = this.extractStemTokens(category.keyword);
            const matches = searchStems.some(
              (s) => catStems.includes(s) || category.keyword.toLowerCase().includes(s),
            );
            if (matches) {
              const catKey = category.keyword.toLowerCase().trim();
              // User search adds 0.75x weight toward matching curated explore category
              affinity.set(catKey, (affinity.get(catKey) || 0) + weight * 0.75);
            }
          }
        }
      }
    }

    this.affinityCache.set(userId, {
      data: affinity,
      expiresAt: now + this.CACHE_TTL_MS,
    });

    return affinity;
  }

  /**
   * Helper extracting meaningful stem words from a category keyword, removing common stopwords.
   */
  private extractStemTokens(str: string): string[] {
    const STOPWORDS = new Set(['music', 'songs', 'playlist', 'hits', 'beats', 'covers', '2026', 'mix', 'chill']);
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOPWORDS.has(word));
  }

  /**
   * Checks if candidate category shares primary stems or parent taxonomy cluster with already selected categories.
   * Enforces Strategy A (stem token overlap) and Strategy C (max 1 category per parent cluster).
   */
  private isDuplicateOrOverlappingCategory(
    candidateKeyword: string,
    selectedCategoryKeywords: string[],
  ): boolean {
    const candidateCategory = CURATED_CATEGORIES.find(
      (c) => c.keyword.toLowerCase().trim() === candidateKeyword.toLowerCase().trim(),
    );

    const candidateStems = this.extractStemTokens(candidateKeyword);

    for (const selected of selectedCategoryKeywords) {
      const selectedCategory = CURATED_CATEGORIES.find(
        (c) => c.keyword.toLowerCase().trim() === selected.toLowerCase().trim(),
      );

      // Strategy C: Cluster Constraint Check (Max 1 per parent cluster)
      if (
        candidateCategory &&
        selectedCategory &&
        candidateCategory.cluster === selectedCategory.cluster
      ) {
        return true;
      }

      // Strategy A: Stem Token Overlap Check
      const selectedStems = this.extractStemTokens(selected);
      const hasSharedStem = candidateStems.some((stem) => selectedStems.includes(stem));
      if (hasSharedStem) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generates or retrieves personalized categorized explore music feed sections.
   * Blends user-personalized categories (exploit) with globally popular discovery categories (explore).
   * Enforces Strategy A & C deduplication (stem token matching & parent cluster constraints).
   * 
   * WHY:
   * 1. A discovery feed must adapt to user tastes over time.
   * 2. It must avoid becoming an echo chamber (filter bubble) or repeating near-duplicate categories (e.g. 6 lofi variants).
   * 3. Categories should load instantly from PostgreSQL without waiting on YouTube API responses.
   * 
   * HOW:
   * - Computes user category affinity. If user is a cold start (< 3 plays or thin data), shuffles curated genres.
   * - Exploit: Selects up to 6 categories with positive user affinity scores, enforcing 1 category per cluster and stem deduplication.
   * - Explore: Selects 4 categories not in exploit pool, sorted by their global hitCount (popularity) in SearchQuery.
   * - For each of the 10 selected categories:
   *   1. Runs `ensureCategoryPopulated()` to ensure database is backfilled to 50 tracks.
   *   2. Executes `searchTracks()` in dbOnly mode to fetch the local page-cache tracks.
   *   3. Slices the result list to the requested client count.
   * 
   * @param userId - Optional user ID for personalization
   * @param limitPerCategory - Max tracks returned per section (default: 5)
   * @returns Array of explore feed categories with track items
   */
  async getExploreFeed(userId?: string, limitPerCategory: number = 5) {
    // STEP 0: Check In-Memory Explore Feed Cache (Layer 0)
    const cacheKey = `${userId || 'anonymous'}:${limitPerCategory}`;
    const cached = this.exploreFeedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.log(`In-memory cache HIT for explore feed [key: ${cacheKey}]`);
      return cached.feed;
    }

    let keywords: string[] = [];

    // Check cold-start status or execute personalization
    let hasPersonalization = false;
    let affinityMap = new Map<string, number>();

    if (userId) {
      try {
        const historyCount = await this.prisma.listenHistory.count({ where: { userId } });
        if (historyCount >= 3) {
          affinityMap = await this.getCategoryAffinity(userId);
          hasPersonalization = affinityMap.size > 0;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to retrieve category affinity for personalization: ${err.message}`);
      }
    }

    if (!hasPersonalization) {
      // Cold-start fallback: Shuffle the entire curated pool and take 10
      this.logger.log(`Cold start or anonymous request. Serving shuffled curated categories.`);
      keywords = this.shuffleArray(CURATED_GENRES).slice(0, 10);
    } else {
      // Exploit vs Explore blend (6 personalized + 4 discovery) with Strategy A & C deduplication
      const sortedAffinity = [...affinityMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => key);

      // 1. Take up to 6 personalized categories (exploit), filtering duplicates via Strategy A & C
      const personalizedKeywords: string[] = [];
      for (const key of sortedAffinity) {
        if (!this.isDuplicateOrOverlappingCategory(key, personalizedKeywords)) {
          personalizedKeywords.push(key);
        }
        if (personalizedKeywords.length >= 6) break;
      }

      // 2. Load global popularity (hitCount) of categories to rank exploration
      let popularKeywords: string[] = [];
      try {
        const popularQueries = await this.prisma.searchQuery.findMany({
          where: { queryType: QueryType.CURATED_KEYWORD },
          orderBy: { hitCount: 'desc' },
          select: { rawQuery: true },
          take: 50,
        });
        popularKeywords = popularQueries.map((q) => q.rawQuery.toLowerCase().trim());
      } catch (err: any) {
        this.logger.warn(`Failed to fetch popular categories for explore sorting: ${err.message}`);
      }

      // Filter remaining curated genres that are NOT in exploit list and do not share cluster/stems
      const remainingCurated = CURATED_GENRES.filter((c) => !personalizedKeywords.includes(c));

      // Sort remaining curated by global popularity index, fall back to shuffled list order
      const remainingSorted = [...remainingCurated].sort((a, b) => {
        const indexA = popularKeywords.indexOf(a.toLowerCase().trim());
        const indexB = popularKeywords.indexOf(b.toLowerCase().trim());
        
        // Lower index in popularKeywords means higher popularity
        const scoreA = indexA === -1 ? 999 : indexA;
        const scoreB = indexB === -1 ? 999 : indexB;
        return scoreA - scoreB;
      });

      // 3. Take discovery categories (explore) to reach 10 total categories, avoiding cluster overlap
      const discoveryKeywords: string[] = [];
      for (const candidate of remainingSorted) {
        if (!this.isDuplicateOrOverlappingCategory(candidate, [...personalizedKeywords, ...discoveryKeywords])) {
          discoveryKeywords.push(candidate);
        }
        if (personalizedKeywords.length + discoveryKeywords.length >= 10) break;
      }

      // Fallback: If strict cluster filtering leaves < 10 total categories, relax stem check to backfill up to 10
      if (personalizedKeywords.length + discoveryKeywords.length < 10) {
        for (const candidate of remainingSorted) {
          if (!personalizedKeywords.includes(candidate) && !discoveryKeywords.includes(candidate)) {
            discoveryKeywords.push(candidate);
          }
          if (personalizedKeywords.length + discoveryKeywords.length >= 10) break;
        }
      }

      keywords = [...personalizedKeywords, ...discoveryKeywords];
      this.logger.log(
        `Personalized blend selected with Strategy A & C deduplication: exploitCount=${personalizedKeywords.length}, exploreCount=${discoveryKeywords.length} [keywords: ${keywords.join(', ')}]`,
      );
    }

    // Pre-warm and fetch tracks for each selected category concurrently via Promise.all
    // Eliminates serial DB round-trips over Neon PostgreSQL (collapses ~2s serial wait to <200ms)
    const exploreFeed = await Promise.all(
      keywords.map(async (keyword) => {
        try {
          // Step A: Ensure target count is populated in DB (DB-first, YouTube API backfill if needed)
          await this.tracksService.ensureCategoryPopulated(keyword, 50);

          // Step B: Query tracks from DB only to guarantee sub-20ms latency
          const searchResult = await this.tracksService.searchTracks(keyword, '', true);

          const mappedTracks = (searchResult.tracks || [])
            .map((t) => ({
              id: t.videoId,
              name: t.title,
              artist: t.channelTitle || 'Unknown Artist',
              thumbnail: getValidThumbnailUrl(t.thumbNail) || '',
            }))
            .slice(0, limitPerCategory);

          const categoryMeta = CURATED_CATEGORIES.find(
            (c) => c.keyword.toLowerCase().trim() === keyword.toLowerCase().trim(),
          );
          const sectionTitle = categoryMeta ? categoryMeta.label : keyword;

          return {
            title: sectionTitle,
            tracks: mappedTracks,
          };
        } catch (err: any) {
          this.logger.error(`Explore section processing failed for keyword '${keyword}': ${err.message}`);
          return {
            title: keyword,
            tracks: [],
          };
        }
      }),
    );

    // Save computed feed to Layer 0 In-Memory Cache
    this.exploreFeedCache.set(cacheKey, {
      feed: exploreFeed,
      expiresAt: Date.now() + this.EXPLORE_CACHE_TTL_MS,
    });

    return exploreFeed;
  }

  /**
   * Generates a context-aware continuous playback queue mixing current track, related search tracks, and recent listening history.
   * 
   * @param userId - Internal PostgreSQL user UUID
   * @param currentTrackId - Active playing YouTube video ID
   * @param keyword - Optional context keyword
   * @returns Array of queued track objects
   */
  async generateQueue(userId: string, currentTrackId: string, keyword?: string) {
    if (!currentTrackId) {
      throw new HttpException('currentTrackId parameter is required', HttpStatus.BAD_REQUEST);
    }

    // STEP 1: Fetch current track metadata details
    let currentTrack: any = null;
    try {
      currentTrack = await this.tracksService.getTrackDetails(currentTrackId);
    } catch {
      currentTrack = {
        id: currentTrackId,
        videoId: currentTrackId,
        name: 'Current Playing Track',
        artist: 'Unknown Artist',
        thumbnail: '',
      };
    }

    const currentTrackObj = {
      id: currentTrack.videoId || currentTrackId,
      name: currentTrack.title || 'Current Track',
      artist: currentTrack.channelTitle || currentTrack.artist || 'Unknown Artist',
      thumbnail: getValidThumbnailUrl(currentTrack.thumbNail || currentTrack.thumbnail) || '',
    };

    let relatedTracks: Array<{ id: string; name: string; artist: string; thumbnail: string }> = [];

    // STEP 2: Fetch related candidate tracks from SearchQuery or Recommendations
    if (keyword && keyword.trim()) {
      try {
        const searchRes = await this.tracksService.searchTracks(keyword);
        relatedTracks = (searchRes.tracks || []).map((t) => ({
          id: t.videoId,
          name: t.title,
          artist: t.channelTitle,
          thumbnail: t.thumbNail,
        }));
      } catch (err: any) {
        this.logger.warn(`Queue search failed for keyword '${keyword}': ${err.message}`);
      }
    }

    if (relatedTracks.length === 0) {
      const recRes = await this.getRecommendations(userId, 15);
      relatedTracks = (recRes.recommendations || []).map((t) => ({
        id: t.videoId,
        name: t.title,
        artist: t.artist,
        thumbnail: t.thumbNail,
      }));
    }

    // STEP 3: Fetch recent listening history
    const recentHistory = await this.prisma.listenHistory.findMany({
      where: { userId },
      orderBy: { lastPlayedAt: 'desc' },
      take: 20,
      include: { track: true },
    });

    const recentTracks = recentHistory.map((h) => ({
      id: h.track.youtubeVideoId,
      name: h.track.title,
      artist: h.track.artist || h.track.artistName || 'Unknown Artist',
      thumbnail: getValidThumbnailUrl(h.track.thumbnailUrl) || '',
    }));

    // STEP 4: Balance and mix queue (up to 12 related + 7 recent = ~20 tracks)
    const usedIds = new Set<string>([currentTrackObj.id]);
    const finalQueue = [currentTrackObj];

    for (const track of relatedTracks) {
      if (!usedIds.has(track.id)) {
        usedIds.add(track.id);
        finalQueue.push(track);
        if (finalQueue.length >= 13) break; // current + 12 related
      }
    }

    for (const track of recentTracks) {
      if (!usedIds.has(track.id)) {
        usedIds.add(track.id);
        finalQueue.push(track);
        if (finalQueue.length >= 20) break; // total queue length ~20
      }
    }

    return finalQueue;
  }

  /**
   * Generates additional non-duplicate recommended tracks to extend an active playback queue (radio auto-refill).
   * 
   * @param userId - Internal PostgreSQL user UUID
   * @param existingTrackIds - Array of track IDs currently present in user's queue
   * @param keyword - Optional genre/context keyword
   * @returns Array of new non-duplicate queued track objects
   */
  async extendQueue(userId: string, existingTrackIds: string[], keyword?: string) {
    const usedIds = new Set<string>(existingTrackIds || []);
    let candidateTracks: Array<{ id: string; name: string; artist: string; thumbnail: string }> = [];

    // STEP 1: Search for candidates using keyword context if provided
    if (keyword && keyword.trim()) {
      try {
        const searchRes = await this.tracksService.searchTracks(keyword);
        candidateTracks = (searchRes.tracks || []).map((t) => ({
          id: t.videoId,
          name: t.title,
          artist: t.channelTitle,
          thumbnail: getValidThumbnailUrl(t.thumbNail) || '',
        }));
      } catch (err: any) {
        this.logger.warn(`Extend queue search failed for keyword '${keyword}': ${err.message}`);
      }
    }

    // STEP 2: Augment with personalized recommendations
    const recRes = await this.getRecommendations(userId, 20);
    const recTracks = (recRes.recommendations || []).map((t) => ({
      id: t.videoId,
      name: t.title,
      artist: t.artist,
      thumbnail: getValidThumbnailUrl(t.thumbNail) || '',
    }));

    const combinedCandidates = [...candidateTracks, ...recTracks];
    const newTracks: Array<{ id: string; name: string; artist: string; thumbnail: string }> = [];

    for (const track of combinedCandidates) {
      if (track.id && !usedIds.has(track.id)) {
        usedIds.add(track.id);
        newTracks.push(track);
        if (newTracks.length >= 10) break; // Fetch 10 fresh tracks
      }
    }

    return newTracks;
  }

  /**
   * Returns the authoritative list of explore categories with visual rendering metadata.
   */
  async getCategories() {
    return CURATED_CATEGORIES;
  }

  /**
   * Background Pre-Warming Routine: Pre-fills PostgreSQL page cache for popular & baseline explore categories.
   * 
   * WHY:
   * 1. Guarantees Explore page responses load sub-20ms from PostgreSQL without executing live YouTube API search calls.
   * 2. Bounds daily YouTube API quota consumption to ~3,000 units by pre-warming in batch instead of on live user requests.
   * 3. Uses `CURATED_CATEGORY_CACHE_TTL_DAYS` (default 7 days) to govern cache freshness.
   * 
   * HOW:
   * - Selects target categories: Top popular categories by SearchQuery `hitCount` plus core baseline categories.
   * - Invokes `ensureCategoryPopulated(keyword, 50, 2)` sequentially in the background.
   * - Logs execution time, total tracks stored, and cache hits.
   * 
   * @param maxCategoriesToWarm - Number of categories to pre-warm in batch (default: 20)
   */
  async refreshExploreCache(maxCategoriesToWarm: number = 20) {
    const startTime = Date.now();
    this.logger.log(`[Cron Pre-Warming] Starting background explore cache pre-warming for top ${maxCategoriesToWarm} categories...`);

    let targetKeywords: string[] = [];
    try {
      const popularQueries = await this.prisma.searchQuery.findMany({
        where: { queryType: QueryType.CURATED_KEYWORD },
        orderBy: { hitCount: 'desc' },
        select: { rawQuery: true },
        take: maxCategoriesToWarm,
      });
      targetKeywords = popularQueries.map((q) => q.rawQuery);
    } catch (err: any) {
      this.logger.warn(`[Cron Pre-Warming] Failed to query popular categories: ${err.message}`);
    }

    // Merge with top baseline curated categories to guarantee coverage
    const baselineKeywords = CURATED_CATEGORIES.slice(0, 10).map((c) => c.keyword);
    const combinedSet = new Set<string>([...targetKeywords, ...baselineKeywords]);
    const categoriesToProcess = [...combinedSet].slice(0, maxCategoriesToWarm);

    let cacheHits = 0;
    let cacheMisses = 0;
    let totalTracksIngested = 0;

    for (const keyword of categoriesToProcess) {
      try {
        const result = await this.tracksService.ensureCategoryPopulated(keyword, 50, 2);
        if (result.fromCache) {
          cacheHits++;
        } else {
          cacheMisses++;
          totalTracksIngested += result.trackCount;
        }
      } catch (err: any) {
        this.logger.error(`[Cron Pre-Warming] Failed to pre-warm category "${keyword}": ${err.message}`);
      }
    }

    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);
    const summary = {
      success: true,
      processedCategories: categoriesToProcess.length,
      cacheHits,
      cacheMisses,
      totalTracksIngested,
      durationSeconds: `${durationSeconds}s`,
      timestamp: new Date().toISOString(),
    };

    // Invalidate in-memory explore feed cache so freshly pre-warmed categories are immediately served
    this.exploreFeedCache.clear();

    this.logger.log(
      `[Cron Pre-Warming] Completed background pre-warming in ${durationSeconds}s: ${cacheHits} hits (DB), ${cacheMisses} missed/updated from YouTube.`,
    );

    return summary;
  }
}
