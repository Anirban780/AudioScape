import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * ============================================================================
 * DATA TRANSFER OBJECT (DTO): SEARCH TRACKS QUERY PARAMS
 * ============================================================================
 * @module TracksModule
 * 
 * PURPOSE:
 * Defines and validates query string parameters sent to `GET /youtube/search`.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Input Sanitization: Validates that the search query is a non-empty string.
 * - Pagination Support: Validates optional `pageToken` parameter for YouTube API pagination.
 * - Runtime Safety: Integrated with NestJS's `ValidationPipe`.
 * ============================================================================
 */
export class SearchTracksDto {
  /**
   * Search term string entered by user in the search bar.
   * @example "lofi hip hop chill beats"
   */
  @IsString({ message: 'query must be a valid string' })
  @IsNotEmpty({ message: 'Search query is required' })
  query: string;

  /**
   * Optional YouTube pagination page token returned from a previous search response (`nextPageToken`).
   * @example "CDIQAA"
   */
  @IsString({ message: 'pageToken must be a valid string' })
  @IsOptional()
  pageToken?: string;
}
