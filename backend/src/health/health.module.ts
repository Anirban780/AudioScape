import { Module } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

/**
 * ============================================================================
 * NESTJS MODULE: HEALTH MODULE
 * ============================================================================
 * @module HealthModule
 * 
 * PURPOSE:
 * Encapsulates application health monitoring, database pinging, and process uptime reporting.
 * ============================================================================
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
