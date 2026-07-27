import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GetUser } from './decorators/get-user.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  getAuthStatus() {
    return {
      status: 'Google OAuth module operational',
      authMethod: 'Google OAuth 2.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('google')
  async googleLogin(@Body() dto: GoogleLoginDto) {
    return this.authService.verifyAndSyncGoogleUser(dto.idToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@GetUser('id') userId: string) {
    return this.authService.getUserProfile(userId);
  }
}
