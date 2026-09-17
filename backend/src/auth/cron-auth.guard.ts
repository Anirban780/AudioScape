import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

/**
 * ============================================================================
 * CRON AUTHENTICATION GUARD (cron-auth.guard.ts)
 * ============================================================================
 * @module AuthModule
 * 
 * WHAT THIS FILE DOES:
 * Protects platform background maintenance and cache pre-warming endpoints
 * (e.g. `/api/music/cron/*`) against unauthorized public access and quota-drain attacks.
 * 
 * WHY IT WAS DESIGNED THIS WAY:
 * 1. Exploit Remediation: Closes the previous unauthenticated path bypass in `GoogleAuthGuard`
 *    where any client could send unlimited requests to `/cron/*`.
 * 2. Cryptographic Token Validation: Requires `Authorization: Bearer <CRON_SECRET>`
 *    matching the server's configured environment variable.
 * 3. Timing-Safe Comparison: Guards against timing attack hazards when evaluating secrets.
 * ============================================================================
 */
@Injectable()
export class CronAuthGuard implements CanActivate {
  private readonly logger = new Logger(CronAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || request.headers['x-cron-secret'];
    const configuredSecret = process.env.CRON_SECRET;

    if (!configuredSecret) {
      this.logger.error('CRON_SECRET is not configured in backend environment variables. Rejecting cron request.');
      throw new UnauthorizedException('Cron execution disabled: Server missing CRON_SECRET configuration');
    }

    let token: string | undefined;

    if (authHeader && typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split('Bearer ')[1]?.trim();
      } else {
        token = authHeader.trim();
      }
    }

    let isValid = false;
    if (token) {
      try {
        const bufA = Buffer.from(token);
        const bufB = Buffer.from(configuredSecret);
        if (bufA.length === bufB.length) {
          const crypto = require('crypto');
          isValid = crypto.timingSafeEqual(bufA, bufB);
        }
      } catch {
        isValid = false;
      }
    }

    if (!isValid) {
      const clientIp = request.ip || request.headers['x-forwarded-for'] || 'unknown';
      this.logger.warn(`Unauthorized cron attempt blocked from IP: ${clientIp} on path: ${request.path}`);
      throw new UnauthorizedException('Unauthorized: Invalid or missing Cron Authorization Header');
    }

    return true;
  }
}
