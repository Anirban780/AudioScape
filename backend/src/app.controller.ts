import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      message: 'AudioScape NestJS Backend API is running successfully',
      status: 'online',
      version: '1.1.0',
      endpoints: {
        authStatus: '/api/auth/status',
        authGoogle: 'POST /api/auth/google',
        profile: 'GET /api/auth/me',
        youtubeSearch: 'GET /youtube/search?query=...',
        youtubeTrackDetails: 'GET /youtube/track/:videoId',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
