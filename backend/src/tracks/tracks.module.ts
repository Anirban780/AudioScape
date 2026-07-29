import { Module } from '@nestjs/common';
import { TracksService } from './tracks.service';
import { TracksController } from './tracks.controller';
import { YouTubeKeyManager } from './youtube-key-manager';

/**
 * ============================================================================
 * NESTJS MODULE: TRACKS MODULE
 * ============================================================================
 * @module TracksModule
 * 
 * PURPOSE:
 * Encapsulates track searching, YouTube API proxying, dual key quota management, and PostgreSQL search caching logic.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Modular Encapsulation: Groups `TracksController`, `TracksService`, and `YouTubeKeyManager` into a clean feature boundary.
 * - Service Export: Exports `TracksService` and `YouTubeKeyManager` so downstream feature modules (e.g. RecommendationsModule)
 *   can utilize track caching and detail resolution methods.
 * ============================================================================
 */
@Module({
  controllers: [TracksController],
  providers: [TracksService, YouTubeKeyManager],
  exports: [TracksService, YouTubeKeyManager],
})
export class TracksModule {}
