import { Controller, Get } from '@nestjs/common';

/**
 * ============================================================================
 * HTTP CONTROLLER: ROOT APPLICATION INDEX & ENDPOINT DISCOVERY
 * ============================================================================
 * @module AppModule
 * 
 * PURPOSE:
 * Serves root `/` GET route providing API operational metadata, version info,
 * and discovery mapping of all available REST endpoints.
 * ============================================================================
 */
@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      message: 'AudioScape NestJS Backend API is running successfully',
      status: 'online',
      version: '1.1.0',
      endpoints: {
        healthCheck: 'GET /healthcheck',
        authStatus: 'GET /api/auth/status',
        authGoogle: 'POST /api/auth/google',
        profile: 'GET /api/auth/me',
        youtubeSearch: 'GET /youtube/search?query=...',
        youtubeTrackDetails: 'GET /youtube/track/:videoId',
        recordHistory: 'POST /api/music/history',
        getHistory: 'GET /api/music/history',
        toggleLike: 'POST /api/music/like',
        getFavorites: 'GET /api/music/favorites',
        playlists: 'GET|POST /api/playlists',
        playlistDetails: 'GET|PUT|DELETE /api/playlists/:id',
        playlistTracks: 'POST|DELETE /api/playlists/:id/tracks',
        recommendations: 'POST /api/music/recommend',
        cacheRelatedTracks: 'POST /api/music/cache-related-tracks',
      },
      timestamp: new Date().toISOString(),
    };
  }
}
