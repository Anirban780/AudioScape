# Phase 3: NestJS Backend Migration Implementation Plan (Google OAuth Setup)

This document details the simplified, production-grade architecture for migrating AudioScape's backend to **NestJS** with **Prisma ORM**, using **Google OAuth 2.0** as the single unified authentication system, connecting to **Neon PostgreSQL** with fallback to **Local Docker PostgreSQL**.

---

## 🎯 Phase 3 Objectives

1. **Enterprise NestJS Architecture**: Modular, maintainable TypeScript backend using NestJS standards (Modules, Controllers, Services, Guards, Filters, Pipes).
2. **Resilient Database Layer (Neon -> Docker Fallback)**:
   - Primary: Deployed **Neon PostgreSQL** (serverless pooled instance with SSL).
   - Fallback: **Local Docker PostgreSQL** container (`postgresql://postgres:postgrespassword@localhost:5432/audioscape`).
   - Visual GUI support via **Prisma Studio**.
3. **Google OAuth 2.0 Authentication (Direct Google Token Verification)**:
   - **Direct Google ID Token Verification**: Protected endpoints verify Google ID tokens directly via `google-auth-library` (`OAuth2Client.verifyIdToken`). Clients send `Authorization: Bearer <google_id_token>` directly. No custom backend JWT secret or secondary token signing required!
   - **Seamless Existing User Migration**: Backfilled Firebase users are matched by their registered Google `email` address in PostgreSQL. Upon signing in with Google, their existing account (`playlists`, `listenHistory`, stats) is automatically linked.
4. **Data Integrity & Type Safety**:
   - Use Prisma Client for type-safe database access across all controllers.
   - Input validation via `class-validator` DTOs.
5. **Port Recommendation & Caching Logic**:
   - Migrate TF-IDF vector similarity recommendation engine (`recommend.js`) to NestJS `RecommendationsService`.
   - Implement `SearchQuery` caching & `related_tracks_cache` operations in Postgres.

---

## 🏗️ Architecture & Google OAuth Flow

```mermaid
flowchart TD
    User[User] -->|1. Sign in with Google| Frontend[React/Vite Frontend]
    Frontend -->|2. Send Google ID Token / Auth Code| AuthCtrl[NestJS AuthController]
    AuthCtrl -->|3. Verify Token with Google API| GoogleAuth[Google Auth Library / Strategy]
    GoogleAuth -->|4. Validated Profile email, googleId, name| AuthService[AuthService]
    
    AuthService -->|5. Match by Email & Upsert Profile| PrismaService[PrismaService DB Module]
    PrismaService -->|6. Query / Update User| NeonDB[(Neon PostgreSQL / Local Docker DB)]
    
    AuthService -->|7. Return App Token & User Profile| Frontend
    Frontend -->|8. Request Protected Endpoints| Endpoints[Tracks / Playlists / History Controllers]
```

---

## 🔒 Existing User Seamless Migration via Google OAuth

1. **Email-Based Account Matching**:
   When an existing user logs in with Google OAuth:
   - `AuthService` extracts their verified Google `email`, `sub` (Google ID), `displayName`, and `photoUrl`.
   - Queries PostgreSQL for a `User` where `email` matches.
   - **Existing Backfilled User Found**: Updates `displayName`, `photoUrl`, `lastLoginAt`, and sets `authId` to Google ID if missing. All historical `playlists` and `listenHistory` remain intact under their primary key `id`.
   - **New User**: Creates a new `User` record in PostgreSQL with their Google details.

2. **Clean Prisma User Schema**:
   ```prisma
   model User {
     id          String    @id @default(uuid())
     authId      String    @unique @map("auth_id")     // Google ID (or legacy auth_id)
     email       String?   @unique
     displayName String?   @map("display_name")
     photoUrl    String?   @map("photo_url")
     lastLoginAt DateTime? @map("last_login_at")
     createdAt   DateTime  @default(now()) @map("created_at")
     updatedAt   DateTime  @updatedAt @map("updated_at")

     listenHistory ListenHistory[]
     playlists     Playlist[]

     @@map("users")
   }
   ```

---

## 🗄️ Database Connection & Fallback Implementation

### Connection Priority
1. `NEON_DATABASE_URL` (or production `DATABASE_URL` pointing to Neon with `sslmode=require`)
2. `LOCAL_DATABASE_URL` (`postgresql://postgres:postgrespassword@localhost:5432/audioscape?schema=public`)

---

## 📦 NestJS Module Blueprint

| Module | Description | Endpoints / Responsibilities |
|---|---|---|
| `PrismaModule` | Global DB connection & lifecycle provider | Export `PrismaService` with Neon -> Local Docker failover |
| `HealthModule` | API boot & wake-up status endpoint | `GET /healthcheck`, `GET /` |
| `AuthModule` | Google OAuth Authentication & User Sync | `POST /api/auth/google`, `GET /api/auth/me`, `POST /api/auth/logout` |
| `TracksModule` | YouTube API Proxy & Cache | `GET /youtube/search`, `GET /youtube/track/:id`, `GET /youtube/categories` |
| `ListenHistoryModule` | Track plays & liked status | `POST /api/music/history`, `GET /api/music/history`, `POST /api/music/like` |
| `PlaylistsModule` | User playlist CRUD | `GET /api/playlists`, `POST /api/playlists`, `PUT /api/playlists/:id`, `DELETE /api/playlists/:id` |
| `RecommendationsModule`| TF-IDF music recommendation engine | `POST /api/music/recommend`, `POST /api/music/cache-related-tracks` |

---

## 🛠️ Step-by-Step Execution Plan

### Step 3.1: Install Google OAuth & NestJS Dependencies
- Install Google Auth Library & Passport packages:
  `npm install google-auth-library @nestjs/passport @nestjs/jwt passport passport-jwt`
  `npm install -D @types/passport-jwt`

### Step 3.2: Rebuild AuthModule for Google OAuth
- Implement `GoogleAuthGuard` to verify Google ID tokens passed from frontend or handle Google OAuth redirection.
- Implement `AuthService`:
  - `verifyAndSyncGoogleUser(idToken: string)`: Verifies token with Google OAuth client, matches/upserts user in PostgreSQL by `email`, and returns user session/JWT.
  - `getUserProfile(userId: string)`: Fetches user profile with history and playlists from PostgreSQL.

### Step 3.3: Rebuild AuthController & Endpoints
- Expose endpoints:
  - `POST /api/auth/google`: Primary login endpoint accepting Google ID token from client.
  - `GET /api/auth/me`: Protected route returning authenticated user profile.
  - `GET /api/auth/status`: Health route for auth operational status.

### Step 3.4: TracksModule — YouTube API Proxy & Search Caching ✅ CURRENT

**Goal**: Port YouTube search/details proxy from legacy Express `youtubeService.js` + `trackController.js` to NestJS, adding PostgreSQL-backed search caching via `SearchQuery` + `QueryTrackResult` + `Tracks` tables.

#### Files to Create in `backend/src/tracks/`

| File | Purpose |
|---|---|
| `tracks.module.ts` | Module declaration importing PrismaModule |
| `tracks.controller.ts` | Routes: `GET /youtube/search`, `GET /youtube/track/:videoId`, `GET /youtube/categories` |
| `tracks.service.ts` | YouTube API calls (`axios`), search result caching in PostgreSQL, track upsert logic |
| `dto/search-tracks.dto.ts` | Validates `query` (required string) and `pageToken` (optional string) query params |

#### TracksService Responsibilities

1. **`searchTracks(query, pageToken?)`**:
   - Normalize query → check `SearchQuery` table for cached non-expired results.
   - **Cache HIT**: Increment `hitCount`, return cached `QueryTrackResult` joined with `Tracks`.
   - **Cache MISS**: Call YouTube Data API `search.list` (videoCategoryId=10 for Music), upsert results into `Tracks` table, create `SearchQuery` + `QueryTrackResult` rows with `expiresAt` TTL (24h).
   - Track API quota usage in `ApiQuotaUsage` table (`SEARCH_LIST` endpoint).

2. **`getTrackDetails(videoId)`**:
   - Check `Tracks` table first (cache layer).
   - **Cache MISS**: Call YouTube `videos.list` (part=snippet,contentDetails,statistics), upsert full track metadata into `Tracks`.
   - Track quota: `VIDEOS_LIST` endpoint.

3. **`getMusicCategoryId()`**:
   - Call YouTube `videoCategories.list`, find "Music" category ID, cache result in-memory.

#### Environment Variable Used
- `YOUTUBE_API_KEY` (already in `backend/.env`)

### Step 3.5: ListenHistoryModule — User Play Logging & Favorites Management ✅ COMPLETED

**Goal**: Implement NestJS `ListenHistoryModule` inside `backend/src/history/` to manage track listening history, play counts, playback source attribution, and liked track favorites backed by Prisma `listen_history` & `tracks` models.

### Step 3.6: PlaylistsModule — Custom Playlist CRUD & Track Management ⏳ NEXT

**Goal**: Implement NestJS `PlaylistsModule` inside `backend/src/playlists/` to provide custom playlist CRUD operations, track additions/removals, and track reordering backed by Prisma `playlists` & `playlist_tracks` relational models.

#### Files to Create in `backend/src/playlists/`

| File | Purpose |
|---|---|
| `playlists.module.ts` | NestJS Module declaring PlaylistsController & PlaylistsService, importing PrismaModule, AuthModule, & TracksModule |
| `playlists.controller.ts` | Protected REST Controller under `/api/playlists` exposing playlist CRUD & track management endpoints |
| `playlists.service.ts` | Core business service managing playlist creation, retrieval, updates, deletions, track ordering, & track removals |
| `dto/create-playlist.dto.ts` | DTO validating playlist creation payload (`name` string required) |
| `dto/update-playlist.dto.ts` | DTO validating playlist update payload (`name` string optional) |
| `dto/add-playlist-track.dto.ts` | DTO validating track addition to playlist (`videoId` string required) |
| `dto/reorder-tracks.dto.ts` | DTO validating track position reordering array (`trackId` string, `position` int) |

#### PlaylistsService Core Responsibilities

1. **`createPlaylist(userId, dto: CreatePlaylistDto)`**:
   - Enforces unique playlist name per user (`@@unique([userId, name])`).
   - Creates new `Playlist` record in PostgreSQL database.
2. **`getUserPlaylists(userId)`**:
   - Fetches all playlists owned by user with track count and preview thumbnail (from position 1 track).
3. **`getPlaylistById(userId, playlistId)`**:
   - Fetches single playlist by ID (verifying `userId` ownership).
   - Includes ordered `tracks` (`PlaylistTrack` joined with `Tracks` ordered by `position asc`).
4. **`updatePlaylist(userId, playlistId, dto: UpdatePlaylistDto)`**:
   - Updates playlist name while enforcing user ownership.
5. **`deletePlaylist(userId, playlistId)`**:
   - Deletes playlist record (automatically cascades deletion to associated `playlist_tracks`).
6. **`addTrackToPlaylist(userId, playlistId, dto: AddPlaylistTrackDto)`**:
   - Verifies playlist ownership. Ensures track exists in `Tracks` table (auto-fetching via `TracksService` if missing).
   - Calculates next position (`currentMaxPosition + 1`).
   - Inserts `PlaylistTrack` row enforcing `@@unique([playlistId, trackId])`.
7. **`removeTrackFromPlaylist(userId, playlistId, trackId)`**:
   - Removes `PlaylistTrack` entry and automatically re-sequences remaining track positions (`position = 1..N`).
8. **`reorderPlaylistTracks(userId, playlistId, dto: ReorderTracksDto)`**:
   - Atomically updates positions for tracks within a playlist.

---

## 🗺️ Remaining Phase 3 Execution Roadmap

Below is the complete roadmap of all remaining tasks to complete Phase 3 NestJS Backend Migration:

| Step | Module / Task | Description & Responsibilities | Status |
|---|---|---|---|
| **Step 3.1** | Foundation & Config | NestJS core packages, TypeScript config, app structure | ✅ Completed |
| **Step 3.2** | Prisma & DB Layer | PrismaModule with Neon cloud primary & Local Docker fallback | ✅ Completed |
| **Step 3.3** | AuthModule | Google OAuth 2.0 Direct Token Verification & User Sync | ✅ Completed |
| **Step 3.4** | TracksModule | YouTube search/details proxying, 24h search cache, quota tracking | ✅ Completed |
| **Step 3.5** | ListenHistoryModule | Track play logging, play counts, pagination, liked track favorites | ✅ Completed |
| **Step 3.6** | **PlaylistsModule** | Custom playlist CRUD, track additions, removals, & position reordering | ⏳ **NEXT** |
| **Step 3.7** | **RecommendationsModule** | TF-IDF vector similarity recommendation engine ported from `recommend.js` using `natural` | 🔮 Future |
| **Step 3.8** | **Health & Global Filters** | Centralized `AllExceptionsFilter`, global `ValidationPipe`, CORS, & Render `/healthcheck` | 🔮 Future |
| **Step 3.9** | **E2E Cutover & Cleanup** | Verify full frontend connection to NestJS on port 5000 & legacy code removal | 🔮 Future |

---

## 🔍 Verification & Testing Plan

1. **Google OAuth Token Verification**:
   - Send Google ID Token to `POST /api/auth/google` -> verify token is validated against Google servers.
2. **Existing User Account Linking**:
   - Login with Google account matching a backfilled Firebase email -> confirm user's existing history & playlists are returned.
3. **Protected Route Authorization**:
   - Request `GET /api/auth/me` with valid session/Bearer token -> status 200 OK.
   - Request without token -> status 401 Unauthorized.
4. **TracksModule Verification**:
   - `GET /youtube/search?query=lofi` -> returns tracks array, creates `SearchQuery` + `Tracks` rows in DB.
   - Repeat same query -> returns cached results, `hitCount` increments, no YouTube API call.
   - `GET /youtube/track/:videoId` -> returns full track metadata, upserts into `Tracks` table.
   - Verify `ApiQuotaUsage` row increments for `SEARCH_LIST` / `VIDEOS_LIST`.
5. **ListenHistoryModule Verification**:
   - `POST /api/music/history` with valid Bearer token -> upserts `listen_history` row, increments `playCount`.
   - `GET /api/music/history` -> returns user's listen history sorted by `lastPlayedAt` descending.
   - `POST /api/music/like` -> toggles `liked` boolean and updates `likedAt`.
   - `GET /api/music/favorites` -> returns user's liked tracks array.
6. **PlaylistsModule Verification**:
   - `POST /api/playlists` -> creates user playlist in PostgreSQL.
   - `POST /api/playlists/:id/tracks` -> adds track to playlist, sets position 1.
   - `GET /api/playlists/:id` -> returns playlist with ordered tracks.
   - `DELETE /api/playlists/:id/tracks/:trackId` -> removes track and re-sequences positions.
   - `DELETE /api/playlists/:id` -> deletes playlist and cascaded tracks.



