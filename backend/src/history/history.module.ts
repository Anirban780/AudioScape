import { Module } from '@nestjs/common';
import { HistoryService } from './history.service';
import { HistoryController } from './history.controller';
import { AuthModule } from '../auth/auth.module';
import { TracksModule } from '../tracks/tracks.module';

/**
 * ============================================================================
 * NESTJS MODULE: LISTEN HISTORY MODULE
 * ============================================================================
 * @module ListenHistoryModule
 * 
 * PURPOSE:
 * Encapsulates listening history logging, play counter increments, and favorite track management.
 * Imports `AuthModule` (for `GoogleAuthGuard`) and `TracksModule` (for track detail resolution).
 * ============================================================================
 */
@Module({
  imports: [AuthModule, TracksModule],
  controllers: [HistoryController],
  providers: [HistoryService],
  exports: [HistoryService],
})
export class ListenHistoryModule {}
