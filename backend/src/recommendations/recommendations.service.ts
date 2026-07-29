import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TracksService } from '../tracks/tracks.service';
import { TfIdfEngine, UserHistoryItem, CandidateQueryGroup, RecommendedTrackResult } from './tfidf-engine';
import { TrackItemDto } from './dto/cache-related-tracks.dto';
import { CURATED_GENRES } from './curated-genres';
import { QueryType } from '@prisma/client';

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
  private readonly CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly tracksService: TracksService,
    private readonly tfidfEngine: TfIdfEngine,
  ) {}

  /**
   * Invalidates in-memory recommendation cache for a specific user.
   * Called by HistoryService when a user records a new track play.
   */
  invalidateUserCache(userId: string): void {
    if (this.recCache.has(userId)) {
      this.logger.log(`Invalidated recommendation cache for user: ${userId}`);
      this.recCache.delete(userId);
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
        thumbnailUrl: rh.track.thumbnailUrl,
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
        thumbnailUrl: res.track.thumbnailUrl,
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
        await this.prisma.tracks.upsert({
          where: { youtubeVideoId: item.id },
          update: {
            title: item.name,
            artist: item.artist || 'Unknown Artist',
            thumbnailUrl: item.thumbnail || null,
            genre: item.genre || [],
            lastFetchedAt: new Date(),
          },
          create: {
            youtubeVideoId: item.id,
            title: item.name,
            artist: item.artist || 'Unknown Artist',
            thumbnailUrl: item.thumbnail || null,
            genre: item.genre || [],
          },
        });

        await this.prisma.queryTrackResult.upsert({
          where: {
            queryId_trackId: {
              queryId: searchQuery.id,
              trackId: item.id,
            },
          },
          update: {
            rankPosition: idx + 1,
          },
          create: {
            queryId: searchQuery.id,
            trackId: item.id,
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
   * Generates or retrieves categorized explore music feed sections server-side.
   * 
   * @param userId - Optional user ID for history-driven explore keyword extraction
   * @param limitPerCategory - Maximum number of tracks returned per explore category section (default: 5)
   * @returns Categorized explore feed array
   */
  async getExploreFeed(userId?: string, limitPerCategory: number = 5) {
    // Inject randomness by shuffling the curated genres pool
    const shuffledCurated = this.shuffleArray(CURATED_GENRES);
    let keywords = shuffledCurated;

    if (userId) {
      try {
        const userHistory = await this.prisma.listenHistory.findMany({
          where: { userId },
          orderBy: { lastPlayedAt: 'desc' },
          take: 50,
          include: { track: true },
        });

        const genreFreq: Record<string, number> = {};
        for (const h of userHistory) {
          const list = [...(h.track.genre || []), ...(h.track.tags || [])];
          for (const word of list) {
            const kw = word.toLowerCase().trim();
            if (kw && kw.length > 2) {
              genreFreq[kw] = (genreFreq[kw] || 0) + 1;
            }
          }
        }

        const sortedUserKeywords = Object.entries(genreFreq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([kw]) => kw);

        if (sortedUserKeywords.length > 0) {
          const combined = [...new Set([...sortedUserKeywords, ...shuffledCurated])];
          keywords = combined;
        }
      } catch (err: any) {
        this.logger.warn(`Failed to extract user explore keywords: ${err.message}`);
      }
    }

    const exploreFeed: Array<{ title: string; tracks: Array<{ id: string; name: string; artist: string; thumbnail: string }> }> = [];

    // Take top 10 keywords and fetch/slice top 5 tracks per section
    for (const keyword of keywords.slice(0, 10)) {
      try {
        const searchResult = await this.tracksService.searchTracks(keyword);
        const mappedTracks = (searchResult.tracks || [])
          .map((t) => ({
            id: t.videoId,
            name: t.title,
            artist: t.channelTitle || 'Unknown Artist',
            thumbnail: t.thumbNail || '',
          }))
          .slice(0, limitPerCategory); // Default topN: 5 tracks per section

        exploreFeed.push({
          title: keyword,
          tracks: mappedTracks,
        });
      } catch (err: any) {
        this.logger.warn(`Explore section search failed for '${keyword}': ${err.message}`);
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
      thumbnail: currentTrack.thumbNail || currentTrack.thumbnail || '',
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
      thumbnail: h.track.thumbnailUrl || '',
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
}
