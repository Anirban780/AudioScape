import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';
import { CacheRelatedTracksDto } from './dto/cache-related-tracks.dto';
import { GenerateQueueDto } from './dto/generate-queue.dto';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

/**
 * ============================================================================
 * HTTP CONTROLLER: RECOMMENDATIONS & EXPLORE FEED ROUTING LAYER
 * ============================================================================
 * @module RecommendationsModule
 * @route `/api/music`
 * 
 * PURPOSE:
 * Exposes REST endpoints for client applications to fetch personalized content-based
 * recommendations, cache related tracks, retrieve explore section feeds, and generate
 * continuous playback queues.
 * 
 * ENDPOINTS:
 * - POST `/api/music/recommend`             -> Get personalized music recommendations
 * - POST `/api/music/cache-related-tracks` -> Cache keyword search results in PostgreSQL
 * - POST `/api/music/generate-queue`        -> Generate continuous queue for current track
 * - GET  `/api/music/explore`               -> Get server-side explore page section feeds
 * ============================================================================
 */
@Controller('api/music')
@UseGuards(GoogleAuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  /**
   * Computes or retrieves personalized track recommendations for authenticated user.
   * @route POST `/api/music/recommend`
   * @header Authorization Bearer <google_id_token>
   */
  @Post('recommend')
  async getRecommendations(
    @GetUser('id') userId: string,
    @Body() dto: GetRecommendationsDto,
  ) {
    const topN = dto.topN || 5;
    return this.recommendationsService.getRecommendations(userId, topN);
  }

  /**
   * Legacy compatibility endpoint to cache keyword search results in PostgreSQL.
   * @route POST `/api/music/cache-related-tracks`
   * @header Authorization Bearer <google_id_token>
   */
  @Post('cache-related-tracks')
  async cacheRelatedTracks(@Body() dto: CacheRelatedTracksDto) {
    return this.recommendationsService.cacheRelatedTracks(dto.keyword, dto.tracks);
  }

  /**
   * Generates continuous play queue mixing current track, related tracks, and listening history.
   * @route POST `/api/music/generate-queue`
   * @header Authorization Bearer <google_id_token>
   */
  @Post('generate-queue')
  async generateQueue(
    @GetUser('id') userId: string,
    @Body() dto: GenerateQueueDto,
  ) {
    return this.recommendationsService.generateQueue(userId, dto.currentTrackId, dto.keyword);
  }

  /**
   * Retrieves categorized explore feed sections server-side without exposing API keys.
   * Defaults to 5 tracks per category section.
   * @route GET `/api/music/explore?limit=5`
   * @header Authorization Bearer <google_id_token>
   */
  @Get('explore')
  async getExploreFeed(
    @GetUser('id') userId: string,
    @Query('limit') limit?: string,
  ) {
    const limitPerCategory = limit ? parseInt(limit, 10) : 5;
    return this.recommendationsService.getExploreFeed(userId, limitPerCategory);
  }
}
