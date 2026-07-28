import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * ============================================================================
 * DATA TRANSFER OBJECT (DTO): ADD TRACK TO PLAYLIST PAYLOAD
 * ============================================================================
 * @module PlaylistsModule
 * 
 * PURPOSE:
 * Defines and validates payload sent when adding a track to a playlist (`POST /api/playlists/:id/tracks`).
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Natural Key Track Identification: Takes YouTube `videoId` string as natural key.
 * - Auto-Provision Metadata: Optional title, artist, and thumbnailUrl fields allow immediate track creation
 *   if the track record is not yet stored in PostgreSQL.
 * ============================================================================
 */
export class AddPlaylistTrackDto {
  /**
   * YouTube Video ID natural key string of track to add.
   * @example "dQw4w9WgXcQ"
   */
  @IsString({ message: 'videoId must be a valid string' })
  @IsNotEmpty({ message: 'videoId is required' })
  videoId: string;

  /**
   * Optional track title for auto-provisioning track in DB if missing.
   */
  @IsString()
  @IsOptional()
  title?: string;

  /**
   * Optional artist / channel title string.
   */
  @IsString()
  @IsOptional()
  artist?: string;

  /**
   * Optional thumbnail URL string.
   */
  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}
