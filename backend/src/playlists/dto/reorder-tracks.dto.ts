import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Single track position item within reorder payload array.
 */
export class TrackPositionItem {
  @IsString({ message: 'trackId must be a valid string' })
  @IsNotEmpty({ message: 'trackId is required' })
  trackId: string;

  @IsInt({ message: 'position must be an integer' })
  @Min(1, { message: 'position must be at least 1' })
  position: number;
}

/**
 * ============================================================================
 * DATA TRANSFER OBJECT (DTO): REORDER PLAYLIST TRACKS PAYLOAD
 * ============================================================================
 * @module PlaylistsModule
 * 
 * PURPOSE:
 * Validates array of updated track positions when drag-and-dropping tracks within a playlist (`PUT /api/playlists/:id/tracks/reorder`).
 * ============================================================================
 */
export class ReorderTracksDto {
  /**
   * Array of track position updates containing `{ trackId: string, position: number }`.
   */
  @IsArray({ message: 'tracks must be an array' })
  @ValidateNested({ each: true })
  @Type(() => TrackPositionItem)
  tracks: TrackPositionItem[];
}
