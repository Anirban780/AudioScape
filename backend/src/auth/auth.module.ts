import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleAuthGuard } from './google-auth.guard';

/**
 * ============================================================================
 * NESTJS MODULE: AUTHENTICATION MODULE
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Encapsulates Google OAuth 2.0 verification and user synchronization.
 * Exports `AuthService` and `GoogleAuthGuard` globally for cross-module endpoint protection.
 * ============================================================================
 */
@Module({
  controllers: [AuthController],
  providers: [AuthService, GoogleAuthGuard],
  exports: [AuthService, GoogleAuthGuard],
})
export class AuthModule {}
