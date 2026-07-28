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

### Step 3.5: ListenHistoryModule — User Play Logging & Favorites Management ⏳ NEXT

**Goal**: Implement NestJS `ListenHistoryModule` inside `backend/src/history/` to manage track listening history, play counts, playback source attribution, and liked track favorites backed by Prisma `listen_history` & `tracks` models.

#### Files to Create in `backend/src/history/`

| File | Purpose |
|---|---|
| `history.module.ts` | NestJS Module registering HistoryController & HistoryService, importing PrismaModule & AuthModule |
| `history.controller.ts` | Route Controller under `/api/music` handling protected history & favorites endpoints |
| `history.service.ts` | Core business logic for upserting play history, retrieving history, toggling likes, & listing favorites |
| `dto/record-listen.dto.ts` | DTO validating track play recording (`trackId` string, optional `source` enum, optional metadata) |
| `dto/toggle-like.dto.ts` | DTO validating track like status toggle (`trackId` string, `liked` boolean) |
| `dto/get-history-query.dto.ts` | DTO validating optional pagination parameters (`limit`, `page`) |

#### HistoryService Core Responsibilities

1. **`recordTrackListen(userId, dto: RecordListenDto)`**:
   - Ensures `Tracks` record exists in PostgreSQL (if missing, resolves track metadata via `TracksService`).
   - Upserts `ListenHistory` row on unique constraint `[userId, trackId]`:
     - **On Create**: Sets `playCount = 1`, `firstPlayedAt = NOW()`, `lastPlayedAt = NOW()`, `source`.
     - **On Update**: Increments `playCount += 1`, updates `lastPlayedAt = NOW()`, updates `source`.
   - Returns updated history record with joined track information.

2. **`getUserListenHistory(userId, query: GetHistoryQueryDto)`**:
   - Queries `listen_history` where `userId = userId`, ordered by `lastPlayedAt DESC`.
   - Supports limit (default 20, max 100) and page pagination.
   - Includes full `track` details joined for player state hydration.

3. **`toggleTrackLike(userId, dto: ToggleLikeDto)`**:
   - Upserts `listen_history` row for `[userId, trackId]`:
     - Updates `liked` boolean status and `likedAt` timestamp (`NOW()` if liked, `null` if unliked).
   - Returns updated liked state.

4. **`getUserFavorites(userId)`**:
   - Queries `listen_history` where `userId = userId` AND `liked = true`, ordered by `likedAt DESC`.
   - Returns array of liked tracks for frontend Favorites view.

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


