# YouTube Thumbnail Domain Rewrite & Endpoint Web Filtering Bypass Log

## Overview & Context
- **Issue**: Endpoint web filtering software (e.g., Bitdefender, enterprise proxies) blocks outbound HTTPS requests to the primary YouTube thumbnail CDN host (`i.ytimg.com`).
- **Impact**: Broken thumbnail artwork images across the AudioScape application UI (search results, explore categories, player bar, playlists, and user listen history).
- **Solution**: Refactored YouTube thumbnail URL handling into dedicated, configurable utility modules (`youtubeUtils.js` on frontend and `youtubeUtils.ts` on backend) to dynamically rewrite thumbnail domains from `i.ytimg.com` to `img.youtube.com` during data fetching and UI rendering.

---

## Architectural Principles & Design Decisions

### 1. Dedicated Utility Modules
- **Frontend Utility**: [`frontend/src/utils/youtubeUtils.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/utils/youtubeUtils.js)
- **Backend Utility**: [`backend/src/utils/youtubeUtils.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/utils/youtubeUtils.ts)
- Both modules export `getValidThumbnailUrl(originalUrl)` and configurable constants:
  - `TARGET_YOUTUBE_THUMBNAIL_DOMAIN = "img.youtube.com"`
  - `BLOCKED_YOUTUBE_THUMBNAIL_DOMAIN = "i.ytimg.com"`

### 2. Clean Architecture & Database Immutability
- **Database Records Preserved**: PostgreSQL tables (`Tracks`, `ListenHistory`, `PlaylistTracks`, `QueryTrackResult`) continue to store original raw YouTube URLs.
- **Zero In-Place DB Mutations**: Upsert operations in `TracksService` (`upsertTrackInPostgres`, `cacheSearchResultsInPostgres`) remain untouched. Domain transformation occurs dynamically only when retrieving data or preparing client responses.

### 3. Clear TODO & Easy Reversal
- Each utility file contains top-level documentation and an explicit `TODO` comment:
  ```javascript
  // TODO: Temporary bypass for endpoint web filtering (e.g., Bitdefender blocking i.ytimg.com).
  // Revert or modify when web filtering rules are updated.
  ```
- To switch to another CDN domain or revert the bypass in the future, simply update or disable `TARGET_YOUTUBE_THUMBNAIL_DOMAIN` in the utility modules.

---

## Codebase Integration Matrix

| Module / Component | File Location | Changes Applied |
| :--- | :--- | :--- |
| **Frontend Utility** | [`frontend/src/utils/youtubeUtils.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/utils/youtubeUtils.js) | Created core domain rewriting helper function `getValidThumbnailUrl`. |
| **Backend Utility** | [`backend/src/utils/youtubeUtils.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/utils/youtubeUtils.ts) | Created TypeScript backend helper module. |
| **Frontend Unit Tests** | [`frontend/src/utils/__tests__/youtubeUtils.test.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/utils/__tests__/youtubeUtils.test.js) | Created unit tests verifying domain replacement and edge cases. |
| **Tracks Service** | [`backend/src/tracks/tracks.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/tracks/tracks.service.ts) | Wrapped `thumbNail` / `thumbnailUrl` response fields in `searchYoutube` and `getTrackDetails`. |
| **Playlists Service** | [`backend/src/playlists/playlists.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/playlists/playlists.service.ts) | Wrapped `previewThumbnail` and playlist track `thumbnailUrl` outputs in `getUserPlaylists` and `getPlaylistById`. |
| **Listen History Service** | [`backend/src/history/history.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/history/history.service.ts) | Wrapped `track.thumbnailUrl` in `getUserListenHistory`, `toggleTrackLike`, and `getUserFavorites`. |
| **Recommendations Service** | [`backend/src/recommendations/recommendations.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/recommendations.service.ts) | Wrapped candidate and explore feed thumbnail properties. |
| **Frontend YouTube API** | [`frontend/src/utils/youtube.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/utils/youtube.js) | Wrapped `fetchAndCacheYoutubeMusic` thumbnail mapping. |
| **Frontend Core API** | [`frontend/src/utils/api.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/utils/api.js) | Wrapped thumbnail outputs in `fetchLastPlayedSongs`, `fetchUserLikedSongs`, `fetchRecommendations`, and `fetchExploreFeed`. |
| **Frontend Playlists API** | [`frontend/src/utils/playlists.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/utils/playlists.js) | Wrapped playlist track thumbnails in `fetchUserPlaylists`. |
| **Music Card Component** | [`frontend/src/components/Cards/MusicCard.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Cards/MusicCard.jsx) | Applied `getValidThumbnailUrl` to artwork image rendering and state. |
| **Trending Banner** | [`frontend/src/components/Explore/ExploreTrendingBanner.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreTrendingBanner.jsx) | Applied `getValidThumbnailUrl` to background artwork. |
| **Live Search Bar** | [`frontend/src/components/Home/SearchBar.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/SearchBar.jsx) | Applied `getValidThumbnailUrl` when selecting search result tracks. |
| **Player Components** | `MiniPlayer.jsx`, `FullScreenPlayer.jsx`, `TrackQueue.jsx` | Wrapped rendered image sources with `getValidThumbnailUrl`. |

---

## Verification & Testing
- Unit tests written for `getValidThumbnailUrl` covering:
  1. Rewriting `i.ytimg.com` to `img.youtube.com`.
  2. Preserving non-blocked URLs (`img.youtube.com`, unsplash, placeholder images).
  3. Safe handling of `null`, `undefined`, empty strings, and non-string types.

---

## Reversal / Deprecation Guide
When web filtering rules are updated or `i.ytimg.com` is no longer blocked:
1. Update `TARGET_YOUTUBE_THUMBNAIL_DOMAIN` to `"i.ytimg.com"` in `frontend/src/utils/youtubeUtils.js` and `backend/src/utils/youtubeUtils.ts`.
2. Or change `getValidThumbnailUrl` to return `originalUrl` directly.
