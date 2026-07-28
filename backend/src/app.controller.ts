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
        recordHistory: 'POST /api/music/history',
        getHistory: 'GET /api/music/history',
        toggleLike: 'POST /api/music/like',
        getFavorites: 'GET /api/music/favorites',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
