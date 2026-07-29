import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * ============================================================================
 * DTO: GENERATE QUEUE REQUEST DTO
 * ============================================================================
 * @module RecommendationsModule
 * 
 * PURPOSE:
 * Validates request payload for POST /api/music/generate-queue.
 * Accepts required `currentTrackId` and optional context `keyword`.
 * ============================================================================
 */
export class GenerateQueueDto {
  @IsNotEmpty({ message: 'currentTrackId is required' })
  @IsString()
  currentTrackId: string;

  @IsOptional()
  @IsString()
  keyword?: string;
}
