import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { ExplorePreWarmingService } from './explore-prewarming.service';
import { TfIdfEngine } from './tfidf-engine';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TracksModule } from '../tracks/tracks.module';

/**
 * ============================================================================
 * NESTJS MODULE: RECOMMENDATIONS MODULE
 * ============================================================================
 * @module RecommendationsModule
 * 
 * PURPOSE:
 * Encapsulates content-based music recommendation engine, TF-IDF vectorizer,
 * server-side explore feed generator, continuous play queue builder, and caching layers.
 * 
 * DEPENDENCIES:
 * - PrismaModule: Database persistence for listen history, tracks, search queries
 * - AuthModule: Protected authentication guards (GoogleAuthGuard)
 * - TracksModule: YouTube API proxying and SearchQuery caching
 * ============================================================================
 */
@Module({
  imports: [PrismaModule, AuthModule, TracksModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, ExplorePreWarmingService, TfIdfEngine],
  exports: [RecommendationsService, ExplorePreWarmingService, TfIdfEngine],
})
export class RecommendationsModule {}
