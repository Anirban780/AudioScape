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
 * CAN ACTIVATE GUARD: DIRECT GOOGLE OAUTH 2.0 GUARD
 * ============================================================================
 * @module AuthModule
 * 
 * WHAT THIS FILE DOES:
 * Intercepts incoming HTTP requests, extracts the Bearer token from the
 * `Authorization: Bearer <id_token>` header, verifies it directly against Google OAuth 2.0
 * servers using `google-auth-library`, and synchronizes/attaches the PostgreSQL user record.
 *
 * WHY THIS WAS SIMPLIFIED (Component 2):
 * 1. Single Auth Path: Removed legacy Firebase JWT decoding fallbacks. All client
 *    requests now pass direct Google OAuth 2.0 ID tokens.
 * 2. Automatic Legacy Account Linking: Matches existing users by `email` first, automatically
 *    updating the user's `authId` to their verified Google `sub` claim on first login.
 * 3. High Efficiency: Reduces guard logic complexity and eliminates unverified JWT decoding.
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

    let email: string;
    let authId: string;
    let displayName: string;
    let photoUrl: string | null = null;

    // Cryptographically verify direct Google OAuth 2.0 ID token
    try {
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
    } catch (googleErr: any) {
      this.logger.error(`Google token verification failed in guard: ${googleErr.message}`);
      throw new UnauthorizedException(`Unauthorized: Google OAuth verification failed (${googleErr.message})`);
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
