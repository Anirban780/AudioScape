import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiEndpoint } from '@prisma/client';

/**
 * ============================================================================
 * SERVICE: YOUTUBE API KEY ROTATION & QUOTA MANAGER
 * ============================================================================
 * @module TracksModule
 * 
 * PURPOSE:
 * Manages a dual YouTube API key pool (`YOUTUBE_API_KEY_A` & `YOUTUBE_API_KEY_B`)
 * with usage-based switching and automated failover.
 * 
 * STRATEGY & MATHEMATICAL BUDGET:
 * 1. Each YouTube API key has a hard daily cap of 10,000 quota units (resetting at midnight Pacific time).
 * 2. Default primary key alternates based on odd/even day of the month for even usage distribution.
 * 3. Daily threshold per key is set to 8,000 units (80% of daily quota budget).
 * 4. When the active key reaches or exceeds 8,000 units, the service dynamically switches to the secondary key.
 * 5. Telemetry logs usage per (date, endpoint, apiKeyId) into PostgreSQL table `ApiQuotaUsage`.
 * ============================================================================
 */
@Injectable()
export class YouTubeKeyManager {
  private readonly logger = new Logger(YouTubeKeyManager.name);
  private readonly QUOTA_THRESHOLD_PER_KEY = 8000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves key configuration from environment variables.
   * Supports dual pool keys (YOUTUBE_API_KEY_A, YOUTUBE_API_KEY_B) with fallback to default YOUTUBE_API_KEY.
   */
  private get keys(): { A: string; B: string } {
    const keyA = process.env.YOUTUBE_API_KEY_A || process.env.YOUTUBE_API_KEY || '';
    const keyB = process.env.YOUTUBE_API_KEY_B || process.env.YOUTUBE_API_KEY || '';
    return { A: keyA, B: keyB };
  }

  /**
   * Evaluates active key usage in PostgreSQL for today and determines the active API key.
   * 
   * @returns Active key string and key identifier ('A' | 'B')
   */
  async getActiveApiKey(): Promise<{ key: string; keyId: 'A' | 'B' }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { A: keyA, B: keyB } = this.keys;

    // Default primary key alternates based on odd/even day of month
    const defaultPrimary: 'A' | 'B' = today.getDate() % 2 === 1 ? 'A' : 'B';
    const defaultSecondary: 'A' | 'B' = defaultPrimary === 'A' ? 'B' : 'A';

    try {
      // Query current quota usage for today grouped by keyId
      const usageRecords = await this.prisma.apiQuotaUsage.groupBy({
        by: ['apiKeyId'],
        where: { date: today },
        _sum: { unitsConsumed: true },
      });

      const usageMap: Record<'A' | 'B', number> = { A: 0, B: 0 };
      for (const rec of usageRecords) {
        if (rec.apiKeyId === 'A' || rec.apiKeyId === 'B') {
          usageMap[rec.apiKeyId] = rec._sum.unitsConsumed || 0;
        }
      }

      // Check if primary key is within safe threshold
      if (usageMap[defaultPrimary] < this.QUOTA_THRESHOLD_PER_KEY) {
        return {
          key: defaultPrimary === 'A' ? keyA : keyB,
          keyId: defaultPrimary,
        };
      }

      // Primary key reached threshold, check secondary key
      if (usageMap[defaultSecondary] < this.QUOTA_THRESHOLD_PER_KEY) {
        this.logger.warn(
          `Primary YouTube API Key (${defaultPrimary}) reached quota threshold (${usageMap[defaultPrimary]} units). Switching to Secondary Key (${defaultSecondary}).`,
        );
        return {
          key: defaultSecondary === 'A' ? keyA : keyB,
          keyId: defaultSecondary,
        };
      }

      // Both keys reached threshold
      this.logger.error(
        `CRITICAL: Both YouTube API Keys have reached quota threshold (Key A: ${usageMap['A']}, Key B: ${usageMap['B']}). Serving cache-only fallback mode.`,
      );
      return {
        key: defaultPrimary === 'A' ? keyA : keyB,
        keyId: defaultPrimary,
      };
    } catch (err: any) {
      this.logger.warn(`Failed to fetch quota usage from DB: ${err.message}. Using default primary key '${defaultPrimary}'.`);
      return {
        key: defaultPrimary === 'A' ? keyA : keyB,
        keyId: defaultPrimary,
      };
    }
  }

  /**
   * Records YouTube API quota consumption into PostgreSQL `ApiQuotaUsage` table.
   * 
   * @param endpoint - API endpoint enum value
   * @param units - Number of quota units consumed by the call (e.g. 100 for search.list, 1 for videos.list)
   * @param keyId - Key identifier ('A' or 'B') used for the API call
   */
  async recordQuotaUsage(endpoint: ApiEndpoint, units: number, keyId: 'A' | 'B' = 'A'): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.apiQuotaUsage.upsert({
        where: {
          date_endpoint_apiKeyId: {
            date: today,
            endpoint,
            apiKeyId: keyId,
          },
        },
        update: {
          unitsConsumed: { increment: units },
          callCount: { increment: 1 },
        },
        create: {
          date: today,
          endpoint,
          apiKeyId: keyId,
          unitsConsumed: units,
          callCount: 1,
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record API quota usage: ${err.message}`);
    }
  }
}
