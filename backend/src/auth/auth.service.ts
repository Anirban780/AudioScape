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
   * Cryptographically verifies Google ID Token or Access Token and upserts user record in PostgreSQL.
   *
   * @param idToken - Optional Google ID Token string
   * @param accessToken - Optional Google Access Token string
   * @returns Synchronized user record from PostgreSQL
   */
  async verifyAndSyncGoogleUser(idToken?: string, accessToken?: string) {
    if (!idToken && !accessToken) {
      throw new UnauthorizedException('Either idToken or accessToken is required for Google login');
    }

    try {
      let googleId: string;
      let email: string;
      let displayName: string;
      let photoUrl: string | null = null;

      if (idToken) {
        const ticket = await this.googleClient.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new UnauthorizedException('Invalid Google ID token payload: missing email claim');
        }

        googleId = payload.sub;
        email = payload.email;
        displayName = payload.name || payload.given_name || 'Google User';
        photoUrl = payload.picture || null;
      } else {
        // Verify access_token against Google's tokeninfo API
        const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${accessToken}`);
        if (!tokenInfoRes.ok) {
          throw new UnauthorizedException('Invalid or expired Google Access Token');
        }

        const tokenInfo = await tokenInfoRes.json();
        googleId = tokenInfo.sub;
        email = tokenInfo.email;

        if (!email) {
          throw new UnauthorizedException('Invalid Google Access Token: missing email');
        }

        // Fetch detailed profile info from Google userinfo API
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (userInfoRes.ok) {
          const userInfo = await userInfoRes.json();
          displayName = userInfo.name || userInfo.given_name || email.split('@')[0];
          photoUrl = userInfo.picture || null;
        } else {
          displayName = email.split('@')[0];
        }
      }

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
