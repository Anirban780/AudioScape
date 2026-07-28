import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

/**
 * ============================================================================
 * NESTJS MODULE: AUTHENTICATION MODULE
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Encapsulates all authentication infrastructure, services, controllers, and passport strategies.
 * Registers and configures `PassportModule` and `JwtModule` globally for the application.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Encapsulation & Reusability: Exports `AuthService` and `JwtAuthGuard` so other feature modules
 *   (e.g., PlaylistsModule, ListenHistoryModule) can protect their endpoints with JWT authentication guards.
 * - Dynamic Configuration: Registers `JwtModule` with configurable secret key and 7-day token expiration TTL.
 * ============================================================================
 */
@Module({
  imports: [
    // Configure default Passport authentication strategy as JWT
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Configure dynamic JWT signing options
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'audioscape-secret-key-change-in-prod',
        signOptions: { expiresIn: '7d' }, // Access tokens valid for 7 days
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard], // Export guard & service for cross-module use
})
export class AuthModule {}
