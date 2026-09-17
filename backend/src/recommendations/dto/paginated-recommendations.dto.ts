import { IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

/**
 * ============================================================================
 * DTO: PAGINATED RECOMMENDATIONS REQUEST DTO
 * ============================================================================
 * @module RecommendationsModule
 * 
 * PURPOSE:
 * Validates query parameters for GET /api/music/recommendations.
 * Supports page-based browsing, configurable batch limits, and candidate shuffling.
 * ============================================================================
 */
export class PaginatedRecommendationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(50, { message: 'limit cannot exceed 50' })
  limit?: number = 20;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  shuffle?: boolean = false;
}
