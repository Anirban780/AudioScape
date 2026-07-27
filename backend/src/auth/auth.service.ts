import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SyncUserDto } from './dto/sync-user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts authenticated Firebase user into PostgreSQL users table.
   */
  async syncUser(dto: SyncUserDto) {
    const { authId, email, displayName, photoUrl } = dto;

    this.logger.log(`Syncing user with authId: ${authId} into PostgreSQL`);

    const user = await this.prisma.user.upsert({
      where: { authId },
      update: {
        email,
        displayName,
        photoUrl,
        lastLoginAt: new Date(),
      },
      create: {
        authId,
        email,
        displayName,
        photoUrl,
        lastLoginAt: new Date(),
      },
    });

    return {
      message: 'User synchronized successfully',
      user,
    };
  }

  /**
   * Fetches user profile by Firebase authId from PostgreSQL database.
   */
  async getUserProfile(authId: string) {
    const user = await this.prisma.user.findUnique({
      where: { authId },
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
      throw new NotFoundException(`User with authId '${authId}' not found in PostgreSQL database`);
    }

    return user;
  }
}
