import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @IsOptional()
  @IsString({ message: 'Playlist name must be a valid string' })
  @IsNotEmpty({ message: 'Playlist name cannot be empty' })
  @MaxLength(100, { message: 'Playlist name cannot exceed 100 characters' })
  name?: string;

  /**
   * Optional updated description text for the playlist.
   */
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(500, { message: 'Description cannot exceed 500 characters' })
  description?: string;

  /**
   * Optional custom cover artwork image URL.
   */
  @IsOptional()
  @IsString({ message: 'coverUrl must be a string' })
  coverUrl?: string;
}
