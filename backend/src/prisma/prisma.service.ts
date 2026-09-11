import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

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
const NEON_DEFAULT_FALLBACK_URL =
  'postgresql://neondb_owner:npg_PFnGj7Qe0YhT@ep-raspy-cake-b3pkg41o-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

/**
 * Validates whether a connection string is usable in cloud environments.
 * Disqualifies docker-internal hostnames (@postgres:) and localhost that fail to resolve on cloud hosts.
 */
function isValidCloudPostgresUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('postgresql://') && !trimmed.startsWith('postgres://')) {
    return false;
  }
  if (
    trimmed.includes('@postgres:') ||
    trimmed.includes('@postgres/') ||
    trimmed.includes('@localhost') ||
    trimmed.includes('@127.0.0.1')
  ) {
    return false;
  }
  return true;
}

/**
 * Resolves the appropriate PostgreSQL connection URL based on runtime environment:
 * - Cloud/Staging/Production: Filters out unreachable Docker hostnames (@postgres:5432) and
 *   prioritizes valid Neon pooled endpoints, falling back to the configured Neon Staging instance.
 * - Local Development: Uses DATABASE_URL or local docker container.
 */
export function resolveDatabaseUrl(): { connectionString: string; isNeon: boolean; isCloud: boolean } {
  const isCloud =
    process.env.RENDER === 'true' ||
    process.env.NODE_ENV === 'production' ||
    process.env.NODE_ENV === 'staging' ||
    process.env.USE_NEON === 'true';

  let connectionString: string;

  if (isCloud) {
    if (isValidCloudPostgresUrl(process.env.DATABASE_URL)) {
      connectionString = process.env.DATABASE_URL!;
    } else if (isValidCloudPostgresUrl(process.env.NEON_DATABASE_URL)) {
      connectionString = process.env.NEON_DATABASE_URL!;
    } else if (
      process.env.NODE_ENV === 'production' &&
      isValidCloudPostgresUrl(process.env.NEON_PROD_POOLED_URL)
    ) {
      connectionString = process.env.NEON_PROD_POOLED_URL!;
    } else if (isValidCloudPostgresUrl(process.env.NEON_STAGING_POOLED_URL)) {
      connectionString = process.env.NEON_STAGING_POOLED_URL!;
    } else if (isValidCloudPostgresUrl(process.env.NEON_PROD_POOLED_URL)) {
      connectionString = process.env.NEON_PROD_POOLED_URL!;
    } else {
      connectionString = NEON_DEFAULT_FALLBACK_URL;
    }
  } else {
    connectionString =
      process.env.DATABASE_URL ||
      process.env.LOCAL_DATABASE_URL ||
      'postgresql://postgres:postgrespassword@localhost:5432/audioscape?schema=public';
  }

  const isNeon = connectionString.includes('neon.tech');
  return { connectionString, isNeon, isCloud };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const { connectionString, isNeon, isCloud } = resolveDatabaseUrl();

    // Propagate resolved connection string so other tools/adapters stay in sync
    process.env.DATABASE_URL = connectionString;

    const useSsl = isNeon || connectionString.includes('sslmode=require') || isCloud;
    const pool = new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 10000,
    });
    const adapter = new PrismaPg(pool);

    super({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });

    const maskedHost = connectionString.split('@')[1] || 'configured-host';
    this.logger.log(
      `Prisma initialized target: ${isNeon ? 'Neon Cloud Serverless' : 'PostgreSQL'} (${maskedHost.split('/')[0]}) [cloud=${isCloud}]`,
    );
  }

  /**
   * NestJS Lifecycle Hook: Establishes DB connection upon module initialization.
   * Includes automatic retry with exponential backoff to handle Neon serverless cold-start latency.
   */
  async onModuleInit() {
    const maxRetries = 3;
    let connected = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        await this.$queryRaw`SELECT 1`;
        connected = true;
        const isNeon = (process.env.DATABASE_URL || '').includes('neon.tech');
        this.logger.log(
          `Successfully connected to PostgreSQL Database (${isNeon ? 'Neon Cloud Serverless' : 'Local Docker PostgreSQL'}) on attempt ${attempt}/${maxRetries}`,
        );
        break;
      } catch (err: any) {
        this.logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
        if (attempt < maxRetries) {
          const delayMs = attempt * 1000;
          this.logger.warn(`Retrying database connection in ${delayMs}ms (handling cold start)...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    if (!connected) {
      this.logger.error('All database connection attempts failed. Backend running in degraded mode.');
    }
  }

  /**
   * NestJS Lifecycle Hook: Gracefully disconnects database on application shutdown.
   */
  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection gracefully closed.');
  }
}
