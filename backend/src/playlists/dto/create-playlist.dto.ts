import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * ============================================================================
 * DATA TRANSFER OBJECT (DTO): CREATE PLAYLIST PAYLOAD
 * ============================================================================
 * @module PlaylistsModule
 * 
 * PURPOSE:
 * Defines and validates the payload sent when an authenticated user creates a new custom playlist
 * (`POST /api/playlists`).
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Input Sanitation & Length Limits: Restricts playlist names to 100 characters to prevent database bloat
 *   and UI overflow bugs.
 * - Enforces Non-Empty String: Ensures users cannot create blank or whitespace-only playlist titles.
 * ============================================================================
 */
export class CreatePlaylistDto {
  /**
   * Title / name for the new custom playlist.
   * @example "Late Night Lofi Vibes"
   */
  @IsString({ message: 'Playlist name must be a valid string' })
  @IsNotEmpty({ message: 'Playlist name is required and cannot be empty' })
  @MaxLength(100, { message: 'Playlist name cannot exceed 100 characters' })
  name: string;
}
