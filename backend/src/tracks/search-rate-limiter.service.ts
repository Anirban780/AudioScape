import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import { ApiEndpoint } from '@prisma/client';
import { getPacificDate, getCalendarDate } from './youtube-key-manager';

/**
 * Extracts client timezone from query param 'tz' or header 'x-timezone',
 * validating against IANA standard timezones with fallback to 'UTC'.
 */
export function extractClientTimezone(req?: Request): string {
  const raw = (req?.query?.tz as string) || (req?.headers?.['x-timezone'] as string) || 'UTC';
  try {
    Intl.DateTimeFormat(undefined, { timeZone: raw });
    return raw;
  } catch {
    return 'UTC';
  }
}

/**
 * Extracts client identifier, preferring user email (e.g. user:john@example.com),
 * then user subject/UUID, and falling back to IP address (e.g. ip:1.2.3.4).
 */
export function extractClientIdentifier(req: Request): string {
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split('Bearer ')[1]?.trim();
    if (token) {
      try {
        const decoded = jwt.decode(token) as any;
        if (decoded?.email) {
          return `user:${decoded.email}`;
        }
        if (decoded?.sub) {
          return `user:${decoded.sub}`;
        }
      } catch {
        // Fall through to IP extraction
      }
    }
  }

  const forwarded = req.headers ? req.headers['x-forwarded-for'] : undefined;
  const rawIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : Array.isArray(forwarded)
    ? forwarded[0]
    : req.ip || req.socket?.remoteAddress || '127.0.0.1';

  return `ip:${rawIp}`;
}

/**
 * ============================================================================
 * SERVICE: SEARCH RATE LIMITER SERVICE (search-rate-limiter.service.ts)
 * ============================================================================
 * @module TracksModule
 * 
 * WHAT THIS FILE DOES:
 * Enforces multi-tier rate limiting and budget partitioning on live YouTube Data API searches:
 * 1. Minute Limit (In-Memory Sliding Window): Max 3 live searches per 60s window per client.
 * 2. Daily User Limit (Persistent PostgreSQL): Max 5 live searches per day per user/IP.
 * 3. Global Budget Partitioning: 15,000 units strictly allocated for searches (150 searches max).
 * 4. 50% Threshold Protection: When global live searches reach >= 75 (7,500 units),
 *    the system strictly enforces the 5-search per user limit.
 * 5. Global Exhaustion Ceiling: When global live searches reach >= 150 (15,000 units),
 *    live YouTube search is completely blocked platform-wide.
 * 6. Database Exemption: PostgreSQL full-text and page cache queries consume 0 quota and are exempt.
 * ============================================================================
 */
@Injectable()
export class SearchRateLimiterService {
  private readonly logger = new Logger(SearchRateLimiterService.name);

  // Configuration & Budget Partitioning
  readonly MAX_PER_MINUTE = 3;
  private readonly MINUTE_WINDOW_MS = 60 * 1000;

  readonly MAX_PER_USER_DAY = 5;
  readonly SEARCH_BUDGET_UNITS = 15000;
  readonly GLOBAL_SEARCH_LIMIT = 150; // 15,000 units / 100 units per search
  readonly GLOBAL_THRESHOLD_SEARCHES = 75; // 50% of 15,000 unit budget (7,500 units)

  // In-memory timestamps store for minute burst rate limiting: clientId -> array of epoch millisecond timestamps
  private readonly requestTimestamps = new Map<string, number[]>();

  constructor(private readonly prisma: PrismaService) {
    // Periodic garbage collection every 10 minutes to prevent memory leaks in minute-limiter cache
    setInterval(() => this.cleanupExpiredMinuteEntries(), 10 * 60 * 1000).unref();
  }

  /**
   * Evaluates live YouTube search rate limits and persists search consumption to PostgreSQL.
   * Throws HTTP 429 if minute burst limit, user daily limit, or global quota ceiling is exceeded.
   *
   * @param clientId - Client identifier (user:email, user:UUID, or ip:ADDRESS)
   * @param res - Optional Express response object to attach RateLimit headers
   */
  async checkAndConsume(
    clientId: string,
    res?: Response,
    clientTz?: string,
  ): Promise<void> {
    const now = Date.now();
    const timestamps = (this.requestTimestamps.get(clientId) || []).filter(
      (ts) => now - ts < this.MINUTE_WINDOW_MS,
    );

    // 1. MINUTE BURST LIMIT (In-memory sliding window, max 3 searches/min)
    if (timestamps.length >= this.MAX_PER_MINUTE) {
      const oldestTimestamp = timestamps[0];
      const resetSeconds = Math.max(1, Math.ceil((this.MINUTE_WINDOW_MS - (now - oldestTimestamp)) / 1000));

      this.logger.warn(`Live search burst limit exceeded for: ${clientId} (${timestamps.length}/${this.MAX_PER_MINUTE} in 60s)`);
      if (res) {
        res.setHeader('Retry-After', resetSeconds);
        res.setHeader('RateLimit-Limit', this.MAX_PER_MINUTE);
        res.setHeader('RateLimit-Remaining', 0);
        res.setHeader('RateLimit-Reset', resetSeconds);
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'BURST_RATE_LIMIT_EXCEEDED',
          message: `Live search rate limit exceeded: Maximum ${this.MAX_PER_MINUTE} live searches per minute. Please try again in ${resetSeconds} seconds. Cached database tracks remain available.`,
          retryAfter: resetSeconds,
          limitType: 'minute',
          limit: this.MAX_PER_MINUTE,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const tz = clientTz || extractClientTimezone(res?.req as Request);
    const clientDate = getCalendarDate(tz);
    const today = getPacificDate();

    // 2. Query Global Live Searches Consumption from PostgreSQL `api_quota_usage`
    let globalSearchesToday = 0;
    try {
      const quotaRecords = await this.prisma.apiQuotaUsage.findMany({
        where: { date: today, endpoint: ApiEndpoint.SEARCH_LIST },
      });
      globalSearchesToday = quotaRecords.reduce((sum, r) => sum + r.callCount, 0);
    } catch (dbErr: any) {
      this.logger.warn(`Failed to query global search quota from DB: ${dbErr.message}`);
    }

    // 3. Evaluate Global Search Ceiling (150 searches / 15,000 units)
    if (globalSearchesToday >= this.GLOBAL_SEARCH_LIMIT) {
      this.logger.error(`CRITICAL: Global YouTube search quota exhausted for today (${globalSearchesToday}/${this.GLOBAL_SEARCH_LIMIT} calls).`);
      if (res) {
        res.setHeader('Retry-After', 3600);
        res.setHeader('RateLimit-Daily-Remaining', 0);
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'GLOBAL_SEARCH_CAP_REACHED',
          message: 'Global daily YouTube search quota (150 searches / 15,000 units) has been reached for today. Cached database tracks remain available.',
          limitType: 'global',
          globalSearchesToday,
          globalSearchLimit: this.GLOBAL_SEARCH_LIMIT,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 4. Query Persistent User Daily Search Count from PostgreSQL `user_daily_searches` (aligned with client date)
    let userSearchesToday = 0;
    try {
      const userRecord = await this.prisma.userDailySearch.findUnique({
        where: {
          identifier_date: {
            identifier: clientId,
            date: clientDate,
          },
        },
      });
      userSearchesToday = userRecord?.searchCount || 0;
    } catch (dbErr: any) {
      this.logger.warn(`Failed to read user daily searches for ${clientId}: ${dbErr.message}`);
    }

    const isThresholdActive = globalSearchesToday >= this.GLOBAL_THRESHOLD_SEARCHES;

    // 5. Evaluate User Daily Search Limit (5 searches/day, strictly enforced, especially when >= 50% threshold is active)
    if (userSearchesToday >= this.MAX_PER_USER_DAY) {
      this.logger.warn(
        `Live search daily quota limit (${this.MAX_PER_USER_DAY}/day) reached for: ${clientId} (Global: ${globalSearchesToday}, 50% Threshold Active: ${isThresholdActive})`,
      );
      if (res) {
        res.setHeader('Retry-After', 3600);
        res.setHeader('RateLimit-Limit', this.MAX_PER_USER_DAY);
        res.setHeader('RateLimit-Remaining', 0);
        res.setHeader('RateLimit-Reset', 3600);
        res.setHeader('RateLimit-Daily-Remaining', 0);
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'USER_SEARCH_LIMIT_EXCEEDED',
          message: `Daily live search limit reached: Maximum ${this.MAX_PER_USER_DAY} live searches per day. Please try again tomorrow. Cached database tracks remain available.`,
          limitType: 'day',
          limit: this.MAX_PER_USER_DAY,
          current: userSearchesToday,
          isThresholdActive,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 6. Consume & Persist: Update PostgreSQL `user_daily_searches` and in-memory minute burst tracker
    try {
      await this.prisma.userDailySearch.upsert({
        where: {
          identifier_date: {
            identifier: clientId,
            date: clientDate,
          },
        },
        update: {
          searchCount: { increment: 1 },
        },
        create: {
          identifier: clientId,
          date: clientDate,
          searchCount: 1,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record user search in DB for ${clientId}: ${err.message}`);
    }

    timestamps.push(now);
    this.requestTimestamps.set(clientId, timestamps);

    const remainingMinute = Math.max(0, this.MAX_PER_MINUTE - timestamps.length);
    const remainingDay = Math.max(0, this.MAX_PER_USER_DAY - (userSearchesToday + 1));

    if (res) {
      res.setHeader('RateLimit-Limit', this.MAX_PER_MINUTE);
      res.setHeader('RateLimit-Remaining', remainingMinute);
      res.setHeader('RateLimit-Reset', 60);
      res.setHeader('RateLimit-Daily-Remaining', remainingDay);
    }
  }

  /**
   * Retrieves comprehensive search telemetry for a client from PostgreSQL.
   */
  async getUserSearchStatus(clientId: string, clientTz: string = 'UTC') {
    const today = getPacificDate();
    const clientDate = getCalendarDate(clientTz);

    let globalSearchesMade = 0;
    try {
      const quotaRecords = await this.prisma.apiQuotaUsage.findMany({
        where: { date: today, endpoint: ApiEndpoint.SEARCH_LIST },
      });
      globalSearchesMade = quotaRecords.reduce((sum, r) => sum + r.callCount, 0);
    } catch (dbErr: any) {
      this.logger.warn(`Failed to fetch global search quota: ${dbErr.message}`);
    }

    const globalSearchesLeft = Math.max(0, this.GLOBAL_SEARCH_LIMIT - globalSearchesMade);
    const isThresholdActive = globalSearchesMade >= this.GLOBAL_THRESHOLD_SEARCHES;
    const isGlobalCapReached = globalSearchesMade >= this.GLOBAL_SEARCH_LIMIT;

    let userSearchesMade = 0;
    try {
      const userRecord = await this.prisma.userDailySearch.findUnique({
        where: {
          identifier_date: {
            identifier: clientId,
            date: clientDate,
          },
        },
      });
      userSearchesMade = userRecord?.searchCount || 0;
    } catch (dbErr: any) {
      this.logger.warn(`Failed to fetch user searches for ${clientId}: ${dbErr.message}`);
    }

    let userSearchesLeft = Math.max(0, this.MAX_PER_USER_DAY - userSearchesMade);
    if (isGlobalCapReached) {
      userSearchesLeft = 0;
    }

    return {
      userSearchesMade,
      userSearchesLeft,
      globalSearchesMade,
      globalSearchesLeft,
      searchUnitsConsumed: globalSearchesMade * 100,
      searchBudgetUnits: this.SEARCH_BUDGET_UNITS,
      isThresholdActive,
      isGlobalCapReached,
      canSearch: userSearchesLeft > 0 && !isGlobalCapReached,
    };
  }

  /**
   * Helper returning clean timestamps within the rolling 60-second minute window.
   */
  private getCleanMinuteTimestamps(clientId: string, now: number): number[] {
    const existing = this.requestTimestamps.get(clientId) || [];
    const minuteThreshold = now - this.MINUTE_WINDOW_MS;
    const clean = existing.filter((ts) => ts > minuteThreshold);
    this.requestTimestamps.set(clientId, clean);
    return clean;
  }

  /**
   * Memory cleanup purging expired minute burst cache entries.
   */
  private cleanupExpiredMinuteEntries(): void {
    const now = Date.now();
    const minuteThreshold = now - this.MINUTE_WINDOW_MS;
    let purged = 0;

    for (const [clientId, timestamps] of this.requestTimestamps.entries()) {
      const active = timestamps.filter((ts) => ts > minuteThreshold);
      if (active.length === 0) {
        this.requestTimestamps.delete(clientId);
        purged++;
      } else {
        this.requestTimestamps.set(clientId, active);
      }
    }

    if (purged > 0) {
      this.logger.debug(`Purged ${purged} expired client minute burst records from memory`);
    }
  }
}
