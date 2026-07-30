import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ============================================================================
 * SERVICE: HEALTH CHECK & UPTIME MONITORING BUSINESS LOGIC
 * ============================================================================
 * @module HealthModule
 * 
 * PURPOSE:
 * Performs real-time health checks on core infrastructure (PostgreSQL database connectivity,
 * system memory utilization, application process uptime).
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Cold-Start Ping Endpoint: Render.com / Uptime Robot / Kubernetes liveness probes require
 *   a lightweight HTTP 200 ping endpoint to keep free-tier containers warm or detect deadlocks.
 * - Real-Time Telemetry: Verifies database ping before reporting `healthy` status.
 * ============================================================================
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Performs deep health check including database query execution and memory diagnostics.
   * @returns Health status object with DB status, uptime, and system metrics
   */
  async checkHealth() {
    let dbStatus = 'disconnected';
    let dbLatencyMs = -1;

    const dbStart = Date.now();
    try {
      // Execute lightweight query to verify DB connection
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
      dbLatencyMs = Date.now() - dbStart;
    } catch (err: any) {
      this.logger.error(`Health check DB ping failed: ${err.message}`);
      dbStatus = 'degraded';
    }

    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const memoryUsage = process.memoryUsage();

    return {
      status: dbStatus === 'connected' ? 'ok' : 'degraded',
      service: 'AudioScape NestJS Backend',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      uptimeSeconds,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      memory: {
        rssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      },
    };
  }
}
