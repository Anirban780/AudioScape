import { Module } from '@nestjs/common';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { AuthModule } from '../auth/auth.module';
import { TracksModule } from '../tracks/tracks.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';

/**
 * ============================================================================
 * NESTJS MODULE: LISTEN HISTORY MODULE
 * ============================================================================
 * @module ListenHistoryModule
 * 
 * PURPOSE:
 * Encapsulates listening history logging, play counter increments, and favorite track management.
 * Imports `AuthModule`, `TracksModule`, and `RecommendationsModule` (for cache invalidation).
 * ============================================================================
 */
@Module({
  imports: [AuthModule, TracksModule, RecommendationsModule],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class ListenHistoryModule {}
