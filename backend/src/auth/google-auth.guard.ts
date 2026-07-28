import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ============================================================================
 * CAN ACTIVATE GUARD: DIRECT GOOGLE OAUTH ID TOKEN GUARD
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Directly intercepts incoming HTTP requests, extracts the Google OAuth ID Token from the
 * `Authorization: Bearer <google_id_token>` header, cryptographically verifies it with Google APIs,
 * and attaches the synchronized PostgreSQL `User` record to `request.user`.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Direct Google Verification: Eliminates secondary custom JWT generation and secret key management.
 * - Single Source of Truth: Uses Google's official public keys to verify token validity, expiration, and audience.
 * - Automatic User Synchronization: Ensures the database user profile is loaded for downstream controllers.
 *
 * HOW IT WORKS:
 * 1. Extract Bearer token from HTTP request `Authorization` header.
 * 2. Call Google `OAuth2Client.verifyIdToken({ idToken, audience })`.
 * 3. Match Google verified `email` or `googleId` against PostgreSQL `User` table.
 * 4. Attach PostgreSQL user object to `request.user` for controller injection via `@GetUser()`.
 * ============================================================================
 */
@Injectable()
export class GoogleAuthGuard implements CanActivate {
  private readonly logger = new Logger(GoogleAuthGuard.name);
  private readonly googleClient: OAuth2Client;

  constructor(private readonly prisma: PrismaService) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized: No valid Bearer Google ID Token provided in Authorization header');
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      throw new UnauthorizedException('Unauthorized: Bearer token string is empty');
    }

    try {
      // Cryptographically verify Google ID Token directly against Google OAuth certificates
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Unauthorized: Invalid Google ID token payload (missing email)');
      }

      const googleId = payload.sub;
      const email = payload.email;

      // Find user in PostgreSQL database matching email or Google authId
      let dbUser = await this.prisma.user.findFirst({
        where: { OR: [{ email }, { authId: googleId }] },
      });

      if (!dbUser) {
        // Auto-provision user in PostgreSQL if first time request
        dbUser = await this.prisma.user.create({
          data: {
            authId: googleId,
            email,
            displayName: payload.name || payload.given_name || 'Google User',
            photoUrl: payload.picture || null,
            lastLoginAt: new Date(),
          },
        });
      }

      // Attach complete PostgreSQL user object to request
      request.user = dbUser;
      return true;
    } catch (error: any) {
      this.logger.error(`Direct Google ID token verification failed: ${error.message}`);
      throw new UnauthorizedException(`Unauthorized: Google Token Verification Failed (${error.message})`);
    }
  }
}
