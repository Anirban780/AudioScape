import { Module } from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { PlaylistsController } from './playlists.controller';
import { AuthModule } from '../auth/auth.module';
import { TracksModule } from '../tracks/tracks.module';

/**
 * ============================================================================
 * NESTJS MODULE: PLAYLISTS MODULE
 * ============================================================================
 * @module PlaylistsModule
 * 
 * PURPOSE:
 * Encapsulates custom playlist creation, retrieval, updates, deletions, and track ordering logic.
 * Imports `AuthModule` (for `GoogleAuthGuard`) and `TracksModule` (for track detail auto-resolution).
 * ============================================================================
 */
@Module({
  imports: [AuthModule, TracksModule],
  controllers: [PlaylistsController],
  providers: [PlaylistsService],
  exports: [PlaylistsService],
})
export class PlaylistsModule {}
