import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * ============================================================================
 * HTTP CONTROLLER: HEALTH CHECK & MONITORS ROUTING LAYER
 * ============================================================================
 * @module HealthModule
 * 
 * PURPOSE:
 * Exposes public unauthenticated endpoints `/healthcheck` and `/health` for ping services,
 * load balancers, and uptime monitors.
 * ============================================================================
 */
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Primary healthcheck ping endpoint.
   * @route GET `/healthcheck`
   */
  @Get('healthcheck')
  async getHealthCheck() {
    return this.healthService.checkHealth();
  }

  /**
   * Alias health ping endpoint.
   * @route GET `/health`
   */
  @Get('health')
  async getHealth() {
    return this.healthService.checkHealth();
  }
}
