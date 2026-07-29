import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TracksModule } from './tracks/tracks.module';
import { ListenHistoryModule } from './history/history.module';
import { PlaylistsModule } from './playlists/playlists.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';

/**
 * ============================================================================
 * ROOT APPLICATION MODULE: APP MODULE
 * ============================================================================
 * @module AppModule
 * 
 * PURPOSE:
 * Central root module orchestrating all feature modules across the NestJS application container.
 *
 * MODULE COMPOSITION:
 * - PrismaModule: Global PostgreSQL database connection management & failover
 * - AuthModule: Google OAuth 2.0 Direct ID Token verification & user profile synchronization
 * - TracksModule: YouTube API proxying, 24h search caching, and API quota tracking
 * - ListenHistoryModule: User play logging, history pagination, and liked track favorites
 * - PlaylistsModule: Custom playlist CRUD operations, track additions/removals, & position reordering
 * - RecommendationsModule: TF-IDF vector similarity recommendation engine
 * - HealthModule: Uptime monitoring, database pinging, and health check endpoints
 * ============================================================================
 */
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    TracksModule,
    ListenHistoryModule,
    PlaylistsModule,
    RecommendationsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
