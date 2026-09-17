import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ============================================================================
 * DATA TRANSFER OBJECT (DTO): GET HISTORY PAGINATION PARAMS
 * ============================================================================
 * @module ListenHistoryModule
 * 
 * PURPOSE:
 * Validates query parameters for paginated user listen history requests (`GET /api/music/history`).
 * ============================================================================
 */
export class GetHistoryQueryDto {
  /**
   * Maximum records to return per page (Default: 20, Max: 100).
   */
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit cannot exceed 100' })
  @IsOptional()
  limit?: number = 20;

  /**
   * Page number index (Default: 1).
   */
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  @IsOptional()
  page?: number = 1;
}
