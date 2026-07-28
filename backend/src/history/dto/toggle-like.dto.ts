import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

/**
 * ============================================================================
 * DATA TRANSFER OBJECT (DTO): TOGGLE TRACK LIKE PAYLOAD
 * ============================================================================
 * @module ListenHistoryModule
 * 
 * PURPOSE:
 * Defines and validates payload when a user likes or unlikes a track (`POST /api/music/like`).
 * ============================================================================
 */
export class ToggleLikeDto {
  /**
   * YouTube Video ID of track being liked/unliked.
   * @example "dQw4w9WgXcQ"
   */
  @IsString({ message: 'videoId must be a valid string' })
  @IsNotEmpty({ message: 'videoId is required' })
  videoId: string;

  /**
   * Boolean flag indicating target liked status (`true` = liked/favorite, `false` = unliked).
   */
  @IsBoolean({ message: 'liked must be a boolean value' })
  liked: boolean;
}
