import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Attempt Neon/Primary DATABASE_URL first, fallback to LOCAL_DATABASE_URL
    const dbUrl =
      process.env.NEON_DATABASE_URL ||
      process.env.DATABASE_URL ||
      process.env.LOCAL_DATABASE_URL ||
      'postgresql://postgres:postgrespassword@localhost:5432/audioscape?schema=public';

    super({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log(' Successfully connected to Primary PostgreSQL Database (Neon/Production)');
    } catch (primaryError: any) {
      this.logger.warn(` Primary Database connection failed: ${primaryError.message}`);
      this.logger.warn(' Attempting connection fallback to Local Docker PostgreSQL container...');

      try {
        const fallbackUrl =
          process.env.LOCAL_DATABASE_URL ||
          'postgresql://postgres:postgrespassword@localhost:5432/audioscape?schema=public';

        // Disconnect failed client before re-initializing fallback instance
        await this.$disconnect();

        const fallbackClient = new PrismaClient({
          datasources: { db: { url: fallbackUrl } },
        });

        await fallbackClient.$connect();
        this.logger.log(' Connected to Fallback Database (Local Docker PostgreSQL)');
      } catch (fallbackError: any) {
        this.logger.error(' Both Primary (Neon) and Fallback (Local Docker) database connections failed!');
        throw fallbackError;
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
