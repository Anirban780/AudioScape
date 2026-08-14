# Step 3.7 — RecommendationsModule Deep Dive

> **Module Directory:** `backend/src/recommendations/`
> **Route Prefix:** `/api/music`
> **Status:** 🔮 Planning

---

## 1. Background: What Exists Today

The legacy Express backend had a recommendation pipeline split across three files:

| Legacy File | Role |
|---|---|
| `recommend.js` | Pure TF-IDF computation engine using `natural` npm package |
| `services/recommendService.js` | Thin wrapper calling `recommendSongs()` |
| `controllers/recommendationController.js` | Express route handler (`POST /api/music/recommend`) |

### Legacy Data Flow

```
Client POST /api/music/recommend { userId, topN }
  ↓
recommendationController
  ├── fetchUserMusicHistory(userId)      → Firestore users/{uid}/music_history
  ├── fetchRelatedTracks()               → Firestore relatedTracksCache collection
  ↓
recommendService.getTopRecommendedSongs(userHistory, relatedTracks, topN)
  ↓
recommend.js → TF-IDF cosine similarity → topN track objects
```

### Legacy Algorithm Summary

1. **Weight Calculation**: Each song in user history gets a composite weight:
   - `likedWeight` = 2× if liked, 1× otherwise
   - `recencyWeight` = decays linearly over 30 days to 0
   - `playCountWeight` = `min(5, playCount / 5)` — caps at 5
   - `randomFactor` = 0.9–1.1 (±10% jitter to avoid static orderings)
   - Final: `likedWeight × (0.5 × recencyWeight + 0.5 × playCountWeight) × randomFactor`

2. **TF-IDF Document Construction**:
   - User history songs → each produces a "document" from `song.genre.join(' ') + ' ' + weight`
   - Related tracks cache → each keyword group becomes a document from its `keyword` string

3. **Cosine Similarity Scoring**:
   - Computes cosine similarity between every user-document vector and every related-keyword vector
   - Sums scores per related keyword across all user documents
   - Applies 0–10% random perturbation to similarity scores

4. **Selection & Deduplication**:
   - Sorts related keywords by aggregate score
   - Takes top `N + 5` candidates → Fisher-Yates shuffles → picks one random track per keyword
   - Fills remaining slots from unused keywords to reach `topN`

---

## 2. What Needs to Change for NestJS + PostgreSQL

### 2.1 Data Source Migration

| Old (Firestore) | New (PostgreSQL via Prisma) |
|---|---|
| `users/{uid}/music_history` subcollection | `listen_history` table joined with `tracks` |
| `relatedTracksCache` collection (keyword → tracks) | `search_queries` table (`queryType = CURATED_KEYWORD`) joined with `query_track_results` → `tracks` |
| `song.genre` array from Firestore | `tracks.genre` array in PostgreSQL |

### 2.2 Related Tracks Cache: The Missing Piece

The legacy system relied on a separate `POST /api/music/cache-related` endpoint that the **frontend** called to push related tracks into Firestore. This approach has problems:
- Client-driven cache population is unreliable (tab closes, network errors)
- No server-controlled TTL or eviction

**New approach**: The `TracksModule` already caches YouTube search results in `SearchQuery` + `QueryTrackResult` with 24h TTL. We reuse this data by treating cached search results as the "related tracks" corpus for TF-IDF.

### 2.3 Algorithm Improvements

| Area | Legacy | NestJS Improvement |
|---|---|---|
| Weight calculation | Inline in `recommend.js` | Extracted to `RecommendationWeightCalculator` utility class for testability |
| TF-IDF library | `natural` npm TfIdf class | Same `natural` package — proven, lightweight, zero external API cost |
| Recency decay | Hardcoded 30-day linear | Configurable via environment variable `RECENCY_DECAY_DAYS` (default: 30) |
| Random jitter | Inline `Math.random()` | Preserved but with configurable jitter range |
| Related tracks source | Firestore `relatedTracksCache` | PostgreSQL `search_queries` where `queryType IN ('USER_SEARCH', 'CURATED_KEYWORD')` |
| Caching recommendations | None | Cache computed recommendations per user with 1-hour TTL in-memory |

---

## 3. Module Architecture

### 3.1 Files to Create

| File | Purpose |
|---|---|
| `recommendations.module.ts` | NestJS Module importing PrismaModule, AuthModule, TracksModule |
| `recommendations.controller.ts` | Protected controller exposing `POST /api/music/recommend` and `POST /api/music/cache-related-tracks` |
| `recommendations.service.ts` | Orchestrates data fetching, calls TF-IDF engine, returns results |
| `tfidf-engine.ts` | Pure computation class encapsulating TF-IDF vectorization, cosine similarity, and weighted scoring |
| `dto/get-recommendations.dto.ts` | Validates `topN` (optional int, default 10, max 30) |
| `dto/cache-related-tracks.dto.ts` | Validates `keyword` string and `tracks` array for legacy frontend compatibility |

### 3.2 Class Responsibility Map

```
RecommendationsController
  │
  ├── POST /api/music/recommend
  │     → RecommendationsService.getRecommendations(userId, topN)
  │         ├── Fetch user listen history (Prisma: listen_history + tracks)
  │         ├── Fetch related tracks corpus (Prisma: search_queries + query_track_results + tracks)
  │         ├── TfIdfEngine.computeRecommendations(userHistory, relatedCorpus, topN)
  │         └── Return ranked track list
  │
  └── POST /api/music/cache-related-tracks
        → RecommendationsService.cacheRelatedTracks(keyword, tracks)
            ├── Upsert SearchQuery (queryType = CURATED_KEYWORD)
            └── Upsert Tracks + QueryTrackResult rows
```

---

## 4. TF-IDF Engine: How It Works

### 4.1 Why TF-IDF for Music Recommendations

TF-IDF (Term Frequency–Inverse Document Frequency) is a text-based information retrieval technique. In AudioScape's context:

- **Terms** = genre keywords, tags, and artist names extracted from tracks
- **Documents** = user's listening history (weighted by play count, recency, liked status) and cached search keyword groups
- **Goal** = find which cached search groups are most textually similar to the user's weighted listening profile

This is a **content-based filtering** approach. It does not require collaborative data from other users, making it ideal for a solo-developer application with a small user base.

### 4.2 Algorithm Steps

```
INPUT:
  userHistory: ListenHistory[] joined with Tracks (genre, tags, artist, playCount, liked, lastPlayedAt)
  relatedCorpus: SearchQuery[] joined with QueryTrackResult[] + Tracks
  topN: number

STEP 1 — Build User Profile Documents
  For each track in user history:
    weight = calculateSongWeight(track, now)
    document = track.genre.join(' ') + ' ' + track.tags.join(' ') + ' ' + track.artist
    Append weight as a text token to boost high-weight track keywords in TF-IDF scoring

STEP 2 — Build Related Corpus Documents
  For each SearchQuery in related corpus:
    document = searchQuery.normalizedQuery (the keyword text)
    Track the associated tracks for later selection

STEP 3 — TF-IDF Vectorization
  Add all user documents to TfIdf instance (indices 0..M-1)
  Add all related keyword documents to TfIdf instance (indices M..M+K-1)
  Extract term vectors for each document

STEP 4 — Cosine Similarity Matrix
  For each related keyword vector (K vectors):
    Sum cosine similarity against ALL user profile vectors (M vectors)
    Apply random perturbation (±5-10%)
  Result: score[k] = Σ cosineSim(user_m, related_k) for m in 0..M-1

STEP 5 — Ranked Selection with Diversity
  Sort related keywords by aggregate score descending
  Take top (topN + 5) candidates for selection pool
  Shuffle pool (Fisher-Yates) for diversity
  For each candidate keyword (in shuffled order):
    If keyword not already used:
      Randomly select one track from that keyword's associated tracks
      Add to recommendations
  Fill remaining slots from unused keywords until topN reached

OUTPUT: Track[] of length topN
```

### 4.3 Weight Formula

```
weight(track) = likedWeight × (α × recencyWeight + β × playCountWeight) × randomFactor

Where:
  likedWeight    = track.liked ? 2.0 : 1.0
  recencyWeight  = max(0, 1 - (now - track.lastPlayedAt) / (RECENCY_DECAY_DAYS × 86400000))
  playCountWeight = min(5, track.playCount / 5)
  α = 0.5 (recency importance)
  β = 0.5 (play count importance)
  randomFactor   = 0.9 + Math.random() × 0.2  (±10% jitter)
```

---

## 5. Data Fetching Strategy

### 5.1 User Listen History

```typescript
// Fetch user's recent listen history (last 100 tracks) with full track metadata
const history = await prisma.listenHistory.findMany({
  where: { userId },
  orderBy: { lastPlayedAt: 'desc' },
  take: 100,
  include: {
    track: true,  // joins Tracks table for genre, tags, artist
  },
});
```

### 5.2 Related Tracks Corpus

Two sources combined:

**Source A — Cached Search Results** (already populated by `TracksModule`):
```typescript
const cachedSearches = await prisma.searchQuery.findMany({
  where: {
    expiresAt: { gt: new Date() },  // only non-expired cached searches
  },
  include: {
    results: {
      include: { track: true },
    },
  },
  take: 50,  // limit corpus size for performance
});
```

**Source B — Curated Keyword Cache** (populated by legacy frontend `POST /api/music/cache-related-tracks`):
```typescript
const curatedKeywords = await prisma.searchQuery.findMany({
  where: {
    queryType: 'CURATED_KEYWORD',
  },
  include: {
    results: {
      include: { track: true },
    },
  },
});
```

Both sources are merged into a single related tracks corpus for TF-IDF vectorization.

---

## 6. Caching Recommendations

### Why Cache

TF-IDF computation over 100 user tracks × 50+ keyword groups is CPU-bound (~50-200ms). For the same user requesting recommendations multiple times within a short window, we should avoid recomputation.

### Strategy

- **In-memory Map** keyed by `userId` with 1-hour TTL
- On cache hit: return cached recommendations
- On cache miss: compute, store, return
- Cache invalidated when user plays a new track (`HistoryService` can emit an event)

---

## 7. Legacy Compatibility: `POST /api/music/cache-related-tracks`

The existing frontend sends `POST /api/music/cache-related` with `{ keyword, tracks[] }` to populate the related tracks cache. For backward compatibility during migration:

- Expose `POST /api/music/cache-related-tracks` endpoint in `RecommendationsController`
- Upsert `SearchQuery` row with `queryType = CURATED_KEYWORD`
- Upsert `Tracks` rows for each track in the payload
- Create `QueryTrackResult` junction rows

This ensures the recommendation engine has corpus data even if the user hasn't performed many searches through the new `TracksModule`.

---

## 8. npm Dependencies

| Package | Version | Purpose | Already Installed? |
|---|---|---|---|
| `natural` | `^7.x` | TF-IDF vectorization and term extraction | **No** — needs `npm install natural` |

> `natural` is a pure JavaScript NLP library. It has zero native dependencies, making it safe for containerized deployments. The `TfIdf` class it provides is the same one used in the legacy `recommend.js`.

---

## 9. Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `RECENCY_DECAY_DAYS` | `30` | Number of days over which recency weight decays from 1.0 to 0.0 |
| `RECOMMENDATION_CACHE_TTL_MS` | `3600000` (1 hour) | In-memory recommendation cache time-to-live |
| `RECOMMENDATION_MAX_HISTORY` | `100` | Maximum user history tracks to include in TF-IDF profile |
| `RECOMMENDATION_MAX_CORPUS` | `50` | Maximum search query groups to include in related corpus |

---

## 10. Verification Plan

1. **Recommendation Generation**:
   - User with listen history (5+ tracks with genres) calls `POST /api/music/recommend` → returns ranked track array
   - Verify returned tracks are NOT duplicates of user's existing history
   - Verify response includes `topN` tracks (or fewer if corpus is small)

2. **Cache Behavior**:
   - Call recommend twice within 1 hour for same user → second call returns faster (cache hit)
   - Play a new track → cache invalidated → next recommend call recomputes

3. **Legacy Compatibility**:
   - `POST /api/music/cache-related-tracks` with `{ keyword: "lofi", tracks: [...] }` → creates `SearchQuery` with `queryType = CURATED_KEYWORD`

4. **Edge Cases**:
   - User with no listen history → returns empty array with appropriate message
   - User with history but no related tracks corpus → returns empty array
   - `topN = 0` → returns empty array
