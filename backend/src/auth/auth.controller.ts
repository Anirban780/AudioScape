import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { GoogleAuthGuard } from './google-auth.guard';
import { GetUser } from './decorators/get-user.decorator';

/**
 * ============================================================================
 * HTTP CONTROLLER: AUTHENTICATION ROUTING LAYER
 * ============================================================================
 * @module AuthModule
 * @route `/api/auth`
 * 
 * PURPOSE:
 * Exposes REST endpoints for client Google OAuth verification and user profile retrieval.
 * ============================================================================
 */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Health check endpoint for AuthModule operational status.
   * @route GET `/api/auth/status`
   */
  @Get('status')
  getAuthStatus() {
    return {
      status: 'Google OAuth module operational',
      authMethod: 'Direct Google ID Token Verification',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Primary authentication & user sync endpoint accepting raw Google ID token.
   * @route POST `/api/auth/google`
   */
  @Post('google')
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.verifyAndSyncGoogleUser(dto.idToken);
  }

  /**
   * Protected endpoint returning profile of user authenticated via Bearer Google ID Token.
   * @route GET `/api/auth/me`
   * @header Authorization Bearer <google_id_token>
   */
  @UseGuards(GoogleAuthGuard)
  @Get('me')
  async getProfile(@GetUser('id') userId: string) {
    return this.authService.getUserProfile(userId);
  }
}
