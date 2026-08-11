import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TracksService } from '../tracks/tracks.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddPlaylistTrackDto } from './dto/add-playlist-track.dto';
import { ReorderTracksDto } from './dto/reorder-tracks.dto';
import { getValidThumbnailUrl } from '../utils/youtubeUtils';

/**
 * ============================================================================
 * SERVICE: PLAYLISTS & PLAYLIST TRACKS MANAGEMENT BUSINESS LOGIC
 * ============================================================================
 * @module PlaylistsModule
 * 
 * PURPOSE:
 * Core business service executing CRUD operations on custom playlists, managing
 * `playlist_tracks` junction table records, position sequencing, and owner verification.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Strict Authorization & Ownership: Verifies user ownership on every mutating operation
 *   to prevent unauthorized modification or deletion of other users' playlists.
 * - Automatic Position Sequencing: Calculates next available track position (`maxPosition + 1`)
 *   and automatically re-sequences remaining tracks when an item is deleted (`1..N`).
 * - Unique Constraints Enforcement: Prevents duplicate playlist names per user and duplicate
 *   tracks within the same playlist.
 * ============================================================================
 */
@Injectable()
export class PlaylistsService {
  private readonly logger = new Logger(PlaylistsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tracksService: TracksService,
  ) {}

  /**
   * Internal helper verifying that a playlist exists and is owned by the requesting user.
   * Throws `NotFoundException` if playlist does not exist, `ForbiddenException` if owned by another user.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @param playlistId - Playlist UUID
   * @returns Verified Playlist record
   */
  private async verifyPlaylistOwnership(userId: string, playlistId: string) {
    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
    });

    if (!playlist) {
      throw new NotFoundException(`Playlist with ID '${playlistId}' not found`);
    }

    if (playlist.userId !== userId) {
      throw new ForbiddenException('Access denied: You do not own this playlist');
    }

    return playlist;
  }

  /**
   * Internal helper ensuring target track row exists in `Tracks` table before adding to playlist.
   */
  private async ensureTrackExists(videoId: string, title?: string, artist?: string, thumbnailUrl?: string) {
    try {
      let track = await this.prisma.tracks.findUnique({
        where: { youtubeVideoId: videoId },
      });

      if (!track) {
        if (title) {
          track = await this.prisma.tracks.create({
            data: {
              youtubeVideoId: videoId,
              title,
              artist: artist || 'Unknown Artist',
              thumbnailUrl: thumbnailUrl || null,
            },
          });
        } else {
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
   * Creates a new custom playlist for an authenticated user.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @param dto - CreatePlaylistDto containing playlist name
   * @returns Newly created Playlist record
   */
  async createPlaylist(userId: string, dto: CreatePlaylistDto) {
    const { name } = dto;

    // Check for duplicate playlist name for this user
    const existing = await this.prisma.playlist.findUnique({
      where: {
        userId_name: {
          userId,
          name: name.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`You already have a playlist named '${name.trim()}'`);
    }

    try {
      const playlist = await this.prisma.playlist.create({
        data: {
          userId,
          name: name.trim(),
        },
        include: {
          tracks: {
            take: 1,
            include: { track: true },
          },
        },
      });

      this.logger.log(` Created playlist: id=${playlist.id}, name="${playlist.name}", user=${userId}`);
      return {
        message: 'Playlist created successfully',
        playlist,
      };
    } catch (error: any) {
      this.logger.error(`Failed to create playlist for user ${userId}: ${error.message}`);
      throw new HttpException('Failed to create playlist', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Retrieves all playlists owned by an authenticated user with track counts and preview thumbnails.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @returns Array of user playlists
   */
  async getUserPlaylists(userId: string) {
    try {
      const playlists = await this.prisma.playlist.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: {
          tracks: {
            orderBy: { position: 'asc' },
            take: 1, // First track preview thumbnail
            include: { track: true },
          },
          _count: {
            select: { tracks: true },
          },
        },
      });

      const formatted = playlists.map((p) => ({
        id: p.id,
        name: p.name,
        trackCount: p._count.tracks,
        previewThumbnail: getValidThumbnailUrl(p.tracks[0]?.track?.thumbnailUrl) || null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }));

      return {
        count: formatted.length,
        playlists: formatted,
      };
    } catch (error: any) {
      this.logger.error(`Failed to fetch playlists for user ${userId}: ${error.message}`);
      throw new HttpException('Failed to fetch user playlists', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Retrieves a single playlist by ID along with its full list of tracks ordered by position.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @param playlistId - Target Playlist UUID
   * @returns Playlist object with ordered tracks
   */
  async getPlaylistById(userId: string, playlistId: string) {
    await this.verifyPlaylistOwnership(userId, playlistId);

    const playlist = await this.prisma.playlist.findUnique({
      where: { id: playlistId },
      include: {
        tracks: {
          orderBy: { position: 'asc' },
          include: {
            track: true,
          },
        },
      },
    });

    if (!playlist) return playlist;

    return {
      ...playlist,
      tracks: playlist.tracks.map((pt) => ({
        ...pt,
        track: pt.track
          ? {
              ...pt.track,
              thumbnailUrl: getValidThumbnailUrl(pt.track.thumbnailUrl) || null,
            }
          : pt.track,
      })),
    };
  }

  /**
   * Updates / renames an existing playlist.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @param playlistId - Target Playlist UUID
   * @param dto - UpdatePlaylistDto containing new name
   * @returns Updated Playlist record
   */
  async updatePlaylist(userId: string, playlistId: string, dto: UpdatePlaylistDto) {
    await this.verifyPlaylistOwnership(userId, playlistId);
    const newName = dto.name.trim();

    // Check if new name collides with another existing playlist owned by user
    const existing = await this.prisma.playlist.findFirst({
      where: {
        userId,
        name: newName,
        NOT: { id: playlistId },
      },
    });

    if (existing) {
      throw new ConflictException(`You already have another playlist named '${newName}'`);
    }

    const updated = await this.prisma.playlist.update({
      where: { id: playlistId },
      data: { name: newName },
    });

    this.logger.log(` Renamed playlist ${playlistId} to "${newName}"`);
    return {
      message: 'Playlist renamed successfully',
      playlist: updated,
    };
  }

  /**
   * Deletes a playlist by ID. Cascades deletion to associated `playlist_tracks` rows.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @param playlistId - Target Playlist UUID
   * @returns Success message
   */
  async deletePlaylist(userId: string, playlistId: string) {
    await this.verifyPlaylistOwnership(userId, playlistId);

    await this.prisma.playlist.delete({
      where: { id: playlistId },
    });

    this.logger.log(` Deleted playlist ${playlistId} for user ${userId}`);
    return {
      message: 'Playlist deleted successfully',
      id: playlistId,
    };
  }

  /**
   * Adds a track to a playlist. Auto-calculates next available position (`maxPosition + 1`).
   *
   * @param userId - Internal PostgreSQL user UUID
   * @param playlistId - Target Playlist UUID
   * @param dto - AddPlaylistTrackDto containing videoId and optional metadata
   * @returns Added PlaylistTrack record joined with track details
   */
  async addTrackToPlaylist(userId: string, playlistId: string, dto: AddPlaylistTrackDto) {
    const { videoId, title, artist, thumbnailUrl } = dto;
    await this.verifyPlaylistOwnership(userId, playlistId);

    // Check if track is already in playlist
    const existingTrackInPlaylist = await this.prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: {
          playlistId,
          trackId: videoId,
        },
      },
    });

    if (existingTrackInPlaylist) {
      throw new ConflictException('This track is already in the playlist');
    }

    // Ensure Track row exists in database (outside transaction — may call YouTube API)
    await this.ensureTrackExists(videoId, title, artist, thumbnailUrl);

    // Wrap position calculation + insert in a transaction to prevent duplicate positions
    // under concurrent requests
    const playlistTrack = await this.prisma.$transaction(async (tx) => {
      // Re-read max position inside transaction so concurrent inserts don't collide
      const lastTrack = await tx.playlistTrack.findFirst({
        where: { playlistId },
        orderBy: { position: 'desc' },
      });

      const nextPosition = lastTrack ? lastTrack.position + 1 : 1;

      const created = await tx.playlistTrack.create({
        data: {
          playlistId,
          trackId: videoId,
          position: nextPosition,
        },
        include: { track: true },
      });

      await tx.playlist.update({
        where: { id: playlistId },
        data: { updatedAt: new Date() },
      });

      return created;
    });

    this.logger.log(` Added track ${videoId} to playlist ${playlistId}`);
    return {
      message: 'Track added to playlist successfully',
      playlistTrack,
    };
  }

  /**
   * Removes a track from a playlist and automatically re-sequences remaining tracks (`1..N`).
   *
   * @param userId - Internal PostgreSQL user UUID
   * @param playlistId - Target Playlist UUID
   * @param trackId - YouTube Video ID of track to remove
   * @returns Success message
   */
  async removeTrackFromPlaylist(userId: string, playlistId: string, trackId: string) {
    await this.verifyPlaylistOwnership(userId, playlistId);

    const existing = await this.prisma.playlistTrack.findUnique({
      where: {
        playlistId_trackId: { playlistId, trackId },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Track '${trackId}' not found in playlist '${playlistId}'`);
    }

    // Wrap delete + re-sequence inside a transaction so concurrent removes
    // never produce duplicate or skipped position numbers
    await this.prisma.$transaction(async (tx) => {
      await tx.playlistTrack.delete({
        where: {
          playlistId_trackId: { playlistId, trackId },
        },
      });

      // Read remaining tracks inside transaction — consistent snapshot
      const remaining = await tx.playlistTrack.findMany({
        where: { playlistId },
        orderBy: { position: 'asc' },
      });

      // Batch all position updates in parallel within the same transaction
      await Promise.all(
        remaining.map((item, index) => {
          const newPos = index + 1;
          if (item.position === newPos) return Promise.resolve(); // skip no-ops
          return tx.playlistTrack.update({
            where: { id: item.id },
            data: { position: newPos },
          });
        }),
      );

      await tx.playlist.update({
        where: { id: playlistId },
        data: { updatedAt: new Date() },
      });
    });

    this.logger.log(` Removed track ${trackId} from playlist ${playlistId} and re-sequenced`);
    return {
      message: 'Track removed from playlist successfully',
      playlistId,
      trackId,
    };
  }

  /**
   * Atomically updates track positions within a playlist for drag-and-drop reordering.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @param playlistId - Target Playlist UUID
   * @param dto - ReorderTracksDto containing array of `{ trackId, position }`
   * @returns Success message
   */
  async reorderPlaylistTracks(userId: string, playlistId: string, dto: ReorderTracksDto) {
    await this.verifyPlaylistOwnership(userId, playlistId);

    // All position updates execute as a single atomic transaction
    // so a partial reorder from a concurrent request cannot interleave
    await this.prisma.$transaction(async (tx) => {
      await Promise.all(
        dto.tracks.map((item) =>
          tx.playlistTrack.updateMany({
            where: { playlistId, trackId: item.trackId },
            data: { position: item.position },
          }),
        ),
      );

      await tx.playlist.update({
        where: { id: playlistId },
        data: { updatedAt: new Date() },
      });
    });

    this.logger.log(` Reordered tracks in playlist ${playlistId}`);
    return {
      message: 'Playlist tracks reordered successfully',
    };
  }
}
