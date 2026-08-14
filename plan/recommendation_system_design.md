# AudioScape Recommendation System — Final Implementation Design

> **Scope:** Backend `RecommendationsModule` (NestJS) — the last major module to ship.  
> **Constraints:** 2 YouTube API keys (10K units/day each = 20K total), ~100 max concurrent users, PostgreSQL (Neon), zero external paid APIs.  
> **Date:** July 29, 2026

---

## 1. Current State — What Already Exists

| Layer | What's Built | What's Missing |
|-------|-------------|----------------|
| **Prisma Schema** | `Tracks`, `ListenHistory`, `SearchQuery`, `QueryTrackResult`, `ApiQuotaUsage`, `Channel` — all migrated and live | No `RecommendationsModule` in NestJS |
| **TracksService** | `searchTracks()` with Postgres cache-first + YouTube fallback, `getTrackDetails()`, quota tracking, 24h TTL on search cache | Doesn't batch `videos.list` calls yet (1 per video instead of 50/call) |
| **HistoryService** | `recordTrackListen()`, `getUserListenHistory()`, `toggleTrackLike()`, `getUserFavorites()` — all operational | No event emission on new listen (needed for cache invalidation) |
| **Frontend** | `RecommendForYou.jsx` calls `POST /api/music/recommend`, `ExplorePage.jsx` calls YouTube directly via `fetchYoutubeMusic()`, `generateQueue.js` still reads Firestore | Frontend still Firestore-dependent for recommendations/queue |
| **Legacy Express** | `recommend.js` (TF-IDF), `recommendService.js`, `recommendationController.js` — still running on old backend | Needs full port to NestJS |

### Key Insight: The Recommendation Engine Does NOT Call YouTube API

The TF-IDF engine runs **entirely** against cached Postgres data (`tracks.genre`, `tracks.tags`, `search_queries`). It never calls YouTube. The only API cost is building the corpus through search + explore flows. This means the recommendation module itself is **zero quota cost** — the challenge is keeping the corpus fresh and large enough without burning quota.

---

## 2. Dual API Key Rotation — Usage-Based Switching

### The Setup

You have 2 Google Cloud projects, each with its own YouTube Data API v3 key:
- **Key A** — `YOUTUBE_API_KEY_A`
- **Key B** — `YOUTUBE_API_KEY_B`

Each key gets 10,000 units/day, reset at **midnight Pacific (UTC-7, i.e. 12:30 PM IST)**.

### Rotation Design

Since quota resets at midnight Pacific, a strict 12-hour phase split would leave one key underutilized. Instead, use a **primary/secondary** model with usage-based switching:

```
┌──────────────────────────────────────────────────────┐
│  KEY SELECTION LOGIC (evaluated per API call)        │
│                                                      │
│  1. Check ApiQuotaUsage for primary key today        │
│  2. If primary key < 8,000 units → use primary       │
│  3. If primary key ≥ 8,000 units → switch to         │
│     secondary key                                    │
│  4. If both keys ≥ 8,000 → serve cache-only,         │
│     return "limited results" response                │
│  5. Primary key alternates daily (odd/even day       │
│     of month)                                        │
└──────────────────────────────────────────────────────┘
```

### Implementation: `YouTubeKeyManager` (injectable service)

```
Environment Variables:
  YOUTUBE_API_KEY_A=...
  YOUTUBE_API_KEY_B=...
  YOUTUBE_QUOTA_THRESHOLD=8000     # switch threshold per key
```

**Logic:**
- Maintain `ApiQuotaUsage` rows per key (add `apiKeyId` field to the table — `'A'` or `'B'`)
- On each YouTube API call, check today's usage for the active key
- If approaching threshold, seamlessly switch to the other key
- If both exhausted, fall back to cache-only mode (Postgres FTS + existing search cache)

**Why not strict 12h phases?** Because usage is bursty — one heavy explore-page load can burn 1,000+ units. Usage-based switching is more resilient than time-based. The day-of-month alternation just ensures wear is even over time.

### Schema Change Required

```prisma
model ApiQuotaUsage {
  id            String      @id @default(uuid())
  date          DateTime    @db.Date
  endpoint      ApiEndpoint
  apiKeyId      String      @default("A") @map("api_key_id")  // NEW: 'A' or 'B'
  unitsConsumed Int         @default(0) @map("units_consumed")
  callCount     Int         @default(0) @map("call_count")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@unique([date, endpoint, apiKeyId])
  @@map("api_quota_usage")
}
```

---

## 3. Caching Architecture — Minimizing Search Operations

### The Problem

With 100 users, the critical bottleneck is `search.list` at 100 units/call. Even with 20K units/day (dual keys), that's only **200 unique searches/day** across all users. At 100 users, that's 2 unique searches per user per day before quota is exhausted.

### Multi-Layer Cache Design

```
Layer 0: In-Memory (Node process)
  ├── Music category ID (static, cached forever)
  ├── Computed recommendations per userId (1h TTL)
  └── Hot search queries (LRU, 50 entries, 15-min TTL)

Layer 1: PostgreSQL — SearchQuery + QueryTrackResult (24h TTL)
  ├── All user searches cached with results
  ├── All curated keyword searches cached
  └── Shared across all users — if user A searches "lofi"
      and user B searches "lofi", user B gets cache hit

Layer 2: PostgreSQL — Tracks table (permanent, refreshed every 30 days)
  ├── Every track ever fetched lives here forever
  ├── Full-text search via tsvector + trigram index
  └── Used for "local search" before hitting YouTube

Layer 3: YouTube API (fallback only)
  └── Called ONLY when Layer 1 cache miss + Layer 2 local
      search returns < 8 relevant results
```

### Search Flow with Caching (Updated)

```
User types "lofi hip hop" →

1. Normalize: "lofi hip hop"
2. Check L0 (in-memory hot cache) → hit? return immediately
3. Check L1 (SearchQuery table, TTL check) → hit? return, bump hitCount
4. Check L2 (Postgres FTS + trigram on tracks table)
   → If ≥ 8 fresh results with good rank scores → return, skip YouTube
5. Check quota budget → if both keys exhausted → return L2 results
   with "results may be limited" flag
6. Call YouTube search.list → cache results in L1 + upsert tracks in L2
7. Return merged results
```

### Quota Budget Per User Action

| Action | Quota Cost | Caching Strategy |
|--------|-----------|-----------------|
| **Search (cache hit)** | 0 | L1 SearchQuery table, 24h TTL, shared across users |
| **Search (cache miss)** | 101 units | 100 (search.list) + 1 (getMusicCategoryId, now cached in-memory) |
| **Track details (cache hit)** | 0 | L2 Tracks table, permanent |
| **Track details (cache miss)** | 1 unit | videos.list, then stored permanently |
| **Explore page (warm cache)** | 0 | Curated keywords pre-warmed, 24h TTL |
| **Explore page (cold)** | ~1,000 units | 10 keywords × 101 units — **must pre-warm** |
| **Recommendations** | 0 | Pure computation on cached data |
| **Queue generation** | 0 | Reads from cached corpus + history |

### Pre-Warming Strategy (Critical for Explore Page)

The Explore page is the **single biggest quota sink** — 10 keyword searches = 1,010 units per cold load. Fix:

1. **Server-side cron job** (run once daily at low-traffic time, e.g., 3 AM IST / 2:30 PM Pacific — well before quota reset):
   - Iterate through `curatedGenres` + top 10 most-searched user queries from `SearchQuery` (by `hitCount`)
   - Pre-warm each keyword into `SearchQuery` cache
   - Cost: ~20 keywords × 101 = ~2,020 units/day (predictable, off-peak)

2. **Explore page reads from backend** instead of calling YouTube directly:
   - `GET /api/explore` → backend checks L1 cache → returns tracks
   - No client-side YouTube API calls, no exposed API key

### Daily Quota Budget (with dual keys)

```
Available: 20,000 units/day (2 × 10K)

Allocation:
  Pre-warm curated/popular queries:  ~2,000 units (fixed, predictable)
  User searches (cache miss):        ~5,000 units (~50 unique searches)
  Track detail lookups:              ~500 units (~500 new tracks)
  Background refresh (stale tracks): ~500 units (50 tracks × 10 calls)
  Safety buffer:                     ~12,000 units
                                     ────────────
  Total planned:                     ~8,000 units
  Headroom:                          ~12,000 units (60%)
```

With this budget, 100 users can collectively make ~50 unique searches/day, plus **unlimited cache-hit searches**. Given that most music searches are repetitive (popular artists, trending songs), the actual unique-query rate should be well within this.

---

## 4. Recommendation Engine — NestJS Implementation

### Module Structure

```
backend/src/recommendations/
├── recommendations.module.ts
├── recommendations.controller.ts
├── recommendations.service.ts
├── tfidf-engine.ts
├── youtube-key-manager.ts
└── dto/
    ├── get-recommendations.dto.ts
    └── cache-related-tracks.dto.ts
```

### Data Flow

```
POST /api/music/recommend { topN: 15 }
  │
  ├── Auth guard extracts userId from JWT
  │
  └── RecommendationsService.getRecommendations(userId, topN)
        │
        ├── Check in-memory cache (Map<userId, { tracks, expiresAt }>)
        │   └── Cache hit? Return immediately
        │
        ├── Fetch user listen history (last 100 tracks)
        │   SELECT lh.*, t.* FROM listen_history lh
        │   JOIN tracks t ON t.youtube_video_id = lh.track_id
        │   WHERE lh.user_id = $1
        │   ORDER BY lh.last_played_at DESC
        │   LIMIT 100
        │
        ├── Fetch related tracks corpus
        │   SELECT sq.*, qtr.*, t.* FROM search_queries sq
        │   JOIN query_track_results qtr ON qtr.query_id = sq.id
        │   JOIN tracks t ON t.youtube_video_id = qtr.track_id
        │   WHERE sq.expires_at > NOW()
        │   LIMIT 50 queries (with all their tracks)
        │
        ├── TfIdfEngine.compute(history, corpus, topN)
        │   ├── Build weighted user profile documents
        │   ├── Build corpus keyword documents
        │   ├── TF-IDF vectorization (natural npm)
        │   ├── Cosine similarity matrix
        │   ├── Ranked selection with diversity shuffle
        │   └── Return topN tracks
        │
        ├── Cache result in memory (1h TTL)
        │
        └── Return tracks
```

### Weight Formula (from existing recommend.js, preserved)

```
weight(track) = likedWeight × (0.5 × recencyWeight + 0.5 × playCountWeight) × randomFactor

  likedWeight    = track.liked ? 2.0 : 1.0
  recencyWeight  = max(0, 1 - daysSince(lastPlayedAt) / 30)
  playCountWeight = min(5, playCount / 5)
  randomFactor   = 0.9 + random() × 0.2
```

### In-Memory Recommendation Cache

```typescript
private readonly recCache = new Map<string, { tracks: any[], expiresAt: number }>();
private readonly REC_CACHE_TTL = 60 * 60 * 1000; // 1 hour

invalidateUserCache(userId: string) {
  this.recCache.delete(userId);
}
```

### Cache Invalidation Trigger

`HistoryService.recordTrackListen()` needs to invalidate the recommendation cache when a user plays a new track. 

**Approach:** Direct injection — inject `RecommendationsService` into `HistoryService`, call `invalidateUserCache(userId)` after recording a listen. With 100 users, decoupled event-driven architecture is unnecessary overhead.

---

## 5. Explore Page Migration — Server-Side

### Current Problem

`ExplorePage.jsx` calls YouTube directly via a client-side API key (`VITE_YOUTUBE_API_KEY`). This:
- Exposes the API key in browser devtools
- Burns quota from the client independently of the backend's tracking
- Doesn't benefit from the shared `SearchQuery` cache

### Solution: New Backend Endpoint

```
GET /api/explore

Response:
{
  sections: [
    {
      keyword: "lofi music",
      tracks: [{ videoId, title, thumbNail, channelTitle }, ...]
    },
    ...
  ]
}
```

**Server-side flow:**
1. Extract keywords from user's listen history genres/tags (same logic as current `keywords.js`, moved server-side)
2. For each keyword, check `SearchQuery` cache (L1)
3. If cache hit → return cached tracks
4. If cache miss → check if quota allows → call YouTube → cache → return
5. If quota exhausted → return whatever's in cache + "limited" flag

### Pre-Warming Cron (`@nestjs/schedule`)

```
@Cron('0 3 * * *')  // 3:00 AM IST daily
async preWarmExploreCache() {
  const keywords = [...CURATED_GENRES, ...topSearchedQueries];
  for (const keyword of keywords) {
    await this.tracksService.searchTracks(keyword);
    await sleep(2000); // rate limit courtesy
  }
}
```

Cost: ~20 keywords × 101 units = 2,020 units. Runs during low-traffic hours, predictable budget.

---

## 6. Queue Generation Migration

### Current Problem

`generateQueue.js` reads from **Firestore** (`relatedTracksCache`, `users/{uid}/music_history`). Needs to read from the NestJS backend instead.

### Solution: New Backend Endpoint

```
POST /api/music/generate-queue
Body: { currentTrackId: string, keyword?: string }

Response:
{
  queue: [{ videoId, title, thumbNail, channelTitle, genre }, ...]
}
```

**Server-side logic (mirrors existing `generateQueue.js`):**
1. If `keyword` provided → fetch tracks from `SearchQuery` cache for that keyword
2. Else → use recommendation engine output
3. Fetch user's recent 20 listens from `ListenHistory`
4. Mix: 6 related + 4 recent (with rebalancing), deduplicated, shuffled
5. Prepend `currentTrack`
6. Return queue of ~10 tracks

**Zero API cost** — reads entirely from Postgres cache.

---

## 7. Legacy Compatibility: `POST /api/music/cache-related-tracks`

The frontend `ExplorePage.jsx` currently calls `cacheRelatedTracks(keyword, tracks)` to push data to the backend. Until the Explore page is fully migrated to the server-side endpoint:

- Keep `POST /api/music/cache-related-tracks` in `RecommendationsController`
- It upserts a `SearchQuery` row with `queryType = CURATED_KEYWORD`
- Upserts `Track` rows for each track
- Creates `QueryTrackResult` junction rows
- This feeds the recommendation corpus even from the legacy frontend flow

---

## 8. Implementation Order (~4 days total)

### Phase A — YouTubeKeyManager + Schema Migration (~0.5 day)
- Add `apiKeyId` to `ApiQuotaUsage` schema
- Create `YouTubeKeyManager` injectable service
- Update `TracksService` to use key manager instead of single env var
- Run `prisma migrate dev`

### Phase B — RecommendationsModule Core (~1.5 days)
- Create module structure: `recommendations.module.ts`, controller, service, DTOs
- Port `tfidf-engine.ts` from legacy `recommend.js` (read from Postgres instead of Firestore)
- Wire `POST /api/music/recommend` endpoint
- Add `POST /api/music/cache-related-tracks` for legacy compatibility
- Add in-memory recommendation cache with 1h TTL
- Install `natural` npm package

### Phase C — Explore Page Server-Side (~1 day)
- Add `GET /api/explore` endpoint in `RecommendationsController`
- Move keyword extraction logic from `keywords.js` to backend
- Add pre-warming cron job for curated keywords
- Update frontend `ExplorePage.jsx` to call backend instead of YouTube directly
- Remove `VITE_YOUTUBE_API_KEY` from frontend

### Phase D — Queue Generation + Polish (~1 day)
- Add `POST /api/music/generate-queue` endpoint
- Port `generateQueue.js` logic to backend (read from Postgres instead of Firestore)
- Wire `HistoryService` → `RecommendationsService` cache invalidation
- Add quota budget guardrail (serve cache-only when near limit)
- Update frontend `generateQueue.js` to call backend API
- Test full flow: search → play → recommend → queue → explore

---

## 9. API Endpoint Summary

| Method | Path | Auth | Purpose | Quota Cost |
|--------|------|------|---------|-----------|
| `POST` | `/api/music/recommend` | ✅ JWT | Get personalized recommendations | 0 |
| `POST` | `/api/music/cache-related-tracks` | ✅ JWT | Legacy: push explore cache from frontend | 0 |
| `GET` | `/api/explore` | ✅ JWT | Server-side explore feed | 0 (pre-warmed) |
| `POST` | `/api/music/generate-queue` | ✅ JWT | Generate play queue for current track | 0 |

All recommendation endpoints are **zero quota cost** — they read from Postgres cache populated by search/explore flows.

---

## 10. Why This Design Works for 100 Users

| Concern | How It's Addressed |
|---------|-------------------|
| **Quota exhaustion** | Dual keys (20K units), usage-based switching, 60% daily headroom |
| **Repeated searches** | Shared L1 cache: if any user searches "lofi", all 99 others get free cache hits |
| **Explore page quota burn** | Pre-warmed daily via cron, served from cache, no client-side YouTube calls |
| **Cold start (new user)** | Falls back to curated genre keywords for recommendations; improves as they play tracks |
| **Recommendation staleness** | 1h in-memory cache, invalidated on new play; corpus refreshes via 24h search cache TTL |
| **Firestore dependency** | Progressively eliminated: recommendations → queue → explore all move to Postgres-backed endpoints |
| **Track data freshness** | Background refresh job re-validates tracks older than 30 days (10 units per 500 tracks) |
| **Single point of failure** | If YouTube API is fully down → app serves entirely from Postgres cache with "limited" flag |

---

## 11. Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| `natural` | TF-IDF vectorization for content-based recommendations | Needs `npm install` |
| `@nestjs/schedule` | Cron job for pre-warming explore cache | Needs `npm install` |

No external paid APIs. No embedding models needed yet (Phase 4 of `music_video_data_evolution.md` — pgvector + embeddings — is a separate future enhancement, not a blocker for shipping this).
