import { IsNotEmpty, IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class TrackItemDto {
  @IsOptional()
  @IsString()
  id?: string; // YouTube Video ID alias 1

  @IsOptional()
  @IsString()
  videoId?: string; // YouTube Video ID alias 2

  @IsOptional()
  @IsString()
  name?: string; // Track title alias 1

  @IsOptional()
  @IsString()
  title?: string; // Track title alias 2

  @IsOptional()
  @IsString()
  artist?: string; // Channel/artist title alias 1

  @IsOptional()
  @IsString()
  channelTitle?: string; // Channel/artist title alias 2

  @IsOptional()
  @IsString()
  thumbnail?: string; // Thumbnail URL alias 1

  @IsOptional()
  @IsString()
  thumbNail?: string; // Thumbnail URL alias 2

  @IsOptional()
  @IsString()
  channelId?: string;

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
