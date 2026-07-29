import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * ============================================================================
 * SERVICE: GLOBAL PRISMA ORM & DUAL DATABASE CONNECTION MANAGEMENT
 * ============================================================================
 * @module PrismaModule
 * 
 * PURPOSE:
 * Manages database lifecycle events, connection pooling, and automated failover between:
 * 1. Primary Database: Deployed Cloud Neon PostgreSQL (`NEON_DATABASE_URL` / `DATABASE_URL`)
 * 2. Fallback Database: Local Docker PostgreSQL Container (`LOCAL_DATABASE_URL`)
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - High Availability: Prevents application crash if cloud database (Neon) is waking up (cold-start)
 *   or undergoing maintenance, automatically failing over to local container.
 * - Centralized ORM Access: Injects Prisma Client instance globally into all feature modules
 *   (TracksService, HistoryService, AuthService, etc.).
 * - Zero Boilerplate Injection: Marked as a global module provider so feature services can query
 *   `this.prisma.tracks` or `this.prisma.listenHistory` seamlessly.
 * ============================================================================
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Determine Primary connection string
    const primaryUrl =
      process.env.NEON_DATABASE_URL ||
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgrespassword@localhost:5432/audioscape?schema=public';

    super({
      datasources: {
        db: {
          url: primaryUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  /**
   * NestJS Lifecycle Hook: Establishes DB connection upon module initialization.
   * Performs automated failover to local Docker PostgreSQL if Primary Cloud DB fails to respond.
   */
  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(' Successfully connected to Primary PostgreSQL Database (Neon Cloud/Production)');
    } catch (primaryError: any) {
      this.logger.warn(` Primary Cloud Database connection failed: ${primaryError.message}`);
      this.logger.warn(' Attempting automated fallback connection to Local Docker PostgreSQL container...');

      try {
        const fallbackUrl =
          process.env.LOCAL_DATABASE_URL ||
          'postgresql://postgres:postgrespassword@localhost:5432/audioscape?schema=public';

        // Disconnect failed primary connection attempt
        await this.$disconnect().catch(() => {});

        // Re-configure active connection URL to fallback instance
        (this as any)._activeUrl = fallbackUrl;
        await this.$connect();

        this.logger.log(' Connected successfully to Fallback Database (Local Docker PostgreSQL)');
      } catch (fallbackError: any) {
        this.logger.error(' Both Primary (Neon) and Fallback (Local Docker) database connections failed!');
        this.logger.error(`Fallback connection error: ${fallbackError.message}`);
      }
    }
  }

  /**
   * NestJS Lifecycle Hook: Gracefully disconnects database on application shutdown.
   */
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log(' Database connection gracefully closed.');
  }
}
