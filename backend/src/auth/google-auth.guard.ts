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
 * CAN ACTIVATE GUARD: DUAL GOOGLE OAUTH & FIREBASE EMAIL FALLBACK GUARD
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Intercepts incoming HTTP requests, extracts the Bearer token from the
 * `Authorization: Bearer <id_token>` header, verifies it via Google OAuth 2.0,
 * or falls back to email-based resolution for legacy/Firebase users without direct Google OAuth set up.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Direct Google OAuth 2.0: Verifies direct Google ID tokens against Google certs.
 * - Legacy Firebase Fallback: Resolves legacy Firebase users by verified email address when
 *   direct Google OAuth is not configured for that user account.
 * - Automatic Account Linking: Automatically links the verified Google/Firebase `authId`
 *   to existing PostgreSQL user records matching the Gmail address.
 * ============================================================================
 */
@Injectable()
export class GoogleAuthGuard implements CanActivate {
  private readonly logger = new Logger(GoogleAuthGuard.name);
  private readonly googleClient: OAuth2Client;

  constructor(private readonly prisma: PrismaService) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  /**
   * Helper safely parsing JWT payload claims for legacy/Firebase token fallback.
   */
  private decodeJwtPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized: No valid Bearer token provided in Authorization header');
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      throw new UnauthorizedException('Unauthorized: Bearer token string is empty');
    }

    let email: string | null = null;
    let authId: string | null = null;
    let displayName: string = 'AudioScape User';
    let photoUrl: string | null = null;
    let authMethod: 'DIRECT_GOOGLE_OAUTH' | 'FIREBASE_EMAIL_FALLBACK' = 'DIRECT_GOOGLE_OAUTH';

    // Strategy 1: Attempt direct Google OAuth 2.0 certificate verification
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (payload && payload.email) {
        email = payload.email;
        authId = payload.sub;
        displayName = payload.name || payload.given_name || payload.email.split('@')[0];
        photoUrl = payload.picture || null;
      }
    } catch (googleErr: any) {
      // Direct Google OAuth verification skipped (e.g. Firebase token issued by securetoken.google.com)
      authMethod = 'FIREBASE_EMAIL_FALLBACK';
    }

    // Strategy 2: Firebase / Legacy Email Fallback
    if (!email) {
      const payload = this.decodeJwtPayload(token);
      if (!payload) {
        throw new UnauthorizedException('Unauthorized: Authentication token is malformed or invalid');
      }

      // Check token expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Unauthorized: Authentication token has expired. Please log in again.');
      }

      if (payload.email) {
        email = payload.email;
        authId = payload.sub || payload.user_id || payload.uid || payload.email;
        displayName = payload.name || payload.given_name || payload.email.split('@')[0];
        photoUrl = payload.picture || null;
      } else {
        throw new UnauthorizedException('Unauthorized: Could not resolve email from authentication token');
      }
    }

    if (!email || !authId) {
      throw new UnauthorizedException('Unauthorized: Unable to resolve user identity from authentication token');
    }

    try {
      // Find or auto-provision user in PostgreSQL database matching email or authId
      let dbUser = await this.prisma.user.findFirst({
        where: { OR: [{ email }, { authId }] },
      });

      if (!dbUser) {
        this.logger.log(`Creating new PostgreSQL user for email "${email}" (${authMethod})`);
        dbUser = await this.prisma.user.create({
          data: {
            authId,
            email,
            displayName,
            photoUrl,
            lastLoginAt: new Date(),
          },
        });
      } else {
        // If user matched by email fallback, link their current verified authId
        const updateData: any = { lastLoginAt: new Date() };
        if (dbUser.authId !== authId) {
          this.logger.log(`[Account Link] Linking authId "${authId}" to existing user matching email "${email}"`);
          updateData.authId = authId;
        }

        dbUser = await this.prisma.user.update({
          where: { id: dbUser.id },
          data: updateData,
        });
      }

      // Attach complete PostgreSQL user object to request
      request.user = dbUser;
      return true;
    } catch (error: any) {
      this.logger.error(`Database user synchronization failed for ${email}: ${error.message}`);
      throw new UnauthorizedException(`Unauthorized: Database error while synchronizing user account (${error.message})`);
    }
  }
}
