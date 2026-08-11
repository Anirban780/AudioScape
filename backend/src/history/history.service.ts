import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TracksService } from '../tracks/tracks.service';
import { RecordListenDto } from './dto/record-listen.dto';
import { ToggleLikeDto } from './dto/toggle-like.dto';
import { GetHistoryQueryDto } from './dto/get-history-query.dto';
import { PlaybackSource } from '@prisma/client';
import { getValidThumbnailUrl } from '../utils/youtubeUtils';

/**
 * ============================================================================
 * SERVICE: USER LISTEN HISTORY & FAVORITES BUSINESS LOGIC
 * ============================================================================
 * @module ListenHistoryModule
 * 
 * PURPOSE:
 * Manages track listening history, play counter increments, playback attribution,
 * and user liked track favorites backed by PostgreSQL Prisma models.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Atomic Counter Increments: Uses Prisma atomic `{ increment: 1 }` to prevent race conditions
 *   when play events occur concurrently.
 * - Idempotent Track Upsert: Ensures `Tracks` table rows exist prior to creating foreign key references.
 * - Recommendation Data Pipeline: Logs play counts and timestamps that feed directly into the TF-IDF music recommendation engine.
 * ============================================================================
 */
import { RecommendationsService } from '../recommendations/recommendations.service';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tracksService: TracksService,
    private readonly recommendationsService: RecommendationsService,
  ) {}

  /**
   * Ensures target track row exists in `Tracks` table.
   * If missing, fetches track details from YouTube API via `TracksService` or provisions basic row.
   */
  private async ensureTrackExists(videoId: string, title?: string, artist?: string, thumbnailUrl?: string) {
    try {
      let track = await this.prisma.tracks.findUnique({
        where: { youtubeVideoId: videoId },
      });

      if (!track) {
        if (title) {
          // Provision basic track metadata provided by client
          track = await this.prisma.tracks.create({
            data: {
              youtubeVideoId: videoId,
              title,
              artist: artist || 'Unknown Artist',
              thumbnailUrl: thumbnailUrl || null,
            },
          });
        } else {
          // Fetch full track metadata from YouTube API
          await this.tracksService.getTrackDetails(videoId);
        }
      }
      return true;
    } catch (err: any) {
      this.logger.warn(`ensureTrackExists warning for video ${videoId}: ${err.message}`);
      return false;
    }
  }

  /**
   * Records or updates a track listening event for an authenticated user.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @param dto - RecordListenDto containing videoId, optional source, and optional metadata
   * @returns Updated ListenHistory record joined with track information
   */
  async recordTrackListen(userId: string, dto: RecordListenDto) {
    const { videoId, source, title, artist, thumbnailUrl } = dto;

    await this.ensureTrackExists(videoId, title, artist, thumbnailUrl);

    try {
      const now = new Date();
      const playbackSource = source || PlaybackSource.SEARCH;

      const historyRecord = await this.prisma.listenHistory.upsert({
        where: {
          userId_trackId: {
            userId,
            trackId: videoId,
          },
        },
        update: {
          playCount: { increment: 1 },
          lastPlayedAt: now,
          source: playbackSource,
        },
        create: {
          userId,
          trackId: videoId,
          playCount: 1,
          firstPlayedAt: now,
          lastPlayedAt: now,
          source: playbackSource,
        },
        include: {
          track: true,
        },
      });

      // Invalidate user in-memory recommendation cache on new track play
      this.recommendationsService.invalidateUserCache(userId);

      this.logger.log(` Recorded track play: user=${userId}, track=${videoId}, count=${historyRecord.playCount}`);
      return {
        message: 'Track listen logged successfully',
        history: historyRecord,
      };
    } catch (error: any) {
      this.logger.error(`Failed to record track listen for user ${userId}: ${error.message}`);
      throw new HttpException('Failed to log track listen event', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Retrieves paginated listen history for a user, sorted by last played timestamp descending.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @param query - GetHistoryQueryDto specifying page and limit
   * @returns Paginated history list with metadata
   */
  async getUserListenHistory(userId: string, query: GetHistoryQueryDto) {
    const limit = query.limit || 20;
    const page = query.page || 1;
    const skip = (page - 1) * limit;

    try {
      const [totalCount, items] = await Promise.all([
        this.prisma.listenHistory.count({ where: { userId } }),
        this.prisma.listenHistory.findMany({
          where: { userId },
          orderBy: { lastPlayedAt: 'desc' },
          skip,
          take: limit,
          include: {
            track: true,
          },
        }),
      ]);

      const sanitizedItems = items.map((item) => ({
        ...item,
        track: item.track
          ? {
              ...item.track,
              thumbnailUrl: getValidThumbnailUrl(item.track.thumbnailUrl) || null,
            }
          : item.track,
      }));

      return {
        data: sanitizedItems,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch listen history for user ${userId}: ${error.message}`);
      throw new HttpException('Failed to fetch listen history', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Toggles liked / favorite status for a track by user.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @param dto - ToggleLikeDto specifying videoId and boolean liked state
   * @returns Updated liked state
   */
  async toggleTrackLike(userId: string, dto: ToggleLikeDto) {
    const { videoId, liked } = dto;

    await this.ensureTrackExists(videoId);

    try {
      const now = new Date();
      const historyRecord = await this.prisma.listenHistory.upsert({
        where: {
          userId_trackId: {
            userId,
            trackId: videoId,
          },
        },
        update: {
          liked,
          likedAt: liked ? now : null,
        },
        create: {
          userId,
          trackId: videoId,
          liked,
          likedAt: liked ? now : null,
          playCount: 0,
        },
        include: {
          track: true,
        },
      });

      this.logger.log(` Toggled track like: user=${userId}, track=${videoId}, liked=${liked}`);
      const sanitizedTrack = historyRecord.track
        ? {
            ...historyRecord.track,
            thumbnailUrl: getValidThumbnailUrl(historyRecord.track.thumbnailUrl) || null,
          }
        : historyRecord.track;

      return {
        message: liked ? 'Track added to favorites' : 'Track removed from favorites',
        liked: historyRecord.liked,
        likedAt: historyRecord.likedAt,
        track: sanitizedTrack,
      };
    } catch (error: any) {
      this.logger.error(`Failed to toggle track like for user ${userId}: ${error.message}`);
      throw new HttpException('Failed to update favorite status', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Retrieves all liked tracks for a user sorted by liked timestamp descending.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @returns Array of liked track items
   */
  async getUserFavorites(userId: string) {
    try {
      const favorites = await this.prisma.listenHistory.findMany({
        where: {
          userId,
          liked: true,
        },
        orderBy: {
          likedAt: 'desc',
        },
        include: {
          track: true,
        },
      });

      const sanitizedFavorites = favorites.map((fav) => ({
        ...fav,
        track: fav.track
          ? {
              ...fav.track,
              thumbnailUrl: getValidThumbnailUrl(fav.track.thumbnailUrl) || null,
            }
          : fav.track,
      }));

      return {
        count: sanitizedFavorites.length,
        favorites: sanitizedFavorites,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch favorites for user ${userId}: ${error.message}`);
      throw new HttpException('Failed to fetch user favorites', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
