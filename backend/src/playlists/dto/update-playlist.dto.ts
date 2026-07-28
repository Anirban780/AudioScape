import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * ============================================================================
 * DATA TRANSFER OBJECT (DTO): UPDATE / RENAME PLAYLIST PAYLOAD
 * ============================================================================
 * @module PlaylistsModule
 * 
 * PURPOSE:
 * Defines and validates payload sent when updating/renaming an existing playlist (`PUT /api/playlists/:id`).
 * ============================================================================
 */
export class UpdatePlaylistDto {
  /**
   * Updated title / name for the playlist.
   * @example "Study & Chill Beat Mix"
   */
  @IsString({ message: 'Playlist name must be a valid string' })
  @IsNotEmpty({ message: 'Playlist name is required and cannot be empty' })
  @MaxLength(100, { message: 'Playlist name cannot exceed 100 characters' })
  name: string;
}
