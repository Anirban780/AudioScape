import { Injectable, Logger, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {
    this.googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  /**
   * Verifies Google ID token from frontend, matches or creates user in PostgreSQL DB, and returns app JWT token.
   */
  async verifyAndSyncGoogleUser(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google ID token payload: missing email');
      }

      const googleId = payload.sub;
      const email = payload.email;
      const displayName = payload.name || payload.given_name || 'Google User';
      const photoUrl = payload.picture || null;

      this.logger.log(`Google OAuth authenticated: ${email} (${googleId})`);

      // 1. Search for existing user by email (matches backfilled Firestore/Firebase users)
      let user = await this.prisma.user.findFirst({
        where: { OR: [{ email }, { authId: googleId }] },
      });

      if (user) {
        // Update existing user with Google details and new login timestamp
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
        // Create brand new user
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

      // Generate App JWT Token
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
   * Retrieves user profile by internal database ID.
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
      throw new NotFoundException(`User with ID '${userId}' not found`);
    }

    return user;
  }
}
