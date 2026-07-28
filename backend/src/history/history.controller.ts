import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';
import { RecordListenDto } from './dto/record-listen.dto';
import { ToggleLikeDto } from './dto/toggle-like.dto';
import { GetHistoryQueryDto } from './dto/get-history-query.dto';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

/**
 * ============================================================================
 * HTTP CONTROLLER: LISTEN HISTORY & FAVORITES ROUTING LAYER
 * ============================================================================
 * @module ListenHistoryModule
 * @route `/api/music`
 * 
 * PURPOSE:
 * Exposes REST endpoints for client applications to record track plays, retrieve user listen history,
 * toggle liked track favorites, and fetch favorite tracks.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Zero Breaking Changes: Maintains `/api/music` route prefix matching legacy Express endpoints.
 * - Protected Access Control: Applies `GoogleAuthGuard` across all endpoints to ensure user privacy.
 * - Input Validation: Integrates `RecordListenDto`, `ToggleLikeDto`, and `GetHistoryQueryDto`.
 * ============================================================================
 */
@Controller('api/music')
@UseGuards(GoogleAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  /**
   * Record or increment track listening event for authenticated user.
   * @route POST `/api/music/history`
   * @header Authorization Bearer <google_id_token>
   */
  @Post('history')
  async recordListen(@GetUser('id') userId: string, @Body() dto: RecordListenDto) {
    return this.historyService.recordTrackListen(userId, dto);
  }

  /**
   * Retrieve paginated listen history for authenticated user.
   * @route GET `/api/music/history?page=1&limit=20`
   * @header Authorization Bearer <google_id_token>
   */
  @Get('history')
  async getHistory(@GetUser('id') userId: string, @Query() query: GetHistoryQueryDto) {
    return this.historyService.getUserListenHistory(userId, query);
  }

  /**
   * Toggle liked favorite status for a track.
   * @route POST `/api/music/like`
   * @header Authorization Bearer <google_id_token>
   */
  @Post('like')
  async toggleLike(@GetUser('id') userId: string, @Body() dto: ToggleLikeDto) {
    return this.historyService.toggleTrackLike(userId, dto);
  }

  /**
   * Retrieve all liked favorite tracks for authenticated user.
   * @route GET `/api/music/favorites`
   * @header Authorization Bearer <google_id_token>
   */
  @Get('favorites')
  async getFavorites(@GetUser('id') userId: string) {
    return this.historyService.getUserFavorites(userId);
  }
}
