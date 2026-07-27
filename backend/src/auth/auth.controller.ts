import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './firebase-auth.guard';
import { GetUser } from './decorators/get-user.decorator';
import { SyncUserDto } from './dto/sync-user.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('status')
  getAuthStatus() {
    return { status: 'Auth module operational', timestamp: new Date().toISOString() };
  }

  @UseGuards(FirebaseAuthGuard)
  @Post('sync')
  async syncUser(@GetUser() user: any, @Body() body: Partial<SyncUserDto>) {
    const syncDto: SyncUserDto = {
      authId: user.uid,
      email: user.email || body.email,
      displayName: user.name || body.displayName,
      photoUrl: user.picture || body.photoUrl,
    };
    return this.authService.syncUser(syncDto);
  }

  @UseGuards(FirebaseAuthGuard)
  @Get('me')
  async getProfile(@GetUser('uid') authId: string) {
    return this.authService.getUserProfile(authId);
  }
}
