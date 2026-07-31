import { Controller, Get, Query, Param } from '@nestjs/common';
import { TracksService } from './tracks.service';
import { SearchTracksDto } from './dto/search-tracks.dto';

/**
 * ============================================================================
 * HTTP CONTROLLER: TRACKS & YOUTUBE PROXY ROUTING LAYER
 * ============================================================================
 * @module TracksModule
 * @route `/youtube`
 * 
 * PURPOSE:
 * Exposes REST endpoints for client applications to search music tracks, fetch single track details,
 * and retrieve category metadata without client-side API key exposure.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - API Key Encapsulation: Prevents YouTube API Key leakage by performing calls strictly server-side.
 * - Uniform Response Structure: Preserves backward compatibility with existing frontend player components.
 * - Validation Pipeline: Integrates `SearchTracksDto` validation on query parameters.
 * ============================================================================
 */
@Controller('youtube')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  /**
   * Search tracks by query string with optional pagination page token.
   * Leverages PostgreSQL search cache for repeated queries.
   *
   * @route GET `/youtube/search?query=...&pageToken=...`
   * @param dto - SearchTracksDto query string parameters
   * @returns Object containing tracks array, nextPageToken, and cached flag
   */
  @Get('search')
  async searchTracks(@Query() dto: SearchTracksDto) {
    const dbOnly = dto.dbOnly === 'true' || dto.dbOnly === '1';
    return this.tracksService.searchTracks(dto.query, dto.pageToken, dbOnly);
  }

  /**
   * Fetch detailed metadata (duration, tags/genres, thumbnail) for a single track.
   *
   * @route GET `/youtube/track/:videoId`
   * @param videoId - YouTube video ID string
   * @returns Track metadata object
   */
  @Get('track/:videoId')
  async getTrackDetails(@Param('videoId') videoId: string) {
    return this.tracksService.getTrackDetails(videoId);
  }

  /**
   * Retrieve dynamic YouTube Music category ID (cached in-memory).
   *
   * @route GET `/youtube/categories`
   * @returns Object containing categoryId and category label
   */
  @Get('categories')
  async getMusicCategory() {
    const categoryId = await this.tracksService.getMusicCategoryId();
    return { categoryId, category: 'Music' };
  }
}
