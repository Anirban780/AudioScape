import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PlaybackSource } from '@prisma/client';

/**
 * ============================================================================
 * DATA TRANSFER OBJECT (DTO): RECORD TRACK LISTEN PAYLOAD
 * ============================================================================
 * @module ListenHistoryModule
 * 
 * PURPOSE:
 * Defines and validates the payload sent when a user plays a music track (`POST /api/music/history`).
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Play Attribution: Captures playback `source` (`SEARCH`, `EXPLORE`, `RECOMMENDATION`, `PLAYLIST`, `RELATED_QUEUE`)
 *   for analytical insights and TF-IDF recommendation engine scoring.
 * - Auto-Healing Track Cache: Optional title, artist, thumbnail params allow instant track row creation if missing.
 * ============================================================================
 */
export class RecordListenDto {
  /**
   * YouTube Video ID natural key string.
   * @example "dQw4w9WgXcQ"
   */
  @IsString({ message: 'videoId must be a valid string' })
  @IsNotEmpty({ message: 'videoId is required' })
  videoId: string;

  /**
   * Optional playback source context. Defaults to `SEARCH` if omitted.
   * @example "RECOMMENDATION"
   */
  @IsEnum(PlaybackSource, { message: 'source must be a valid PlaybackSource enum value' })
  @IsOptional()
  source?: PlaybackSource;

  /**
   * Optional track title string for auto-provisioning track in DB if missing.
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
