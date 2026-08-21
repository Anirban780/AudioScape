import { Controller, Get, Post, Body, UseGuards, Res, Req, UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
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
 * Exposes REST endpoints for client Google OAuth verification, persistent JWT session
 * management, token refresh, and user profile retrieval.
 * ============================================================================
 */
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private setRefreshCookie(res: Response, refreshToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('audioscape_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });
  }

  private clearRefreshCookie(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie('audioscape_refresh_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });
  }

  /**
   * Health check endpoint for AuthModule operational status.
   * @route GET `/api/auth/status`
   */
  @Get('status')
  getAuthStatus() {
    return {
      status: 'Google OAuth & JWT Session module operational',
      authMethod: 'Direct Google OAuth + Server JWT Sessions',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Primary authentication & user sync endpoint.
   * Accepts Google ID/Access Token, returns user & JWT Access Token, and sets HttpOnly Refresh Cookie.
   * @route POST `/api/auth/google`
   */
  @Post('google')
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyAndSyncGoogleUser(dto.idToken, dto.accessToken);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      message: result.message,
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  /**
   * Silent session refresh endpoint using HttpOnly refresh cookie.
   * @route POST `/api/auth/refresh`
   */
  @Post('refresh')
  async refreshSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.audioscape_refresh_token;
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token cookie found');
    }

    const result = await this.authService.refreshSession(refreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      message: result.message,
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  /**
   * Session sign-out endpoint clearing HttpOnly refresh cookie.
   * @route POST `/api/auth/logout`
   */
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    this.clearRefreshCookie(res);
    return { message: 'Signed out successfully' };
  }

  /**
   * Protected endpoint returning profile of user authenticated via Bearer JWT Access Token.
   * @route GET `/api/auth/me`
   * @header Authorization Bearer <jwt_access_token>
   */
  @UseGuards(GoogleAuthGuard)
  @Get('me')
  async getProfile(@GetUser('id') userId: string) {
    return this.authService.getUserProfile(userId);
  }
}
