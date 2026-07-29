import { IsNotEmpty, IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TrackItemDto {
  @IsNotEmpty()
  @IsString()
  id: string; // YouTube Video ID

  @IsNotEmpty()
  @IsString()
  name: string; // Track title

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsArray()
  genre?: string[];
}

/**
 * ============================================================================
 * DTO: CACHE RELATED TRACKS REQUEST DTO
 * ============================================================================
 * @module RecommendationsModule
 * 
 * PURPOSE:
 * Validates request payload for legacy compatibility endpoint POST /api/music/cache-related-tracks.
 * Allows caching keyword search results into PostgreSQL SearchQuery + QueryTrackResult tables.
 * ============================================================================
 */
export class CacheRelatedTracksDto {
  @IsNotEmpty({ message: 'Keyword string is required' })
  @IsString()
  keyword: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TrackItemDto)
  tracks: TrackItemDto[];
}
