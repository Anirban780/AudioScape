import { Module } from '@nestjs/common';
import { TracksService } from './tracks.service';
import { TracksController } from './tracks.controller';
import { YouTubeKeyManager } from './youtube-key-manager';
import { SearchRateLimiterService } from './search-rate-limiter.service';

/**
 * ============================================================================
 * NESTJS MODULE: TRACKS MODULE
 * ============================================================================
 * @module TracksModule
 * 
 * PURPOSE:
 * Encapsulates track searching, YouTube API proxying, dual key quota management,
 * PostgreSQL search caching logic, and multi-tiered search rate limiting.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Modular Encapsulation: Groups `TracksController`, `TracksService`, `YouTubeKeyManager`,
 *   and `SearchRateLimiterService` into a clean feature boundary.
 * - Service Export: Exports services so downstream feature modules (e.g. RecommendationsModule)
 *   can utilize track caching, rate limiting, and detail resolution methods.
 * ============================================================================
 */
@Module({
  controllers: [TracksController],
  providers: [TracksService, YouTubeKeyManager, SearchRateLimiterService],
  exports: [TracksService, YouTubeKeyManager, SearchRateLimiterService],
})
export class TracksModule {}
