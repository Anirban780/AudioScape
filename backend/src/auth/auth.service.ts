import { Injectable, Logger, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ============================================================================
 * AUTHENTICATION SERVICE: BUSINESS LOGIC & GOOGLE OAUTH PIPELINE
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Core business service managing Google OAuth token verification, user account
 * upsert/migration in PostgreSQL via Prisma, and issuing application access JWTs.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Google Cryptographic Verification: Uses official `google-auth-library` to verify 
 *   Google ID token signatures directly with Google OAuth 2.0 public keys.
 * - Zero Data Loss User Migration: Seamlessly matches backfilled Firestore/Firebase users 
 *   by their verified Google `email` address. Updates user profile metadata while keeping
 *   all existing `playlists` and `listenHistory` relational data completely intact.
 * - Isolated Business Logic: Separates DB operations and token signing from HTTP controllers.
 * ============================================================================
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    // Initialize Google OAuth2 Client with project Google Client ID from environment
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  /**
   * Verifies Google ID token from client, matches or creates user record in PostgreSQL,
   * and issues a signed application JWT.
   *
   * @param idToken - Raw Google OAuth 2.0 ID Token string from frontend client
   * @returns Object containing success message, signed application access_token, and user record
   */
  async verifyAndSyncGoogleUser(idToken: string) {
    try {
      // 1. Verify Google ID token signature and audience against Google OAuth2 endpoints
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google ID token payload: missing email claim');
      }

      const googleId = payload.sub;
      const email = payload.email;
      const displayName = payload.name || payload.given_name || 'Google User';
      const photoUrl = payload.picture || null;

      this.logger.log(`Google OAuth verified for: ${email} (Google ID: ${googleId})`);

      // 2. Query PostgreSQL to find existing user by email (matches backfilled legacy records) or authId
      let user = await this.prisma.user.findFirst({
        where: { OR: [{ email }, { authId: googleId }] },
      });

      if (user) {
        // 3a. Existing User Found: Update profile metadata and timestamp while preserving PK (id)
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            authId: user.authId || googleId,
            email,
            displayName: displayName || user.displayName,
            photoUrl: photoUrl || user.photoUrl,
            lastLoginAt: new Date(),
          },
        });
      } else {
        // 3b. New User: Create new user record in PostgreSQL database
        user = await this.prisma.user.create({
          data: {
            authId: googleId,
            email,
            displayName,
            photoUrl,
            lastLoginAt: new Date(),
          },
        });
      }

      // 4. Issue signed application access_token (7-day validity configured in AuthModule)
      const accessToken = this.jwtService.sign({
        sub: user.id,
        authId: user.authId,
        email: user.email,
      });

      return {
        message: 'Google OAuth authentication successful',
        accessToken,
        user,
      };
    } catch (error: any) {
      this.logger.error(`Google token verification failed: ${error.message}`);
      throw new UnauthorizedException(`Google Authentication failed: ${error.message}`);
    }
  }

  /**
   * Retrieves full user profile by internal PostgreSQL database UUID (`User.id`).
   * Includes recent playlists and listen history records for client hydration.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @returns Complete User profile record with relations
   */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        playlists: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        listenHistory: {
          take: 10,
          orderBy: { lastPlayedAt: 'desc' },
          include: { track: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User profile with ID '${userId}' not found in database`);
    }

    return user;
  }
}
