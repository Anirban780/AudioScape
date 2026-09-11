import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { ApiEndpoint, QueryType } from '@prisma/client';
import { YouTubeKeyManager } from './youtube-key-manager';
import { SearchRateLimiterService } from './search-rate-limiter.service';
import { getValidThumbnailUrl } from '../utils/youtubeUtils';
import { parseTrackTitle } from './utils/title-parser.util';
import { CURATED_GENRES } from '../recommendations/curated-genres';

/**
 * ============================================================================
 * SERVICE: TRACKS & YOUTUBE DATA PIPELINE WITH POSTGRESQL CACHING
 * ============================================================================
 * @module TracksModule
 * 
 * PURPOSE:
 * Proxies YouTube Data API v3 requests (search, track details, categories), implements
 * a high-performance PostgreSQL cache layer with 24-hour TTL expiry aligned with the
 * database schema (SearchQuery, QueryTrackResult, Tracks, Channel, ApiQuotaUsage),
 * enforces multi-tier live search rate limits (3/min, 20/day), provides 30-day ToS refresh,
 * and tracks daily API quota usage across dual key pools via YouTubeKeyManager.
 * ============================================================================
 */
/**
 * Differentiated Cache TTL in days:
 * - Default / Curated Categories: 15 days
 * - User Songs / Dynamic Category Searches: 7 days
 */
export const CURATED_DEFAULT_CACHE_TTL_DAYS = 15;
export const USER_CATEGORY_CACHE_TTL_DAYS = 7;
export const CURATED_CATEGORY_CACHE_TTL_DAYS = 15; // backward-compatibility alias

@Injectable()
export class TracksService {
  private readonly logger = new Logger(TracksService.name);
  private cachedMusicCategoryId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly keyManager: YouTubeKeyManager,
    private readonly rateLimiter: SearchRateLimiterService,
  ) {}

  /**
   * Helper retrieving active API key & key ID from YouTubeKeyManager pool.
   */
  private async getActiveKey() {
    return await this.keyManager.getActiveApiKey();
  }

  /**
   * Dynamically fetches and caches the YouTube "Music" Category ID (typically "10").
   */
  async getMusicCategoryId(): Promise<string> {
    if (this.cachedMusicCategoryId) {
      return this.cachedMusicCategoryId;
    }

    try {
      const { key, keyId } = await this.getActiveKey();
      const url = `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US&key=${key}`;
      const response = await axios.get(url);
      const items = response.data.items || [];
      const musicCategory = items.find(
        (item: any) => item.snippet?.title?.toLowerCase() === 'music',
      );

      this.cachedMusicCategoryId = musicCategory ? musicCategory.id : '10';
      await this.keyManager.recordQuotaUsage(ApiEndpoint.VIDEO_CATEGORIES_LIST, 1, keyId);
      return this.cachedMusicCategoryId;
    } catch (error: any) {
      this.logger.warn(`Failed to fetch video categories: ${error.message}. Defaulting to category ID '10'.`);
      this.cachedMusicCategoryId = '10';
      return '10';
    }
  }

  /**
   * Helper parsing ISO 8601 duration strings (e.g. "PT3M45S") into total seconds.
   */
  private parseIsoDurationSeconds(isoDuration: string | null): number | null {
    if (!isoDuration) return null;
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return null;
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Ensures parent Channel row exists in PostgreSQL to maintain Foreign Key integrity.
   */
  private async ensureChannelExists(channelId: string | null, channelTitle: string): Promise<string | null> {
    if (!channelId || channelId === 'Unknown') return null;
    try {
      const channel = await this.prisma.channel.upsert({
        where: { id: channelId },
        update: { title: channelTitle },
        create: { id: channelId, title: channelTitle },
      });
      return channel.id;
    } catch (err: any) {
      this.logger.warn(`Failed to upsert channel ${channelId}: ${err.message}`);
      return null;
    }
  }

  /**
   * Helper computing a normalized query string (lowercase, trimmed, collapsed whitespace, punctuation stripped)
   * to maximize cache hit rates across minor query variations.
   */
  private normalizeQuery(raw: string): string {
    if (!raw) return '';
    return raw
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  /**
   * Executes track search with a 3-tier caching & lookup strategy:
   * 1. Relational SearchQueryPage cache lookup (24h TTL)
   * 2. Local PostgreSQL Full-Text Search (FTS) lookup using `search_vector` GIN index
   * 3. YouTube Data API v3 fallback with dual-key rotation & quota logging
   *
   * @param query - Search string
   * @param pageToken - Optional YouTube API pagination page token
   * @returns Object containing tracks array, nextPageToken, and cache telemetry flags
   */
  async searchTracks(
    query: string,
    pageToken: string = '',
    dbOnly: boolean = false,
    clientId: string = 'unknown',
    res?: Response,
  ) {
    if (!query || !query.trim()) {
      throw new HttpException('Search query parameter is required', HttpStatus.BAD_REQUEST);
    }

    const normalizedQuery = this.normalizeQuery(query);
    const targetPageToken = pageToken.trim() || null;
    const FTS_MATCH_THRESHOLD = 3; // Lowered from 8 to 3 to maximize local PostgreSQL FTS cache hits & save YouTube API quota

    // STEP 1: Check Relational SearchQueryPage Database Cache (Exempt from rate limits)
    try {
      const pageTokenFilter = targetPageToken
        ? { pageToken: targetPageToken }
        : { OR: [{ pageToken: '' }, { pageToken: null }] };

      const cachedQuery = await this.prisma.searchQuery.findUnique({
        where: { normalizedQuery },
        include: {
          pages: {
            where: pageTokenFilter,
            include: {
              results: {
                orderBy: { rankPosition: 'asc' },
                include: { track: true },
              },
            },
          },
        },
      });

      if (
        cachedQuery &&
        cachedQuery.expiresAt &&
        cachedQuery.expiresAt > new Date() &&
        cachedQuery.pages.length > 0 &&
        cachedQuery.pages[0].results.length > 0
      ) {
        if (res) res.setHeader('X-Cache', 'HIT');
        const cachedPage = cachedQuery.pages[0];
        this.logger.log(`Cache HIT (Relational Page Cache) for query: "${query}" [pageToken: ${pageToken || 'initial'}]`);

        // Asynchronously increment hit counter
        await this.prisma.searchQuery.update({
          where: { id: cachedQuery.id },
          data: {
            hitCount: { increment: 1 },
            lastSearchedAt: new Date(),
          },
        });

        const tracks = cachedPage.results.map((res) => ({
          videoId: res.track.youtubeVideoId,
          title: res.track.title,
          thumbNail: getValidThumbnailUrl(res.track.thumbnailUrl || '') || '',
          channelTitle: res.track.artist || 'Unknown Artist',
        }));

        return {
          tracks,
          nextPageToken: cachedPage.nextPageToken,
          cached: true,
          source: 'page_cache',
          message: 'Loaded from search page cache',
        };
      }
    } catch (dbError: any) {
      this.logger.warn(`Relational page cache lookup error: ${dbError.message}. Proceeding to next search tier.`);
    }

    // STEP 2: Page 0 Local PostgreSQL Full-Text Search (FTS) Lookup (Exempt from rate limits)
    if (!targetPageToken && normalizedQuery) {
      try {
        const localMatches = await this.prisma.$queryRaw<Array<any>>`
          SELECT youtube_video_id AS "videoId",
                 title,
                 artist AS "channelTitle",
                 thumbnail_url AS "thumbNail",
                 ts_rank(search_vector, websearch_to_tsquery('english', ${normalizedQuery})) AS rank
          FROM tracks
          WHERE search_vector @@ websearch_to_tsquery('english', ${normalizedQuery})
          ORDER BY rank DESC
          LIMIT 15;
        `;

        if (localMatches && localMatches.length > 0 && (dbOnly || localMatches.length >= FTS_MATCH_THRESHOLD)) {
          if (res) res.setHeader('X-Cache', 'HIT');
          this.logger.log(
            `Cache HIT (Local PostgreSQL FTS) for query: "${query}" (${localMatches.length} local track matches, dbOnly=${dbOnly}). Skipping YouTube API.`,
          );

          const tracks = localMatches.map((t) => ({
            videoId: t.videoId,
            title: t.title,
            thumbNail: getValidThumbnailUrl(t.thumbNail || '') || '',
            channelTitle: t.channelTitle || 'Unknown Artist',
          }));

          if (tracks.length > 0) {
            // Asynchronously store search query and page mapping in Postgres
            this.cacheSearchResultsInPostgres(query, normalizedQuery, tracks, null, null).catch((err) =>
              this.logger.error(`Failed to store FTS results in Postgres cache: ${err.message}`),
            );
          }

          return {
            tracks,
            nextPageToken: null,
            cached: true,
            source: 'postgres_fts',
            message: dbOnly
              ? 'Showing local database matches. Press Enter for full YouTube search.'
              : 'Loaded from local database index',
          };
        }
      } catch (ftsErr: any) {
        this.logger.warn(`PostgreSQL FTS lookup failed: ${ftsErr.message}. Proceeding to YouTube API fallback.`);
      }
    }

    // Guard: In dbOnly mode (during live user typing), DO NOT query YouTube API
    if (dbOnly) {
      if (res) res.setHeader('X-Cache', 'HIT-LOCAL');
      return {
        tracks: [],
        nextPageToken: null,
        cached: true,
        source: 'postgres_fts',
        message: 'No local database matches found. Press Enter to search YouTube.',
      };
    }

    // STEP 3: Cache MISS — Query YouTube Data API `/v3/search` Proxy
    if (res) res.setHeader('X-Cache', 'MISS');

    // Enforce multi-tier sliding-window rate limiting (3 live searches/min, 20 live searches/day)
    this.rateLimiter.checkAndConsume(clientId, res);

    this.logger.log(`Cache MISS for search query: "${query}" [pageToken: ${pageToken || 'initial'}]. Calling YouTube API...`);
    const musicCategoryId = await this.getMusicCategoryId();
    const { key, keyId } = await this.getActiveKey();

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
      query,
    )}&maxResults=50&videoCategoryId=${musicCategoryId}&key=${key}&pageToken=${pageToken}`;

    try {
      const response = await axios.get(searchUrl);
      await this.keyManager.recordQuotaUsage(ApiEndpoint.SEARCH_LIST, 100, keyId);

      const items = response.data.items || [];
      const seenVideoIds = new Set<string>();

      const tracks = items
        .filter((item: any) => item.id?.videoId && !seenVideoIds.has(item.id.videoId))
        .map((item: any) => {
          seenVideoIds.add(item.id.videoId);
          return {
            videoId: item.id.videoId as string,
            title: item.snippet.title as string,
            thumbNail: (item.snippet.thumbnails?.default?.url ||
              item.snippet.thumbnails?.high?.url ||
              '') as string,
            channelTitle: (item.snippet.channelTitle || 'Unknown Artist') as string,
            channelId: (item.snippet.channelId || '') as string,
            publishedAt: item.snippet.publishedAt ? new Date(item.snippet.publishedAt) : null,
            description: (item.snippet.description || null) as string | null,
          };
        });

      const nextPageToken = response.data.nextPageToken || null;

      // Asynchronously cache search page results and tracks in PostgreSQL
      if (tracks.length > 0) {
        this.cacheSearchResultsInPostgres(query, normalizedQuery, tracks, targetPageToken, nextPageToken).catch((err) =>
          this.logger.error(`Failed to store search results in Postgres cache: ${err.message}`),
        );
      }

      return {
        tracks: tracks.map((t) => ({
          videoId: t.videoId,
          title: t.title,
          thumbNail: getValidThumbnailUrl(t.thumbNail) || '',
          channelTitle: t.channelTitle,
        })),
        nextPageToken,
        cached: false,
        source: 'youtube_api',
      };
    } catch (error: any) {
      this.logger.error(`Error fetching YouTube search results: ${error.message}`);
      throw new HttpException('Failed to fetch search results from YouTube API', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Retrieves detailed track metadata (duration, genre tags, channel, statistics) by YouTube video ID.
   *
   * @param videoId - Natural YouTube video ID
   * @param forceRefresh - If true, bypasses local PostgreSQL cache to enrich missing fields
   * @returns Comprehensive track details object
   */
  async getTrackDetails(videoId: string, forceRefresh: boolean = false) {
    if (!videoId) {
      throw new HttpException('Video ID parameter is required', HttpStatus.BAD_REQUEST);
    }

    // STEP 1: Check PostgreSQL `Tracks` table (skipped if forceRefresh is true)
    if (!forceRefresh) {
      try {
        const existingTrack = await this.prisma.tracks.findUnique({
          where: { youtubeVideoId: videoId },
        });

        // When not forcing refresh, any existing record with duration is considered a cache HIT
        if (existingTrack && existingTrack.duration) {
          this.logger.log(`Cache HIT for track details: ${videoId}`);
          return {
            videoId: existingTrack.youtubeVideoId,
            title: existingTrack.title,
            rawTitle: existingTrack.rawTitle || existingTrack.title,
            artistName: existingTrack.artistName || existingTrack.artist || 'Unknown Artist',
            thumbNail: getValidThumbnailUrl(existingTrack.thumbnailUrl || '') || '',
            channelTitle: existingTrack.artist || 'Unknown Artist',
            duration: existingTrack.duration,
            durationSeconds: existingTrack.durationSeconds,
            genre: existingTrack.genre || [],
            tags: existingTrack.tags || [],
            channelId: existingTrack.channelId || 'Unknown',
            viewCount: existingTrack.viewCount ? existingTrack.viewCount.toString() : null,
            likeCount: existingTrack.likeCount ? existingTrack.likeCount.toString() : null,
            publishedAt: existingTrack.publishedAt,
            description: existingTrack.description,
            categoryId: existingTrack.categoryId,
            licensedContent: existingTrack.licensedContent,
            isEmbeddable: existingTrack.isEmbeddable,
          };
        }
      } catch (dbErr: any) {
        this.logger.warn(`DB lookup failed for track ${videoId}: ${dbErr.message}`);
      }
    }

    // STEP 2: Cache MISS or forceRefresh — Query YouTube API `/v3/videos` with snippet, contentDetails, statistics, status
    const { key, keyId } = await this.getActiveKey();
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${videoId}&key=${key}`;

    try {
      const response = await axios.get(url);
      await this.keyManager.recordQuotaUsage(ApiEndpoint.VIDEOS_LIST, 1, keyId);

      const items = response.data.items || [];
      if (!items.length) {
        throw new HttpException(`Track with videoId '${videoId}' not found on YouTube`, HttpStatus.NOT_FOUND);
      }

      const trackItem = items[0];
      const rawDuration = trackItem.contentDetails?.duration || 'PT0S';
      const durationSeconds = this.parseIsoDurationSeconds(rawDuration);
      const viewCount = trackItem.statistics?.viewCount ? BigInt(trackItem.statistics.viewCount) : null;
      const likeCount = trackItem.statistics?.likeCount ? BigInt(trackItem.statistics.likeCount) : null;
      const publishedAt = trackItem.snippet?.publishedAt ? new Date(trackItem.snippet.publishedAt) : null;
      const description = trackItem.snippet?.description || null;
      const categoryId = trackItem.snippet?.categoryId || null;
      const licensedContent = Boolean(trackItem.contentDetails?.licensedContent);
      const isEmbeddable = trackItem.status?.embeddable !== false;
      const rawTitle = trackItem.snippet?.title || 'Unknown Title';
      const channelTitle = trackItem.snippet?.channelTitle || 'Unknown Artist';
      const parsed = parseTrackTitle(rawTitle, channelTitle);
      const tags = trackItem.snippet?.tags || [];

      const trackPayload = {
        videoId: trackItem.id,
        title: parsed.cleanTitle || rawTitle,
        rawTitle,
        artistName: parsed.artistName,
        thumbNail: getValidThumbnailUrl(trackItem.snippet?.thumbnails?.high?.url || trackItem.snippet?.thumbnails?.medium?.url || trackItem.snippet?.thumbnails?.default?.url || '') || '',
        channelTitle,
        duration: rawDuration,
        durationSeconds,
        genre: tags,
        tags,
        channelId: trackItem.snippet?.channelId || 'Unknown',
        viewCount,
        likeCount,
        publishedAt,
        description,
        categoryId,
        licensedContent,
        isEmbeddable,
      };

      // Asynchronously store full track details in PostgreSQL
      this.upsertTrackInPostgres(trackPayload).catch((err) =>
        this.logger.error(`Failed to upsert track ${videoId}: ${err.message}`),
      );

      return {
        ...trackPayload,
        viewCount: viewCount ? viewCount.toString() : null,
        likeCount: likeCount ? likeCount.toString() : null,
      };
    } catch (error: any) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error fetching track details for ${videoId}: ${error.message}`);
      throw new HttpException('Failed to fetch track details', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Telemetry helper logging YouTube API quota units consumed per date & endpoint into PostgreSQL.
   */
  private async recordQuotaUsage(endpoint: ApiEndpoint, units: number, keyId: 'A' | 'B' = 'A') {
    await this.keyManager.recordQuotaUsage(endpoint, units, keyId);
  }

  /**
   * Helper saving search query, track results, rank positions, and page tokens into PostgreSQL database.
   * Supports differentiated TTL: 24 hours for USER_SEARCH vs 21 days for CURATED_KEYWORD.
   */
  private async cacheSearchResultsInPostgres(
    rawQuery: string,
    normalizedQuery: string,
    tracks: Array<{
      videoId: string;
      title: string;
      thumbNail: string;
      channelTitle: string;
      channelId?: string;
      publishedAt?: Date | null;
      description?: string | null;
    }>,
    pageToken: string | null = null,
    nextPageToken: string | null = null,
    queryType: QueryType = QueryType.USER_SEARCH,
    pageIndex: number = 0,
  ) {
    // Configurable TTL for CURATED_KEYWORD (default: 7 days) vs 24-hour TTL for USER_SEARCH
    const ttlHours = queryType === QueryType.CURATED_KEYWORD ? CURATED_CATEGORY_CACHE_TTL_DAYS * 24 : 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    // 1. Upsert SearchQuery root record
    const searchQuery = await this.prisma.searchQuery.upsert({
      where: { normalizedQuery },
      update: {
        rawQuery,
        queryType,
        lastYoutubeFetchAt: new Date(),
        lastSearchedAt: new Date(),
        expiresAt,
        resultCount: tracks.length,
      },
      create: {
        normalizedQuery,
        rawQuery,
        queryType,
        lastYoutubeFetchAt: new Date(),
        expiresAt,
        resultCount: tracks.length,
      },
    });

    // 2. Upsert SearchQueryPage relational page record
    const safePageToken = pageToken || '';
    const searchQueryPage = await this.prisma.searchQueryPage.upsert({
      where: {
        queryId_pageToken: {
          queryId: searchQuery.id,
          pageToken: safePageToken,
        },
      },
      update: {
        nextPageToken,
        pageIndex,
      },
      create: {
        queryId: searchQuery.id,
        pageToken: safePageToken,
        nextPageToken,
        pageIndex,
      },
    });

    // 3. Upsert individual Tracks rows, SearchQueryPageResult junction records, and QueryTrackResult records
    for (let index = 0; index < tracks.length; index++) {
      const t = tracks[index];
      const validChannelId = await this.ensureChannelExists(t.channelId || null, t.channelTitle);
      const overallRank = pageIndex * 50 + index + 1;
      const parsed = parseTrackTitle(t.title, t.channelTitle);

      await this.prisma.tracks.upsert({
        where: { youtubeVideoId: t.videoId },
        update: {
          title: parsed.cleanTitle || t.title,
          artist: t.channelTitle,
          artistName: parsed.artistName,
          rawTitle: parsed.rawTitle,
          thumbnailUrl: t.thumbNail,
          channelId: validChannelId,
          lastFetchedAt: new Date(),
          ...(t.publishedAt ? { publishedAt: t.publishedAt } : {}),
          ...(t.description !== undefined && t.description !== null ? { description: t.description } : {}),
        },
        create: {
          youtubeVideoId: t.videoId,
          title: parsed.cleanTitle || t.title,
          artist: t.channelTitle,
          artistName: parsed.artistName,
          rawTitle: parsed.rawTitle,
          thumbnailUrl: t.thumbNail,
          channelId: validChannelId,
          publishedAt: t.publishedAt || null,
          description: t.description || null,
        },
      });

      await this.prisma.searchQueryPageResult.upsert({
        where: {
          pageId_trackId: {
            pageId: searchQueryPage.id,
            trackId: t.videoId,
          },
        },
        update: {
          rankPosition: index + 1,
        },
        create: {
          pageId: searchQueryPage.id,
          trackId: t.videoId,
          rankPosition: index + 1,
        },
      });

      await this.prisma.queryTrackResult.upsert({
        where: {
          queryId_trackId: {
            queryId: searchQuery.id,
            trackId: t.videoId,
          },
        },
        update: {
          rankPosition: overallRank,
        },
        create: {
          queryId: searchQuery.id,
          trackId: t.videoId,
          rankPosition: overallRank,
        },
      });
    }
  }

  /**
   * Ingests a single page of YouTube search results for a query and stores it in PostgreSQL.
   * Writes to Tracks, SearchQueryPage, SearchQueryPageResult, and QueryTrackResult tables.
   *
   * @param rawQuery - Unmodified search string
   * @param normalizedQuery - Normalized search string for indexing
   * @param pageToken - Optional YouTube page token (null/undefined for page 0)
   * @param pageIndex - 0-indexed page number (0, 1, 2...)
   * @param maxResults - Number of results to fetch per page (default: 50)
   * @param queryType - QueryType enum (default: USER_SEARCH)
   * @returns Object containing newTracksStored count and nextPageToken string or null
   */
  async fetchAndStoreSearchPage(
    rawQuery: string,
    normalizedQuery: string,
    pageToken: string | null = null,
    pageIndex: number = 0,
    maxResults: number = 50,
    queryType: QueryType = QueryType.USER_SEARCH,
  ): Promise<{ newTracksStored: number; nextPageToken: string | null }> {
    const musicCategoryId = await this.getMusicCategoryId();
    const { key, keyId } = await this.getActiveKey();

    const pageTokenParam = pageToken ? `&pageToken=${pageToken}` : '';
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
      rawQuery,
    )}&maxResults=${maxResults}&videoCategoryId=${musicCategoryId}&key=${key}${pageTokenParam}`;

    try {
      const response = await axios.get(searchUrl);
      await this.keyManager.recordQuotaUsage(ApiEndpoint.SEARCH_LIST, 100, keyId);

      const items = response.data.items || [];
      const seenVideoIds = new Set<string>();

      const tracks = items
        .filter((item: any) => item.id?.videoId && !seenVideoIds.has(item.id.videoId))
        .map((item: any) => {
          seenVideoIds.add(item.id.videoId);
          return {
            videoId: item.id.videoId as string,
            title: item.snippet.title as string,
            thumbNail: (item.snippet.thumbnails?.default?.url ||
              item.snippet.thumbnails?.high?.url ||
              '') as string,
            channelTitle: (item.snippet.channelTitle || 'Unknown Artist') as string,
            channelId: (item.snippet.channelId || '') as string,
            publishedAt: item.snippet.publishedAt ? new Date(item.snippet.publishedAt) : null,
            description: (item.snippet.description || null) as string | null,
          };
        });

      const nextPageToken = response.data.nextPageToken || null;

      if (tracks.length > 0) {
        await this.cacheSearchResultsInPostgres(
          rawQuery,
          normalizedQuery,
          tracks,
          pageToken,
          nextPageToken,
          queryType,
          pageIndex,
        );
      }

      return {
        newTracksStored: tracks.length,
        nextPageToken,
      };
    } catch (error: any) {
      this.logger.error(`Error fetching search page from YouTube API for query "${rawQuery}": ${error.message}`);
      throw new HttpException('Failed to fetch search results page from YouTube API', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Ensures a curated category keyword is backfilled in PostgreSQL up to `targetCount` tracks
   * without re-spending quota on already-ingested pages.
   *
   * WHAT:
   * Serves category tracks from PostgreSQL when fresh and populated, or incrementally ingests up to
   * `maxPages` from YouTube starting from the last saved page token (`nextPageToken`).
   *
   * WHY:
   * 1. Explore categories must be deep (~50 tracks) to support scrolling without running out of items.
   * 2. Curated categories get a 21-day TTL (`CURATED_KEYWORD`) because evergreen genres like "Lofi"
   *    or "Pop Hits" do not go stale in 24 hours.
   * 3. Resuming from `SearchQueryPage.nextPageToken` prevents re-spending API quota on page 0.
   * 4. Hard ceiling `maxPages` (default 3) prevents unbounded quota loops for niche keywords.
   *
   * HOW:
   * - Queries `QueryTrackResult` count & `SearchQuery.expiresAt`.
   * - If cached count >= targetCount and expiresAt > now, returns cached data immediately (0 quota units).
   * - Else inspects `SearchQueryPage` for the highest `pageIndex` with a `nextPageToken`.
   * - Iteratively calls `fetchAndStoreSearchPage` until target count is hit or maxPages is reached.
   * - Updates `SearchQuery.expiresAt` to 21 days from now and `queryType` to `CURATED_KEYWORD`.
   *
   * @param keyword - Curated category search term (e.g. "lofi music")
   * @param targetCount - Target number of tracks (default: 50)
   * @param maxPages - Max page requests ceiling (default: 3)
   * @returns Object containing trackCount and fromCache boolean
   */
  async ensureCategoryPopulated(
    keyword: string,
    targetCount: number = 50,
    maxPages: number = 3,
  ): Promise<{ trackCount: number; fromCache: boolean }> {
    if (!keyword || !keyword.trim()) {
      throw new HttpException('Keyword parameter is required for category population', HttpStatus.BAD_REQUEST);
    }

    const normalizedQuery = this.normalizeQuery(keyword);

    // 1. Check existing DB query record and result count
    const existingQuery = await this.prisma.searchQuery.findUnique({
      where: { normalizedQuery },
    });

    const existingCount = existingQuery
      ? await this.prisma.queryTrackResult.count({
          where: { queryId: existingQuery.id },
        })
      : 0;

    const isFresh = existingQuery?.expiresAt && existingQuery.expiresAt > new Date();

    if (existingCount >= targetCount && isFresh) {
      this.logger.log(
        `Category Cache HIT: "${keyword}" already has ${existingCount} fresh tracks (TTL valid until ${existingQuery.expiresAt?.toISOString()}).`,
      );
      return { trackCount: existingCount, fromCache: true };
    }

    this.logger.log(
      `Category Cache MISS/THIN: "${keyword}" has ${existingCount}/${targetCount} tracks (isFresh=${!!isFresh}). Ingesting from YouTube...`,
    );

    // 2. Determine resume starting pageIndex and pageToken
    let pageIndex = 0;
    let pageToken: string | null = null;
    let totalStored = existingCount;

    if (existingQuery) {
      const lastPage = await this.prisma.searchQueryPage.findFirst({
        where: { queryId: existingQuery.id },
        orderBy: { pageIndex: 'desc' },
      });

      if (lastPage?.nextPageToken) {
        pageToken = lastPage.nextPageToken;
        pageIndex = lastPage.pageIndex + 1;
        this.logger.log(
          `Resuming category ingestion for "${keyword}" from pageIndex ${pageIndex} [pageToken: ${pageToken}]`,
        );
      }
    }

    // 3. Fetch pages up to targetCount or maxPages ceiling
    let pagesFetched = 0;
    while (totalStored < targetCount && pagesFetched < maxPages) {
      const pageResult = await this.fetchAndStoreSearchPage(
        keyword,
        normalizedQuery,
        pageToken,
        pageIndex,
        50,
        QueryType.CURATED_KEYWORD,
      );

      totalStored += pageResult.newTracksStored;
      pageToken = pageResult.nextPageToken;
      pageIndex++;
      pagesFetched++;

      if (!pageToken) {
        this.logger.log(`No further pageToken available from YouTube for keyword "${keyword}". Stopping iteration.`);
        break;
      }
    }

    // 4. Update SearchQuery record with differentiated TTL:
    // - 15 days for default curated categories
    // - 7 days for user songs / dynamic category searches
    const isDefaultCurated = CURATED_GENRES.some(
      (g) => g.toLowerCase().trim() === keyword.toLowerCase().trim(),
    );
    const ttlDays = isDefaultCurated ? CURATED_DEFAULT_CACHE_TTL_DAYS : USER_CATEGORY_CACHE_TTL_DAYS;
    const categoryTtlMs = ttlDays * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + categoryTtlMs);

    await this.prisma.searchQuery.update({
      where: { normalizedQuery },
      data: {
        queryType: QueryType.CURATED_KEYWORD,
        expiresAt,
        resultCount: totalStored,
        lastYoutubeFetchAt: new Date(),
      },
    });

    this.logger.log(
      `Successfully populated category "${keyword}" (${isDefaultCurated ? 'Default Curated' : 'User/Dynamic'}): ${totalStored} tracks stored across ${pagesFetched} page fetch(es). ${ttlDays}-day TTL set to ${expiresAt.toISOString()}`,
    );

    return { trackCount: totalStored, fromCache: false };
  }

  /**
   * Helper upserting full metadata details for a single track into PostgreSQL `Tracks` table.
   * Persists all rich metadata signals including view/like counts, tags, publishedAt, descriptions,
   * licensing status, and heuristic title/artist breakdown.
   */
  private async upsertTrackInPostgres(track: {
    videoId: string;
    title: string;
    rawTitle?: string | null;
    artistName?: string | null;
    thumbNail: string;
    channelTitle: string;
    duration?: string | null;
    durationSeconds?: number | null;
    genre?: string[];
    tags?: string[];
    channelId?: string | null;
    viewCount?: bigint | null;
    likeCount?: bigint | null;
    publishedAt?: Date | null;
    description?: string | null;
    categoryId?: string | null;
    licensedContent?: boolean;
    isEmbeddable?: boolean;
  }) {
    const validChannelId = await this.ensureChannelExists(track.channelId || null, track.channelTitle);
    const parsed =
      track.rawTitle && track.artistName
        ? { rawTitle: track.rawTitle, cleanTitle: track.title, artistName: track.artistName }
        : parseTrackTitle(track.rawTitle || track.title, track.channelTitle);

    const tags = track.tags || track.genre || [];
    const genre = track.genre || tags;

    await this.prisma.tracks.upsert({
      where: { youtubeVideoId: track.videoId },
      update: {
        title: parsed.cleanTitle || track.title,
        rawTitle: parsed.rawTitle,
        artistName: parsed.artistName,
        artist: track.channelTitle,
        thumbnailUrl: track.thumbNail,
        duration: track.duration,
        durationSeconds: track.durationSeconds,
        genre,
        tags,
        channelId: validChannelId,
        lastFetchedAt: new Date(),
        ...(track.viewCount !== undefined ? { viewCount: track.viewCount } : {}),
        ...(track.likeCount !== undefined ? { likeCount: track.likeCount } : {}),
        ...(track.publishedAt !== undefined ? { publishedAt: track.publishedAt } : {}),
        ...(track.description !== undefined ? { description: track.description } : {}),
        ...(track.categoryId !== undefined ? { categoryId: track.categoryId } : {}),
        ...(track.licensedContent !== undefined ? { licensedContent: track.licensedContent } : {}),
        ...(track.isEmbeddable !== undefined ? { isEmbeddable: track.isEmbeddable } : {}),
      },
      create: {
        youtubeVideoId: track.videoId,
        title: parsed.cleanTitle || track.title,
        rawTitle: parsed.rawTitle,
        artistName: parsed.artistName,
        artist: track.channelTitle,
        thumbnailUrl: track.thumbNail,
        duration: track.duration || null,
        durationSeconds: track.durationSeconds || null,
        genre,
        tags,
        channelId: validChannelId,
        viewCount: track.viewCount || null,
        likeCount: track.likeCount || null,
        publishedAt: track.publishedAt || null,
        description: track.description || null,
        categoryId: track.categoryId || null,
        licensedContent: track.licensedContent ?? false,
        isEmbeddable: track.isEmbeddable ?? true,
      },
    });
  }

  /**
   * Refreshes metadata for tracks fetched > 30 days ago to comply with YouTube API Services ToS Section III.E.4.
   * Batch processes up to 50 tracks in a single YouTube `videos.list` request (costing only 1 quota unit).
   * Soft-deletes tracks that are removed, made private, non-embeddable, or no longer exist on YouTube.
   *
   * @param limit - Maximum tracks to process in this maintenance run (default: 50)
   * @returns Telemetry summary of processed, refreshed, and soft-deleted track counts
   */
  async batchRefreshStaleTracks(limit: number = 50): Promise<{
    processed: number;
    refreshed: number;
    softDeleted: number;
    hasMore: boolean;
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Query oldest stale tracks that are currently marked as available
    const staleTracks = await this.prisma.tracks.findMany({
      where: {
        lastFetchedAt: { lt: thirtyDaysAgo },
        isAvailable: true,
      },
      orderBy: { lastFetchedAt: 'asc' },
      take: Math.min(limit, 50),
      select: { youtubeVideoId: true },
    });

    if (staleTracks.length === 0) {
      this.logger.log('YouTube ToS Stale Track Refresh: 0 tracks require refresh (all tracks within 30-day TTL).');
      return { processed: 0, refreshed: 0, softDeleted: 0, hasMore: false };
    }

    const videoIds = staleTracks.map((t) => t.youtubeVideoId);
    const idList = videoIds.join(',');

    this.logger.log(
      `YouTube ToS Stale Track Refresh: Processing batch of ${videoIds.length} tracks fetched > 30 days ago...`,
    );

    // 2. Fetch live metadata from YouTube videos.list in a single API call (1 quota unit)
    const { key, keyId } = await this.getActiveKey();
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${idList}&key=${key}`;

    try {
      const response = await axios.get(url);
      await this.keyManager.recordQuotaUsage(ApiEndpoint.VIDEOS_LIST, 1, keyId);

      const items = response.data.items || [];
      const foundVideoIds = new Set<string>();
      let refreshedCount = 0;
      let softDeletedCount = 0;

      for (const item of items) {
        const videoId = item.id;
        foundVideoIds.add(videoId);

        const isEmbeddable = item.status?.embeddable !== false;
        const isPublic = item.status?.privacyStatus === 'public';
        const isPlayable = isEmbeddable && isPublic;

        if (!isPlayable) {
          // Soft-delete if video became private, unlisted, or disabled embedding
          await this.prisma.tracks.update({
            where: { youtubeVideoId: videoId },
            data: {
              isAvailable: false,
              isEmbeddable: false,
              lastFetchedAt: new Date(),
            },
          });
          softDeletedCount++;
          continue;
        }

        const rawDuration = item.contentDetails?.duration || null;
        const durationSeconds = this.parseIsoDurationSeconds(rawDuration);
        const validChannelId = await this.ensureChannelExists(
          item.snippet?.channelId || null,
          item.snippet?.channelTitle || 'Unknown Artist',
        );

        await this.prisma.tracks.update({
          where: { youtubeVideoId: videoId },
          data: {
            title: item.snippet?.title || 'Unknown Title',
            artist: item.snippet?.channelTitle || 'Unknown Artist',
            thumbnailUrl:
              item.snippet?.thumbnails?.high?.url ||
              item.snippet?.thumbnails?.medium?.url ||
              item.snippet?.thumbnails?.default?.url ||
              '',
            duration: rawDuration,
            durationSeconds,
            channelId: validChannelId,
            tags: item.snippet?.tags || [],
            isAvailable: true,
            isEmbeddable: true,
            lastFetchedAt: new Date(),
          },
        });
        refreshedCount++;
      }

      // 3. Mark any requested video ID omitted from YouTube's response as deleted/unavailable
      const missingVideoIds = videoIds.filter((id) => !foundVideoIds.has(id));
      if (missingVideoIds.length > 0) {
        await this.prisma.tracks.updateMany({
          where: {
            youtubeVideoId: { in: missingVideoIds },
          },
          data: {
            isAvailable: false,
            lastFetchedAt: new Date(),
          },
        });
        softDeletedCount += missingVideoIds.length;
        this.logger.log(
          `Soft-deleted ${missingVideoIds.length} tracks no longer returned by YouTube: ${missingVideoIds.join(', ')}`,
        );
      }

      const totalStaleRemaining = await this.prisma.tracks.count({
        where: {
          lastFetchedAt: { lt: thirtyDaysAgo },
          isAvailable: true,
        },
      });

      this.logger.log(
        `YouTube ToS Stale Track Refresh completed: ${refreshedCount} updated, ${softDeletedCount} soft-deleted, ${totalStaleRemaining} remaining.`,
      );

      return {
        processed: videoIds.length,
        refreshed: refreshedCount,
        softDeleted: softDeletedCount,
        hasMore: totalStaleRemaining > 0,
      };
    } catch (err: any) {
      this.logger.error(`YouTube ToS Stale Track Refresh failed: ${err.message}`);
      throw new HttpException('Failed to refresh stale tracks batch from YouTube API', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
