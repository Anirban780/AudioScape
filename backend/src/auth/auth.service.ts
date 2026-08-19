import { Injectable, Logger, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

/**
 * ============================================================================
 * AUTHENTICATION SERVICE: DIRECT GOOGLE OAUTH 2.0 PIPELINE
 * ============================================================================
 * @module AuthModule
 * 
 * WHAT THIS FILE DOES:
 * Core authentication service executing Google ID Token verification directly with
 * Google OAuth 2.0 servers using `google-auth-library` and synchronizing user profiles in PostgreSQL via Prisma.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Single Sign-On (SSO): Uses Google ID Tokens as the primary authorization mechanism.
 * - Automatic Account Linking: Matches existing user records by `email` and links Google `sub` as `authId`.
 * ============================================================================
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(private readonly prisma: PrismaService) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  /**
   * Cryptographically verifies Google ID Token and upserts user record in PostgreSQL.
   *
   * @param idToken - Raw Google OAuth 2.0 ID Token string from client
   * @returns Synchronized user record from PostgreSQL
   */
  async verifyAndSyncGoogleUser(idToken: string) {
    try {
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

      this.logger.log(`Google OAuth verified for: ${email} (${googleId})`);

      // Match existing user by email or authId
      let user = await this.prisma.user.findFirst({
        where: { OR: [{ email }, { authId: googleId }] },
      });

      if (user) {
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

      return {
        message: 'Google OAuth authentication successful',
        user,
      };
    } catch (error: any) {
      this.logger.error(`Google token verification failed: ${error.message}`);
      throw new UnauthorizedException(`Google Authentication failed: ${error.message}`);
    }
  }

  /**
   * Retrieves full user profile with recent playlists and listen history by PostgreSQL UUID.
   *
   * @param userId - Internal PostgreSQL user UUID
   * @returns User record joined with relations
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
