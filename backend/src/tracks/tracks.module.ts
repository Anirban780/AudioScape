import { Module } from '@nestjs/common';
import { TracksService } from './tracks.service';
import { TracksController } from './tracks.controller';

/**
 * ============================================================================
 * NESTJS MODULE: TRACKS MODULE
 * ============================================================================
 * @module TracksModule
 * 
 * PURPOSE:
 * Encapsulates track searching, YouTube API proxying, and PostgreSQL search caching logic.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Modular Encapsulation: Groups `TracksController` and `TracksService` into a clean feature boundary.
 * - Service Export: Exports `TracksService` so downstream feature modules (e.g. RecommendationsModule)
 *   can utilize track caching and detail resolution methods.
 * ============================================================================
 */
@Module({
  controllers: [TracksController],
  providers: [TracksService],
  exports: [TracksService],
})
export class TracksModule {}
