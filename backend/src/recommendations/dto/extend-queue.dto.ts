import { IsArray, IsOptional, IsString } from 'class-validator';

/**
 * ============================================================================
 * DTO: EXTEND QUEUE REQUEST DTO (extend-queue.dto.ts)
 * ============================================================================
 * @module RecommendationsModule
 * 
 * PURPOSE:
 * Validates request payload for POST /api/music/extend-queue.
 * Accepts `existingTrackIds` array to deduplicate candidate tracks against current queue
 * and an optional context `keyword` string.
 * ============================================================================
 */
export class ExtendQueueDto {
  @IsArray({ message: 'existingTrackIds must be an array of track IDs' })
  @IsString({ each: true, message: 'Each track ID must be a string' })
  existingTrackIds: string[];

  @IsOptional()
  @IsString()
  keyword?: string;
}
