import { Controller, Get, Query, UseGuards, Logger, Req } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { YouTubeKeyManager, getPacificDate, getCalendarDate } from './youtube-key-manager';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import { OptionalAuth } from '../auth/decorators/is-cron.decorator';
import { SearchRateLimiterService, extractClientIdentifier } from './search-rate-limiter.service';

/**
 * ============================================================================
 * HTTP CONTROLLER: YOUTUBE API QUOTA & KEY ROTATION TELEMETRY
 * ============================================================================
 * @module TracksModule
 * @route `/api/admin/quota`
 * 
 * PURPOSE:
 * Exposes REST endpoints for client applications and administrators to monitor:
 * 1. Real-time YouTube Data API v3 quota consumption against daily budget (20,000 units).
 * 2. Search budget partitioning (15,000 units = 150 searches max).
 * 3. 50% Threshold active status (triggered when global searches reach 75).
 * 4. User-specific live searches remaining (max 5/day, saved in PostgreSQL).
 * 5. Countdown to official daily reset (Midnight / 12:00 AM in client local timezone).
 * 6. Dual-key rotation state between Key A and Key B.
 * 
 * PRODUCTION SAFEGUARDS:
 * - Read-Only Telemetry: Exposes aggregate metrics without exposing raw API key strings.
 * - Optional Authentication: Allows guests to view platform status without 401.
 * - Zero Quota Cost: Reads strictly from local PostgreSQL `ApiQuotaUsage` table.
 * ============================================================================
 */
@Controller('api/admin/quota')
@UseGuards(GoogleAuthGuard)
export class QuotaController {
  private readonly logger = new Logger(QuotaController.name);
  private readonly DAILY_LIMIT_PER_KEY = 10000;
  private readonly QUOTA_THRESHOLD_PER_KEY = 8000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly keyManager: YouTubeKeyManager,
    private readonly rateLimiter: SearchRateLimiterService,
  ) {}

  /**
   * Helper extracting authenticated user ID or remote client IP as a rate-limiting key.
   */
  private extractClientId(req: Request): string {
    return extractClientIdentifier(req);
  }

  /**
   * Calculates time remaining until next midnight (12:00 AM) in the client's timezone.
   * Handles local Docker containers, cloud production servers (both typically UTC),
   * and all client timezones accurately.
   */
  private getNextMidnight(clientTz: string = 'UTC'): {
    resetsAt: string;
    resetsInSeconds: number;
    localResetTime: string;
    timeZone: string;
  } {
    const now = new Date();

    let validTz = clientTz;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: clientTz });
    } catch {
      validTz = 'UTC';
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: validTz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

    const hour = getPart('hour') % 24;
    const minute = getPart('minute');
    const second = getPart('second');

    // Total seconds elapsed today in the client's timezone
    const secondsElapsedToday = hour * 3600 + minute * 60 + second;
    const resetsInSeconds = Math.max(0, 86400 - secondsElapsedToday);
    const targetDate = new Date(now.getTime() + resetsInSeconds * 1000);
    const resetsAt = targetDate.toISOString();

    // Format in 12-hour format e.g. "12:00 AM"
    const localResetTime = targetDate.toLocaleTimeString('en-US', {
      timeZone: validTz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    return {
      resetsAt,
      resetsInSeconds,
      localResetTime,
      timeZone: validTz,
    };
  }

  /**
   * Retrieves today's aggregate quota usage summary across Key A and Key B,
   * endpoint breakdowns, search budget partition, and reset countdown.
   *
   * @route GET `/api/admin/quota/today`
   */
  @Get('today')
  @OptionalAuth()
  async getTodayQuotaUsage(@Req() req: Request, @Query('tz') queryTz?: string) {
    const clientTz = queryTz || (req.headers['x-timezone'] as string) || 'UTC';
    const today = getPacificDate();

    // Default primary key based on odd/even calendar day parity in Pacific Time
    const defaultPrimary: 'A' | 'B' = today.getUTCDate() % 2 === 1 ? 'A' : 'B';

    // Query active key from YouTubeKeyManager
    let activeKeyId: 'A' | 'B' = defaultPrimary;
    try {
      const activeInfo = await this.keyManager.getActiveApiKey();
      activeKeyId = activeInfo.keyId;
    } catch (err: any) {
      this.logger.warn(`Failed to determine active key from manager: ${err.message}. Defaulting to '${defaultPrimary}'.`);
      activeKeyId = defaultPrimary;
    }

    // Query today's quota records from PostgreSQL
    const records = await this.prisma.apiQuotaUsage.findMany({
      where: { date: today },
    });

    const clientId = this.extractClientId(req);
    const userSearchStatus = await this.rateLimiter.getUserSearchStatus(clientId, clientTz);

    const summary = {
      keyA: {
        unitsConsumed: 0,
        callCount: 0,
        limit: this.DAILY_LIMIT_PER_KEY,
        threshold: this.QUOTA_THRESHOLD_PER_KEY,
        status: 'standby' as 'active' | 'standby' | 'threshold_reached',
      },
      keyB: {
        unitsConsumed: 0,
        callCount: 0,
        limit: this.DAILY_LIMIT_PER_KEY,
        threshold: this.QUOTA_THRESHOLD_PER_KEY,
        status: 'standby' as 'active' | 'standby' | 'threshold_reached',
      },
      endpoints: {
        SEARCH_LIST: { units: 0, calls: 0, costPerCall: 100 },
        VIDEOS_LIST: { units: 0, calls: 0, costPerCall: 1 },
        VIDEO_CATEGORIES_LIST: { units: 0, calls: 0, costPerCall: 1 },
      },
      totalUnitsConsumed: 0,
      totalLimit: this.DAILY_LIMIT_PER_KEY * 2, // 20,000 total daily pool
      budgetPartition: {
        searchUnits: 15000,
        otherUnits: 3000,
        emergencyUnits: 2000,
      },
      searchStatus: {
        globalSearchesMade: userSearchStatus.globalSearchesMade,
        globalSearchesLeft: userSearchStatus.globalSearchesLeft,
        globalSearchesLimit: this.rateLimiter.GLOBAL_SEARCH_LIMIT,
        searchUnitsConsumed: userSearchStatus.searchUnitsConsumed,
        isThresholdActive: userSearchStatus.isThresholdActive,
        thresholdLimit: this.rateLimiter.GLOBAL_THRESHOLD_SEARCHES,
        isGlobalCapReached: userSearchStatus.isGlobalCapReached,
        userSearchesMade: userSearchStatus.userSearchesMade,
        userSearchesLeft: userSearchStatus.userSearchesLeft,
        userSearchLimit: this.rateLimiter.MAX_PER_USER_DAY,
        canSearch: userSearchStatus.canSearch,
        clientId,
      },
      activeKey: activeKeyId,
      defaultPrimary,
      dayParity: today.getUTCDate() % 2 === 1 ? 'odd' : 'even',
      resetTime: this.getNextMidnight(clientTz),
      lastUpdated: new Date().toISOString(),

      // Backward-compatible properties for frontend components & tests
      userSearchesLeft: userSearchStatus.userSearchesLeft,
      userSearchesMade: userSearchStatus.userSearchesMade,
      globalSearchesLeft: userSearchStatus.globalSearchesLeft,
      globalSearchesMade: userSearchStatus.globalSearchesMade,
      isThresholdActive: userSearchStatus.isThresholdActive,
      canSearch: userSearchStatus.canSearch,
    };

    for (const r of records) {
      if (r.apiKeyId === 'A') {
        summary.keyA.unitsConsumed += r.unitsConsumed;
        summary.keyA.callCount += r.callCount;
      } else if (r.apiKeyId === 'B') {
        summary.keyB.unitsConsumed += r.unitsConsumed;
        summary.keyB.callCount += r.callCount;
      }

      if (summary.endpoints[r.endpoint]) {
        summary.endpoints[r.endpoint].units += r.unitsConsumed;
        summary.endpoints[r.endpoint].calls += r.callCount;
      }
      summary.totalUnitsConsumed += r.unitsConsumed;
    }

    // Determine status flags for Key A and Key B
    summary.keyA.status =
      summary.keyA.unitsConsumed >= this.QUOTA_THRESHOLD_PER_KEY
        ? 'threshold_reached'
        : activeKeyId === 'A'
        ? 'active'
        : 'standby';

    summary.keyB.status =
      summary.keyB.unitsConsumed >= this.QUOTA_THRESHOLD_PER_KEY
        ? 'threshold_reached'
        : activeKeyId === 'B'
        ? 'active'
        : 'standby';

    return summary;
  }

  /**
   * Retrieves daily aggregated quota usage history for past N days.
   *
   * @route GET `/api/admin/quota/history?days=7`
   */
  @Get('history')
  @OptionalAuth()
  async getQuotaHistory(@Query('days') days?: string) {
    const parsedDays = Math.min(90, Math.max(1, parseInt(days || '7', 10) || 7));
    const startDate = getPacificDate();
    startDate.setDate(startDate.getDate() - (parsedDays - 1));

    const records = await this.prisma.apiQuotaUsage.findMany({
      where: {
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    const dailyMap = new Map<string, {
      date: string;
      keyA: { unitsConsumed: number; callCount: number };
      keyB: { unitsConsumed: number; callCount: number };
      totalUnitsConsumed: number;
    }>();

    // Initialize all dates in range with zero usage
    for (let i = 0; i < parsedDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, {
        date: dateStr,
        keyA: { unitsConsumed: 0, callCount: 0 },
        keyB: { unitsConsumed: 0, callCount: 0 },
        totalUnitsConsumed: 0,
      });
    }

    for (const r of records) {
      const dateStr = r.date.toISOString().split('T')[0];
      const entry = dailyMap.get(dateStr);
      if (!entry) continue;

      if (r.apiKeyId === 'A') {
        entry.keyA.unitsConsumed += r.unitsConsumed;
        entry.keyA.callCount += r.callCount;
      } else if (r.apiKeyId === 'B') {
        entry.keyB.unitsConsumed += r.unitsConsumed;
        entry.keyB.callCount += r.callCount;
      }
      entry.totalUnitsConsumed += r.unitsConsumed;
    }

    return {
      requestedDays: parsedDays,
      days: Array.from(dailyMap.values()),
    };
  }
}
