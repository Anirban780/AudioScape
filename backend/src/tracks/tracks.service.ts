import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { ApiEndpoint, QueryType } from '@prisma/client';
import { YouTubeKeyManager } from './youtube-key-manager';

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
 * and tracks daily API quota usage across dual key pools via YouTubeKeyManager.
 * ============================================================================
 */
@Injectable()
export class TracksService {
  private readonly logger = new Logger(TracksService.name);
  private cachedMusicCategoryId: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly keyManager: YouTubeKeyManager,
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
  async searchTracks(query: string, pageToken: string = '', dbOnly: boolean = false) {
    if (!query || !query.trim()) {
      throw new HttpException('Search query parameter is required', HttpStatus.BAD_REQUEST);
    }

    const normalizedQuery = this.normalizeQuery(query);
    const targetPageToken = pageToken.trim() || null;
    const FTS_MATCH_THRESHOLD = 3; // Lowered from 8 to 3 to maximize local PostgreSQL FTS cache hits & save YouTube API quota

    // STEP 1: Check Relational SearchQueryPage Database Cache
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
          thumbNail: res.track.thumbnailUrl || '',
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

    // STEP 2: Page 0 Local PostgreSQL Full-Text Search (FTS) Lookup
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

        if (localMatches && (dbOnly || localMatches.length >= FTS_MATCH_THRESHOLD)) {
          this.logger.log(
            `Cache HIT (Local PostgreSQL FTS) for query: "${query}" (${localMatches.length} local track matches, dbOnly=${dbOnly}). Skipping YouTube API.`,
          );

          const tracks = localMatches.map((t) => ({
            videoId: t.videoId,
            title: t.title,
            thumbNail: t.thumbNail || '',
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
      return {
        tracks: [],
        nextPageToken: null,
        cached: true,
        source: 'postgres_fts',
        message: 'No local database matches found. Press Enter to search YouTube.',
      };
    }

    // STEP 3: Cache MISS — Query YouTube Data API `/v3/search` Proxy
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
          thumbNail: t.thumbNail,
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
   * Retrieves detailed track metadata (duration, genre tags, channel) by YouTube video ID.
   */
  async getTrackDetails(videoId: string) {
    if (!videoId) {
      throw new HttpException('Video ID parameter is required', HttpStatus.BAD_REQUEST);
    }

    // STEP 1: Check PostgreSQL `Tracks` table
    try {
      const existingTrack = await this.prisma.tracks.findUnique({
        where: { youtubeVideoId: videoId },
      });

      if (existingTrack && existingTrack.duration) {
        this.logger.log(`Cache HIT for track details: ${videoId}`);
        return {
          videoId: existingTrack.youtubeVideoId,
          title: existingTrack.title,
          thumbNail: existingTrack.thumbnailUrl || '',
          channelTitle: existingTrack.artist || 'Unknown Artist',
          duration: existingTrack.duration,
          durationSeconds: existingTrack.durationSeconds,
          genre: existingTrack.genre || [],
          channelId: existingTrack.channelId || 'Unknown',
        };
      }
    } catch (dbErr: any) {
      this.logger.warn(`DB lookup failed for track ${videoId}: ${dbErr.message}`);
    }

    // STEP 2: Cache MISS — Query YouTube API `/v3/videos`
    const { key, keyId } = await this.getActiveKey();
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${key}`;

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

      const result = {
        videoId: trackItem.id,
        title: trackItem.snippet?.title || 'Unknown Title',
        thumbNail: trackItem.snippet?.thumbnails?.high?.url || trackItem.snippet?.thumbnails?.medium?.url || trackItem.snippet?.thumbnails?.default?.url || '',
        channelTitle: trackItem.snippet?.channelTitle || 'Unknown Artist',
        duration: rawDuration,
        durationSeconds,
        genre: trackItem.snippet?.tags || [],
        channelId: trackItem.snippet?.channelId || 'Unknown',
      };

      // Asynchronously store full track details in PostgreSQL
      this.upsertTrackInPostgres(result).catch((err) =>
        this.logger.error(`Failed to upsert track ${videoId}: ${err.message}`),
      );

      return result;
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
    tracks: Array<{ videoId: string; title: string; thumbNail: string; channelTitle: string; channelId?: string }>,
    pageToken: string | null = null,
    nextPageToken: string | null = null,
    queryType: QueryType = QueryType.USER_SEARCH,
    pageIndex: number = 0,
  ) {
    // 21-day TTL for CURATED_KEYWORD vs 24-hour TTL for USER_SEARCH
    const ttlHours = queryType === QueryType.CURATED_KEYWORD ? 21 * 24 : 24;
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

      await this.prisma.tracks.upsert({
        where: { youtubeVideoId: t.videoId },
        update: {
          title: t.title,
          artist: t.channelTitle,
          thumbnailUrl: t.thumbNail,
          channelId: validChannelId,
          lastFetchedAt: new Date(),
        },
        create: {
          youtubeVideoId: t.videoId,
          title: t.title,
          artist: t.channelTitle,
          thumbnailUrl: t.thumbNail,
          channelId: validChannelId,
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

    // 4. Update SearchQuery record with 21-day TTL and CURATED_KEYWORD queryType
    const TTL_21_DAYS_MS = 21 * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + TTL_21_DAYS_MS);

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
      `Successfully populated category "${keyword}": ${totalStored} tracks stored across ${pagesFetched} page fetch(es). 21-day TTL set to ${expiresAt.toISOString()}`,
    );

    return { trackCount: totalStored, fromCache: false };
  }

  /**
   * Helper upserting full metadata details for a single track into PostgreSQL `Tracks` table.
   */
  private async upsertTrackInPostgres(track: {
    videoId: string;
    title: string;
    thumbNail: string;
    channelTitle: string;
    duration: string;
    durationSeconds: number | null;
    genre: string[];
    channelId: string;
  }) {
    const validChannelId = await this.ensureChannelExists(track.channelId, track.channelTitle);

    await this.prisma.tracks.upsert({
      where: { youtubeVideoId: track.videoId },
      update: {
        title: track.title,
        artist: track.channelTitle,
        thumbnailUrl: track.thumbNail,
        duration: track.duration,
        durationSeconds: track.durationSeconds,
        genre: track.genre,
        tags: track.genre,
        channelId: validChannelId,
        lastFetchedAt: new Date(),
      },
      create: {
        youtubeVideoId: track.videoId,
        title: track.title,
        artist: track.channelTitle,
        thumbnailUrl: track.thumbNail,
        duration: track.duration,
        durationSeconds: track.durationSeconds,
        genre: track.genre,
        tags: track.genre,
        channelId: validChannelId,
      },
    });
  }
}
