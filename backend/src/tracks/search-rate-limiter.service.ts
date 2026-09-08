import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

/**
 * ============================================================================
 * SERVICE: SEARCH RATE LIMITER SERVICE (search-rate-limiter.service.ts)
 * ============================================================================
 * @module TracksModule
 * 
 * WHAT THIS FILE DOES:
 * Enforces dual-tiered sliding-window rate limiting on live YouTube Data API searches:
 * 1. Minute Limit: Maximum 3 live searches per 60-second rolling window per user/IP.
 * 2. Daily Limit: Maximum 20 live searches per 24-hour rolling window per user/IP.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * - Quota Preservation: Each live YouTube search consumes 100 quota units. Unrestricted
 *   searches can exhaust daily API quotas (10,000 units) in just 100 queries.
 * - Cache-Aware Exemption: Local PostgreSQL FTS and relational page cache hits consume
 *   ZERO quota and are completely exempt from rate limiting.
 * - Sliding Window: Prevents burst attacks across minute or midnight boundaries.
 * - Standard Headers: Returns RFC-compliant RateLimit-Limit, RateLimit-Remaining,
 *   RateLimit-Reset, and Retry-After HTTP headers.
 * ============================================================================
 */
@Injectable()
export class SearchRateLimiterService {
  private readonly logger = new Logger(SearchRateLimiterService.name);

  // Configuration
  private readonly MAX_PER_MINUTE = 3;
  private readonly MINUTE_WINDOW_MS = 60 * 1000;

  private readonly MAX_PER_DAY = 20;
  private readonly DAY_WINDOW_MS = 24 * 60 * 60 * 1000;

  // In-memory timestamps store: clientId -> array of epoch millisecond timestamps
  private readonly requestTimestamps = new Map<string, number[]>();

  constructor() {
    // Periodic garbage collection every 10 minutes to prevent memory leaks
    setInterval(() => this.cleanupExpiredEntries(), 10 * 60 * 1000).unref();
  }

  /**
   * Checks whether the client has exceeded rate limits for a live YouTube API call.
   * If limits are exceeded, attaches rate limit headers to the response and throws 429.
   * If allowed, records the timestamp and attaches remaining rate limit headers.
   *
   * @param clientId - Client identifier (user:UUID or ip:ADDRESS)
   * @param res - Optional Express response object to set headers on
   */
  checkAndConsume(clientId: string, res?: Response): void {
    const now = Date.now();
    const timestamps = this.getCleanTimestamps(clientId, now);

    // 1. Evaluate Minute Window (Rolling 60 seconds)
    const minuteThreshold = now - this.MINUTE_WINDOW_MS;
    const recentMinute = timestamps.filter((ts) => ts > minuteThreshold);

    if (recentMinute.length >= this.MAX_PER_MINUTE) {
      const oldestMinute = recentMinute[0];
      const resetSeconds = Math.max(1, Math.ceil((oldestMinute + this.MINUTE_WINDOW_MS - now) / 1000));

      this.logger.warn(`Live search minute rate limit (3/min) exceeded for: ${clientId}`);
      if (res) {
        res.setHeader('Retry-After', resetSeconds);
        res.setHeader('RateLimit-Limit', this.MAX_PER_MINUTE);
        res.setHeader('RateLimit-Remaining', 0);
        res.setHeader('RateLimit-Reset', resetSeconds);
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Live search rate limit exceeded: Maximum ${this.MAX_PER_MINUTE} live searches per minute. Please try again in ${resetSeconds} seconds. Cached database tracks remain available.`,
          retryAfter: resetSeconds,
          limitType: 'minute',
          limit: this.MAX_PER_MINUTE,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Evaluate Day Window (Rolling 24 hours)
    if (timestamps.length >= this.MAX_PER_DAY) {
      const oldestDay = timestamps[0];
      const resetSeconds = Math.max(1, Math.ceil((oldestDay + this.DAY_WINDOW_MS - now) / 1000));

      this.logger.warn(`Live search daily quota limit (20/day) reached for: ${clientId}`);
      if (res) {
        res.setHeader('Retry-After', resetSeconds);
        res.setHeader('RateLimit-Limit', this.MAX_PER_DAY);
        res.setHeader('RateLimit-Remaining', 0);
        res.setHeader('RateLimit-Reset', resetSeconds);
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Daily live search limit reached: Maximum ${this.MAX_PER_DAY} live searches per day. Please try again tomorrow. Cached database tracks remain available.`,
          retryAfter: resetSeconds,
          limitType: 'day',
          limit: this.MAX_PER_DAY,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. Consume quota unit and record current timestamp
    timestamps.push(now);
    this.requestTimestamps.set(clientId, timestamps);

    const remainingMinute = Math.max(0, this.MAX_PER_MINUTE - (recentMinute.length + 1));
    const remainingDay = Math.max(0, this.MAX_PER_DAY - timestamps.length);

    if (res) {
      res.setHeader('RateLimit-Limit', this.MAX_PER_MINUTE);
      res.setHeader('RateLimit-Remaining', remainingMinute);
      res.setHeader('RateLimit-Reset', 60);
      res.setHeader('RateLimit-Daily-Remaining', remainingDay);
    }
  }

  /**
   * Helper cleaning expired timestamps for a client older than 24 hours.
   */
  private getCleanTimestamps(clientId: string, now: number): number[] {
    const existing = this.requestTimestamps.get(clientId) || [];
    const dayThreshold = now - this.DAY_WINDOW_MS;
    const clean = existing.filter((ts) => ts > dayThreshold);
    this.requestTimestamps.set(clientId, clean);
    return clean;
  }

  /**
   * Memory cleanup removing all entries whose timestamps have all expired.
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const dayThreshold = now - this.DAY_WINDOW_MS;
    let purged = 0;

    for (const [clientId, timestamps] of this.requestTimestamps.entries()) {
      const active = timestamps.filter((ts) => ts > dayThreshold);
      if (active.length === 0) {
        this.requestTimestamps.delete(clientId);
        purged++;
      } else {
        this.requestTimestamps.set(clientId, active);
      }
    }

    if (purged > 0) {
      this.logger.debug(`Purged ${purged} expired client rate limit records from memory`);
    }
  }
}
