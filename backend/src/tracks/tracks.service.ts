import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { ApiEndpoint } from '@prisma/client';

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
 * and tracks daily API quota usage.
 * ============================================================================
 */
@Injectable()
export class TracksService {
  private readonly logger = new Logger(TracksService.name);
  private cachedMusicCategoryId: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper getter retrieving YouTube API Key from environment config.
   */
  private get apiKey(): string {
    const key = process.env.YOUTUBE_API_KEY;
    if (!key) {
      this.logger.error('YOUTUBE_API_KEY environment variable is not defined!');
    }
    return key || '';
  }

  /**
   * Dynamically fetches and caches the YouTube "Music" Category ID (typically "10").
   */
  async getMusicCategoryId(): Promise<string> {
    if (this.cachedMusicCategoryId) {
      return this.cachedMusicCategoryId;
    }

    try {
      const url = `https://www.googleapis.com/youtube/v3/videoCategories?part=snippet&regionCode=US&key=${this.apiKey}`;
      const response = await axios.get(url);
      const items = response.data.items || [];
      const musicCategory = items.find(
        (item: any) => item.snippet?.title?.toLowerCase() === 'music',
      );

      this.cachedMusicCategoryId = musicCategory ? musicCategory.id : '10';
      await this.recordQuotaUsage(ApiEndpoint.VIDEO_CATEGORIES_LIST, 1);
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
   * Executes track search with PostgreSQL cache-first strategy and YouTube API fallback.
   */
  async searchTracks(query: string, pageToken: string = '') {
    if (!query || !query.trim()) {
      throw new HttpException('Search query parameter is required', HttpStatus.BAD_REQUEST);
    }

    const normalizedQuery = query.toLowerCase().trim();

    // STEP 1: Check PostgreSQL Cache (Only for initial search page where pageToken is empty)
    if (!pageToken) {
      try {
        const cachedQuery = await this.prisma.searchQuery.findUnique({
          where: { normalizedQuery },
          include: {
            results: {
              orderBy: { rankPosition: 'asc' },
              include: { track: true },
            },
          },
        });

        if (
          cachedQuery &&
          cachedQuery.expiresAt &&
          cachedQuery.expiresAt > new Date() &&
          cachedQuery.results.length > 0
        ) {
          this.logger.log(`Cache HIT for search query: "${query}"`);

          // Asynchronously increment hit counter
          await this.prisma.searchQuery.update({
            where: { id: cachedQuery.id },
            data: {
              hitCount: { increment: 1 },
              lastSearchedAt: new Date(),
            },
          });

          const tracks = cachedQuery.results.map((res) => ({
            videoId: res.track.youtubeVideoId,
            title: res.track.title,
            thumbNail: res.track.thumbnailUrl || '',
            channelTitle: res.track.artist || 'Unknown Artist',
          }));

          return {
            tracks,
            nextPageToken: null,
            cached: true,
          };
        }
      } catch (dbError: any) {
        this.logger.warn(`Database cache check error: ${dbError.message}. Proceeding to YouTube API fetch.`);
      }
    }

    // STEP 2: Cache MISS — Query YouTube API `/v3/search`
    this.logger.log(`Cache MISS for search query: "${query}". Calling YouTube API...`);
    const musicCategoryId = await this.getMusicCategoryId();

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
      query,
    )}&maxResults=10&videoCategoryId=${musicCategoryId}&key=${this.apiKey}&pageToken=${pageToken}`;

    try {
      const response = await axios.get(searchUrl);
      await this.recordQuotaUsage(ApiEndpoint.SEARCH_LIST, 100);

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

      // STEP 3: Asynchronously cache search results and tracks in PostgreSQL
      if (!pageToken && tracks.length > 0) {
        this.cacheSearchResultsInPostgres(query, normalizedQuery, tracks).catch((err) =>
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
        nextPageToken: response.data.nextPageToken || null,
        cached: false,
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
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${this.apiKey}`;

    try {
      const response = await axios.get(url);
      await this.recordQuotaUsage(ApiEndpoint.VIDEOS_LIST, 1);

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
  private async recordQuotaUsage(endpoint: ApiEndpoint, units: number) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.apiQuotaUsage.upsert({
        where: {
          date_endpoint: {
            date: today,
            endpoint,
          },
        },
        update: {
          unitsConsumed: { increment: units },
          callCount: { increment: 1 },
        },
        create: {
          date: today,
          endpoint,
          unitsConsumed: units,
          callCount: 1,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record API quota usage: ${err.message}`);
    }
  }

  /**
   * Helper saving search query, track results, and rank positions into PostgreSQL database with 24h TTL.
   */
  private async cacheSearchResultsInPostgres(
    rawQuery: string,
    normalizedQuery: string,
    tracks: Array<{ videoId: string; title: string; thumbNail: string; channelTitle: string; channelId: string }>,
  ) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Upsert SearchQuery row
    const searchQuery = await this.prisma.searchQuery.upsert({
      where: { normalizedQuery },
      update: {
        rawQuery,
        lastYoutubeFetchAt: new Date(),
        lastSearchedAt: new Date(),
        expiresAt,
        resultCount: tracks.length,
      },
      create: {
        normalizedQuery,
        rawQuery,
        lastYoutubeFetchAt: new Date(),
        expiresAt,
        resultCount: tracks.length,
      },
    });

    // Upsert individual Tracks rows & QueryTrackResult junction records
    for (let index = 0; index < tracks.length; index++) {
      const t = tracks[index];
      const validChannelId = await this.ensureChannelExists(t.channelId, t.channelTitle);

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

      await this.prisma.queryTrackResult.upsert({
        where: {
          queryId_trackId: {
            queryId: searchQuery.id,
            trackId: t.videoId,
          },
        },
        update: {
          rankPosition: index + 1,
        },
        create: {
          queryId: searchQuery.id,
          trackId: t.videoId,
          rankPosition: index + 1,
        },
      });
    }
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
