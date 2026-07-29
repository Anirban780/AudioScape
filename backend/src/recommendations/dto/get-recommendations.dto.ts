import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ============================================================================
 * DTO: GET RECOMMENDATIONS REQUEST DTO
 * ============================================================================
 * @module RecommendationsModule
 * 
 * PURPOSE:
 * Validates request payload for POST /api/music/recommend.
 * Accepts optional `topN` parameter specifying desired recommendation count.
 * ============================================================================
 */
export class GetRecommendationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'topN must be an integer' })
  @Min(1, { message: 'topN must be at least 1' })
  @Max(50, { message: 'topN cannot exceed 50' })
  topN?: number = 5;
}
