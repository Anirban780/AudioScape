import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TracksService } from '../tracks/tracks.service';
import { TfIdfEngine, UserHistoryItem, CandidateQueryGroup, RecommendedTrackResult } from './tfidf-engine';
import { TrackItemDto } from './dto/cache-related-tracks.dto';
import { CURATED_GENRES, CURATED_CATEGORIES } from './curated-genres';
import { QueryType } from '@prisma/client';
import { calculateTasteWeight } from './taste-weight.util';
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
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour

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
  }

  /**
   * Computes or fetches cached personalized music recommendations for a user.
   * 
   * @param userId - Internal PostgreSQL user UUID
   * @param topN - Number of recommended tracks to return (default: 5)
   * @returns Object containing success boolean and recommendations array
   */
  async getRecommendations(userId: string, topN: number = 5) {
    if (!userId) {
      throw new HttpException('User ID is required for recommendations', HttpStatus.BAD_REQUEST);
    }

    // STEP 1: Check In-Memory Cache (Layer 0)
    const cached = this.recCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
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
        track: true,
      },
    });

    const userHistory: UserHistoryItem[] = historyRecords.map((rh) => ({
      trackId: rh.trackId,
      playCount: rh.playCount,
      liked: rh.liked,
      lastPlayedAt: rh.lastPlayedAt,
      track: {
        youtubeVideoId: rh.track.youtubeVideoId,
        title: rh.track.title,
        artist: rh.track.artist || rh.track.artistName || 'Unknown Artist',
        genre: rh.track.genre || [],
        tags: rh.track.tags || [],
        thumbnailUrl: getValidThumbnailUrl(rh.track.thumbnailUrl) || '',
      },
    }));

    // STEP 3: Load Candidate Search Query Corpus (Layer 1 SearchQuery)
    const candidateQueries = await this.prisma.searchQuery.findMany({
      where: {
        OR: [
          { expiresAt: { gt: new Date() } },
          { queryType: QueryType.CURATED_KEYWORD },
        ],
      },
      take: 50,
      include: {
        results: {
          orderBy: { rankPosition: 'asc' },
          include: { track: true },
        },
      },
    });

    const candidateGroups: CandidateQueryGroup[] = candidateQueries.map((sq) => ({
      queryId: sq.id,
      keyword: sq.rawQuery,
      tracks: sq.results.map((res) => ({
        youtubeVideoId: res.track.youtubeVideoId,
        title: res.track.title,
        artist: res.track.artist || res.track.artistName || 'Unknown Artist',
        thumbnailUrl: getValidThumbnailUrl(res.track.thumbnailUrl) || '',
        genre: res.track.genre || [],
        tags: res.track.tags || [],
      })),
    }));

    // STEP 4: Compute TF-IDF Recommendations Engine
    const recommendations = this.tfidfEngine.computeRecommendations(userHistory, candidateGroups, topN);

    // STEP 5: Store in In-Memory Cache
    this.recCache.set(userId, {
      tracks: recommendations,
      expiresAt: Date.now() + this.CACHE_TTL_MS,
    });

    return {
      success: true,
      recommendations,
      cached: false,
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
        if (qr.query.queryType !== QueryType.CURATED_KEYWORD) continue;
        const key = qr.query.rawQuery.toLowerCase().trim();
        affinity.set(key, (affinity.get(key) || 0) + weight);
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

    const exploreFeed: Array<{ title: string; tracks: Array<{ id: string; name: string; artist: string; thumbnail: string }> }> = [];

    // Pre-warm and fetch tracks for each selected category
    for (const keyword of keywords) {
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

        exploreFeed.push({
          title: sectionTitle,
          tracks: mappedTracks,
        });
      } catch (err: any) {
        this.logger.error(`Explore section processing failed for keyword '${keyword}': ${err.message}`);
        exploreFeed.push({
          title: keyword,
          tracks: [],
        });
      }
    }

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

    // STEP 4: Balance and mix queue (6 related + 4 recent)
    const usedIds = new Set<string>([currentTrackObj.id]);
    const finalQueue = [currentTrackObj];

    for (const track of relatedTracks) {
      if (!usedIds.has(track.id)) {
        usedIds.add(track.id);
        finalQueue.push(track);
        if (finalQueue.length >= 7) break; // current + 6 related
      }
    }

    for (const track of recentTracks) {
      if (!usedIds.has(track.id)) {
        usedIds.add(track.id);
        finalQueue.push(track);
        if (finalQueue.length >= 11) break; // total queue length ~11
      }
    }

    return finalQueue;
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

    this.logger.log(
      `[Cron Pre-Warming] Completed background pre-warming in ${durationSeconds}s: ${cacheHits} hits (DB), ${cacheMisses} missed/updated from YouTube.`,
    );

    return summary;
  }
}
