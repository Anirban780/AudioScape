import { Controller, Get, Post, Body, Query, Param, UseGuards } from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { GetRecommendationsDto } from './dto/get-recommendations.dto';
import { PaginatedRecommendationsDto } from './dto/paginated-recommendations.dto';
import { CacheRelatedTracksDto } from './dto/cache-related-tracks.dto';
import { GenerateQueueDto } from './dto/generate-queue.dto';
import { ExtendQueueDto } from './dto/extend-queue.dto';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import { CronAuthGuard } from '../auth/cron-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { IsCron } from '../auth/decorators/is-cron.decorator';

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
 * - POST `/api/music/recommend`             -> Get personalized music recommendations (Home)
 * - GET  `/api/music/recommendations`       -> Get paginated music recommendations (Explore/Infinite)
 * - POST `/api/music/cache-related-tracks` -> Cache keyword search results in PostgreSQL
 * - POST `/api/music/generate-queue`        -> Generate continuous queue for current track
 * - POST `/api/music/extend-queue`          -> Fetch additional non-duplicate queue tracks
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
    const topN = dto.topN || 20;
    return this.recommendationsService.getRecommendations(userId, topN);
  }

  /**
   * Retrieves paginated personalized track recommendations for authenticated user.
   * Supports infinite scrolling, pagination, and candidate set shuffling.
   * @route GET `/api/music/recommendations?page=1&limit=20&shuffle=false`
   * @header Authorization Bearer <google_id_token>
   */
  @Get('recommendations')
  async getPaginatedRecommendations(
    @GetUser('id') userId: string,
    @Query() dto: PaginatedRecommendationsDto,
  ) {
    const page = dto.page || 1;
    const limit = dto.limit || 20;
    const shuffle = dto.shuffle === true || (dto.shuffle as any) === 'true';
    return this.recommendationsService.getPaginatedRecommendations(userId, page, limit, shuffle);
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
   * Fetches additional non-duplicate recommended tracks to extend an active playback queue (radio auto-refill).
   * @route POST `/api/music/extend-queue`
   * @header Authorization Bearer <google_id_token>
   */
  @Post('extend-queue')
  async extendQueue(
    @GetUser('id') userId: string,
    @Body() dto: ExtendQueueDto,
  ) {
    return this.recommendationsService.extendQueue(userId, dto.existingTrackIds, dto.keyword);
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

  /**
   * Retrieves tracks for a specific category or genre directly from PostgreSQL (0-quota rule).
   * Executes 100% against local database catalog and ranks candidates via dual engagement (website + YouTube).
   * @route GET `/api/music/explore/category/:keyword?limit=20`
   * @header Authorization Bearer <google_id_token>
   */
  @Get('explore/category/:keyword')
  async getCategoryTracks(
    @Param('keyword') keyword: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.recommendationsService.getCategoryTracks(keyword, limitNum);
  }

  /**
   * Retrieves the authoritative taxonomy of explore categories with frontend rendering metadata.
   * @route GET `/api/music/categories`
   * @header Authorization Bearer <google_id_token>
   */
  @Get('categories')
  async getCategories() {
    return this.recommendationsService.getCategories();
  }

  /**
   * Triggers background pre-warming of top Explore categories in PostgreSQL.
   * Executed by platform schedulers (GitHub Actions, Vercel Cron, AWS EventBridge) with CRON_SECRET.
   * @route POST `/api/music/cron/refresh-explore-cache`
   * @route GET `/api/music/cron/refresh-explore-cache`
   * @header Authorization: Bearer <CRON_SECRET>
   */
  @IsCron()
  @UseGuards(CronAuthGuard)
  @Post('cron/refresh-explore-cache')
  async triggerRefreshExploreCachePost(@Query('max') max?: string) {
    const maxCount = max ? parseInt(max, 10) : 20;
    return this.recommendationsService.refreshExploreCache(maxCount);
  }

  @IsCron()
  @UseGuards(CronAuthGuard)
  @Get('cron/refresh-explore-cache')
  async triggerRefreshExploreCacheGet(@Query('max') max?: string) {
    const maxCount = max ? parseInt(max, 10) : 20;
    return this.recommendationsService.refreshExploreCache(maxCount);
  }
}
