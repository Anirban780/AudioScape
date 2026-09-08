import { Controller, Get, Post, Query, Param, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { TracksService } from './tracks.service';
import { SearchTracksDto } from './dto/search-tracks.dto';
import { CronAuthGuard } from '../auth/cron-auth.guard';
import { IsCron } from '../auth/decorators/is-cron.decorator';

/**
 * ============================================================================
 * HTTP CONTROLLER: TRACKS & YOUTUBE PROXY ROUTING LAYER
 * ============================================================================
 * @module TracksModule
 * @route `/youtube`
 * 
 * PURPOSE:
 * Exposes REST endpoints for client applications to search music tracks, fetch single track details,
 * retrieve category metadata without client-side API key exposure, and execute automated YouTube ToS
 * 30-day cache refreshes.
 *
 * PRODUCTION FEATURES CONFIGURED:
 * - API Key Encapsulation: Prevents YouTube API Key leakage by performing calls strictly server-side.
 * - Multi-Tier Rate Limiting: Live search misses are limited to 3/min and 20/day per user/IP.
 * - Database & FTS Exemption: Local database and FTS matches consume 0 quota and are exempt from limits.
 * - YouTube ToS 30-Day Refresh: Background endpoint to re-verify metadata and soft-delete unavailable tracks.
 * ============================================================================
 */
@Controller('youtube')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  /**
   * Helper extracting authenticated user ID or remote client IP as a rate-limiting key.
   */
  private extractClientId(req: Request): string {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1]?.trim();
      if (token) {
        try {
          const decoded = jwt.decode(token) as any;
          if (decoded && decoded.sub) {
            return `user:${decoded.sub}`;
          }
        } catch {
          // Fall through to IP extraction
        }
      }
    }

    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = typeof forwarded === 'string'
      ? forwarded.split(',')[0].trim()
      : Array.isArray(forwarded)
      ? forwarded[0]
      : req.ip || req.socket.remoteAddress || '127.0.0.1';

    return `ip:${rawIp}`;
  }

  /**
   * Search tracks by query string with optional pagination page token.
   * Leverages PostgreSQL search cache for repeated queries.
   *
   * Rate limits: Max 3 live searches/min, 20 live searches/day. Cache hits cost 0 quota and are exempt.
   *
   * @route GET `/youtube/search?query=...&pageToken=...&dbOnly=...`
   * @param dto - SearchTracksDto query string parameters
   * @returns Object containing tracks array, nextPageToken, and cached flag
   */
  @Get('search')
  async searchTracks(
    @Query() dto: SearchTracksDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const dbOnly = dto.dbOnly === 'true' || dto.dbOnly === '1';
    const clientId = this.extractClientId(req);
    return this.tracksService.searchTracks(dto.query, dto.pageToken, dbOnly, clientId, res);
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

  /**
   * Background maintenance endpoint executing YouTube API Services ToS Section III.E.4 30-day refresh.
   * Soft-deletes deleted or private tracks.
   * Executed by platform schedulers (GitHub Actions, Vercel Cron) with CRON_SECRET.
   *
   * @route POST `/youtube/cron/refresh-stale-tracks`
   * @header Authorization: Bearer <CRON_SECRET>
   */
  @IsCron()
  @UseGuards(CronAuthGuard)
  @Post('cron/refresh-stale-tracks')
  async refreshStaleTracks(@Query('limit') limit?: string) {
    const batchLimit = limit ? parseInt(limit, 10) : 50;
    return this.tracksService.batchRefreshStaleTracks(batchLimit);
  }
}
