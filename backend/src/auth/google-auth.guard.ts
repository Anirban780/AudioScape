import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ============================================================================
 * CAN ACTIVATE GUARD: SERVER JWT & GOOGLE OAUTH GUARD
 * ============================================================================
 * @module AuthModule
 * 
 * WHAT THIS FILE DOES:
 * Intercepts incoming HTTP requests, extracts the Bearer token from the
 * `Authorization: Bearer <token>` header, first verifies server-issued JWT access tokens
 * locally, and falls back to Google OAuth verification when raw Google tokens are passed.
 * ============================================================================
 */
@Injectable()
export class GoogleAuthGuard implements CanActivate {
  private readonly logger = new Logger(GoogleAuthGuard.name);
  private readonly googleClient: OAuth2Client;

  constructor(private readonly prisma: PrismaService) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  private getJwtSecret(): string {
    return process.env.JWT_SECRET || 'audioscape_jwt_secret_key_default';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // Allow background cron pre-warming endpoints to be called by platform schedulers
    if (request.path && request.path.includes('/cron/')) {
      return true;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized: No valid Bearer token provided in Authorization header');
    }

    const token = authHeader.split('Bearer ')[1]?.trim();
    if (!token) {
      throw new UnauthorizedException('Unauthorized: Bearer token string is empty');
    }

    // 1. First attempt verifying as a Server-Issued JWT Access Token (Fastest & Stateless)
    try {
      const decoded = jwt.verify(token, this.getJwtSecret()) as any;
      if (decoded && decoded.sub) {
        const dbUser = await this.prisma.user.findUnique({
          where: { id: decoded.sub },
        });

        if (dbUser) {
          request.user = dbUser;
          return true;
        }
      }
    } catch {
      // Token is not a valid server-issued JWT; fallback to Google OAuth verification below
    }

    // 2. Fallback: Cryptographically verify direct Google OAuth 2.0 ID token or Access Token
    let email: string;
    let authId: string;
    let displayName: string;
    let photoUrl: string | null = null;

    try {
      if (token.split('.').length === 3) {
        // ID Token (JWT)
        const ticket = await this.googleClient.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new UnauthorizedException('Unauthorized: Invalid Google ID token payload (missing email)');
        }

        email = payload.email;
        authId = payload.sub;
        displayName = payload.name || payload.given_name || payload.email.split('@')[0];
        photoUrl = payload.picture || null;
      } else {
        // Access Token
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
        if (!response.ok) {
          throw new UnauthorizedException('Unauthorized: Invalid or expired Google access token');
        }
        const tokenInfo = await response.json();
        email = tokenInfo.email;
        authId = tokenInfo.sub;

        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (userRes.ok) {
          const userInfo = await userRes.json();
          displayName = userInfo.name || userInfo.given_name || email.split('@')[0];
          photoUrl = userInfo.picture || null;
        } else {
          displayName = email.split('@')[0];
        }
      }
    } catch (googleErr: any) {
      this.logger.error(`Google token verification failed in guard: ${googleErr.message}`);
      throw new UnauthorizedException(`Unauthorized: OAuth verification failed (${googleErr.message})`);
    }

    try {
      // Find or auto-provision user in PostgreSQL database matching email or authId
      let dbUser = await this.prisma.user.findFirst({
        where: { OR: [{ email }, { authId }] },
      });

      if (!dbUser) {
        this.logger.log(`Creating new PostgreSQL user for email "${email}" (Google OAuth 2.0)`);
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
        // If existing user was found by email, link their current verified Google sub authId
        const updateData: any = { lastLoginAt: new Date() };
        if (dbUser.authId !== authId) {
          this.logger.log(`[Account Link] Linking Google authId "${authId}" to existing user matching email "${email}"`);
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
