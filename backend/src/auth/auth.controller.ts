import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';

/**
 * ============================================================================
 * HTTP CONTROLLER: AUTHENTICATION ROUTING LAYER
 * ============================================================================
 * @module AuthModule
 * @route `/api/auth`
 * 
 * PURPOSE:
 * Defines REST API endpoints for user authentication, Google OAuth verification,
 * and current user profile retrieval.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Clean REST Interface: Exposes explicit, versionable routes for frontend authorization workflows.
 * - Guard Integration: Applies `JwtAuthGuard` to protected profile endpoints to prevent unauthorized access.
 * - Validation Pipeline: Connects incoming request body to `GoogleLoginDto` for automatic validation.
 * ============================================================================
 */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Public health check endpoint for AuthModule operational status.
   * @route GET `/api/auth/status`
   */
  @Get('status')
  getAuthStatus() {
    return {
      status: 'Google OAuth module operational',
      authMethod: 'Google OAuth 2.0',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Primary authentication endpoint for client Google Sign-In button flow.
   * @route POST `/api/auth/google`
   * @param dto - GoogleLoginDto containing validated idToken string
   */
  @Post('google')
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.verifyAndSyncGoogleUser(dto.idToken);
  }

  /**
   * Protected endpoint retrieving current authenticated user profile and recent history.
   * @route GET `/api/auth/me`
   * @header Authorization Bearer <accessToken>
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@GetUser('id') userId: string) {
    return this.authService.getUserProfile(userId);
  }
}
