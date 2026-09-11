import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService, resolveDatabaseUrl } from '../../prisma/prisma.service';
import * as jwt from 'jsonwebtoken';

describe('AuthService & Database Resilience Unit Tests', () => {
  let authService: AuthService;
  let mockPrismaService: any;

  const mockUser = {
    id: 'user-uuid-1234',
    authId: 'google-sub-5678',
    email: 'testuser@example.com',
    displayName: 'Test User',
    photoUrl: 'https://example.com/avatar.jpg',
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Database URL Resolution (Cloud vs Local)', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('rejects unreachable docker-internal hostnames (@postgres:5432) in cloud environments (Render)', () => {
      process.env.RENDER = 'true';
      process.env.DATABASE_URL = 'postgresql://mock_user:mock_pass@postgres:5432/audioscape?schema=public';
      process.env.NEON_DATABASE_URL = 'postgresql://mock_user:mock_pass@ep-mock-pooler.c-4.neon.tech/neondb?sslmode=require';

      const result = resolveDatabaseUrl();
      expect(result.isCloud).toBe(true);
      expect(result.connectionString).not.toContain('@postgres:5432');
      expect(result.connectionString).toContain('neon.tech');
      expect(result.isNeon).toBe(true);
    });

    it('falls back to NEON_STAGING_POOLED_URL when DATABASE_URL is docker-internal on Render', () => {
      process.env.RENDER = 'true';
      process.env.DATABASE_URL = 'postgresql://mock_user:mock_pass@postgres:5432/audioscape?schema=public';
      delete process.env.NEON_DATABASE_URL;
      process.env.NEON_STAGING_POOLED_URL = 'postgresql://mock_user:mock_pass@ep-staging-pooler.neon.tech/neondb?sslmode=require';
      delete process.env.NEON_PROD_POOLED_URL;

      const result = resolveDatabaseUrl();
      expect(result.isCloud).toBe(true);
      expect(result.connectionString).toContain('neon.tech');
      expect(result.isNeon).toBe(true);
    });

    it('uses local postgresql in local development environment', () => {
      delete process.env.RENDER;
      process.env.NODE_ENV = 'development';
      delete process.env.USE_NEON;
      process.env.DATABASE_URL = 'postgresql://mock_user:mock_pass@localhost:5432/audioscape?schema=public';

      const result = resolveDatabaseUrl();
      expect(result.isCloud).toBe(false);
      expect(result.connectionString).toContain('localhost:5432');
      expect(result.isNeon).toBe(false);
    });
  });

  describe('verifyAndSyncGoogleUser', () => {
    it('throws UnauthorizedException when neither idToken nor accessToken is supplied', async () => {
      await expect(authService.verifyAndSyncGoogleUser(undefined, undefined)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when Google token verification fails', async () => {
      // Mock verifyIdToken failure on googleClient
      jest.spyOn((authService as any).googleClient, 'verifyIdToken').mockRejectedValue(
        new Error('Invalid token signature'),
      );

      await expect(authService.verifyAndSyncGoogleUser('bad-id-token', undefined)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPrismaService.user.findFirst).not.toHaveBeenCalled();
    });

    it('throws ServiceUnavailableException (HTTP 503) instead of 401 when database is down during user sync', async () => {
      // Mock successful Google ID token verification
      jest.spyOn((authService as any).googleClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-5678',
          email: 'testuser@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
        }),
      });

      // Mock database failure (e.g. Can't reach database server at postgres)
      mockPrismaService.user.findFirst.mockRejectedValue(
        new Error("Can't reach database server at postgres:5432"),
      );

      await expect(authService.verifyAndSyncGoogleUser('valid-id-token', undefined)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('successfully verifies Google user and upserts record when DB is healthy', async () => {
      jest.spyOn((authService as any).googleClient, 'verifyIdToken').mockResolvedValue({
        getPayload: () => ({
          sub: 'google-sub-5678',
          email: 'testuser@example.com',
          name: 'Test User',
          picture: 'https://example.com/avatar.jpg',
        }),
      });

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(mockUser);

      const result = await authService.verifyAndSyncGoogleUser('valid-id-token', undefined);

      expect(result).toBeDefined();
      expect(result.message).toContain('successful');
      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });

  describe('refreshSession', () => {
    it('throws UnauthorizedException when refresh token is missing', async () => {
      await expect(authService.refreshSession('')).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when refresh token signature is invalid', async () => {
      await expect(authService.refreshSession('invalid-jwt-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws ServiceUnavailableException (HTTP 503) when database connection fails during refresh', async () => {
      const validRefreshToken = jwt.sign(
        { sub: 'user-uuid-1234', type: 'refresh' },
        (authService as any).getJwtRefreshSecret(),
        { expiresIn: '30d' },
      );

      mockPrismaService.user.findUnique.mockRejectedValue(
        new Error("Can't reach database server at postgres:5432"),
      );

      await expect(authService.refreshSession(validRefreshToken)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('refreshes session and returns fresh tokens when refresh token and DB are valid', async () => {
      const validRefreshToken = jwt.sign(
        { sub: 'user-uuid-1234', type: 'refresh' },
        (authService as any).getJwtRefreshSecret(),
        { expiresIn: '30d' },
      );

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await authService.refreshSession(validRefreshToken);

      expect(result).toBeDefined();
      expect(result.user).toEqual(mockUser);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });
  });
});
