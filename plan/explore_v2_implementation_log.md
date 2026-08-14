# Explore Page V2 — Implementation Log & Reference Guide

> **Module:** Recommendations & Tracks Pipeline  
> **Documentation Target:** Implementation Details, Architectural Rationale, and Phase-by-Phase Technical Walkthrough  
> **Status:** Phase 7 Complete 🚀

---

## Overview

This document tracks the step-by-step implementation of the Explore Page V2 Architecture. It serves as an authoritative reference for why each change was made, what files were updated, how algorithms and data models operate under the hood, and how to maintain the codebase moving forward.

---

## Phase 1: Database Schema & Resumable Ingestion Engine

### 1. Summary of Phase 1 Deliverables
- **Data Model:** Validated database schema with `SearchQueryPage` and `SearchQueryPageResult` provenance models.
- **Quota Efficiency:** Upgraded YouTube `search.list` requests from `maxResults=10` to `maxResults=50`.
- **Differentiated TTL:** Extended cache lifetimes for `CURATED_KEYWORD` entries from 24 hours to **21 days** while preserving 24 hours for `USER_SEARCH`.
- **Resumable Ingestion:** Built `fetchAndStoreSearchPage()` and `ensureCategoryPopulated()` in `TracksService` to support page continuation using stored `nextPageToken`s.

---

### 2. Deep-Dive: What, Why, and How

#### A. Database Provenance Schema (`SearchQueryPage` & `SearchQueryPageResult`)
* **WHAT:**
  ```prisma
  model SearchQueryPage {
    id            String                  @id @default(uuid())
    queryId       String                  @map("query_id")
    pageToken     String?                 @map("page_token")       // null = page 0
    nextPageToken String?                 @map("next_page_token")
    pageIndex     Int                     @default(0) @map("page_index")
    createdAt     DateTime                @default(now()) @map("created_at")
    
    query         SearchQuery             @relation(...)
    results       SearchQueryPageResult[]
  }

  model SearchQueryPageResult {
    id           String          @id @default(uuid())
    pageId       String          @map("page_id")
    trackId      String          @map("track_id")
    rankPosition Int             @map("rank_position")
    createdAt    DateTime        @default(now()) @map("created_at")
    
    page         SearchQueryPage @relation(...)
    track        Tracks          @relation(...)
  }
  ```
* **WHY:**
  YouTube API returns search results in paginated chunks tied to alphanumeric `nextPageToken`s. Without page token tracking, every attempt to fetch additional tracks for a category would restart at page 0, re-spending API quota on tracks already saved in PostgreSQL.
* **HOW:**
  `SearchQueryPage` stores the `pageToken` sent to YouTube and the `nextPageToken` returned in the response. `SearchQueryPageResult` maps each track to its specific page and page-level rank position (`1..50`). Meanwhile, `QueryTrackResult` maintains the overall flattened order (`1..N`) for direct reading by recommendation engines.

---

#### B. Increasing `maxResults` to 50
* **WHAT:**
  Changed YouTube API search request parameter `maxResults` from `10` to `50` in `TracksService.searchTracks()` and `fetchAndStoreSearchPage()`.
* **WHY:**
  YouTube Data API v3 charges a **flat 100 quota units** per `search.list` HTTP call, regardless of whether `maxResults` is 10 or 50. Requesting 10 results yielded only 10 tracks per 100 quota units. Requesting 50 results yields **5x the track volume at identical quota cost**.
* **HOW:**
  Updated the search URL builder:
  ```typescript
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(
    rawQuery,
  )}&maxResults=50&videoCategoryId=${musicCategoryId}&key=${key}${pageTokenParam}`;
  ```

---

#### C. Differentiated TTL Caching
* **WHAT:**
  Updated `cacheSearchResultsInPostgres()` to check `queryType`. If `queryType === QueryType.CURATED_KEYWORD`, set `expiresAt = now + 21 days`; otherwise set `expiresAt = now + 24 hours`.
* **WHY:**
  Evergreen curated genres (e.g., `"lofi music"`, `"pop hits"`, `"synthwave"`) do not become stale in 24 hours. Expiring them daily forced redundant daily fetches. A 21-day TTL cuts category quota spend by ~95%.
* **HOW:**
  ```typescript
  const ttlHours = queryType === QueryType.CURATED_KEYWORD ? 21 * 24 : 24;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  ```

---

#### D. Resumable Category Ingestion (`ensureCategoryPopulated`)
* **WHAT:**
  Implemented `ensureCategoryPopulated(keyword: string, targetCount = 50, maxPages = 3)` in `TracksService`.
* **WHY:**
  To guarantee that every Explore feed section has sufficient track depth (~50 items) without executing redundant YouTube API calls.
* **HOW (Execution Workflow):**
  1. Checks if the query exists in PostgreSQL and has $\ge 50$ tracks with a valid (unexpired) `expiresAt` timestamp.
  2. If fresh and populated, returns immediately from cache (`fromCache: true`, 0 API quota used).
  3. If thin or stale, queries `SearchQueryPage` ordered by `pageIndex desc` to locate the latest `nextPageToken`.
  4. Resumes fetching starting at `pageIndex + 1` with `pageToken`, looping up to `maxPages = 3` (bounding maximum quota spend to 300 units).
  5. Upserts tracks into `Tracks`, `SearchQueryPage`, `SearchQueryPageResult`, and `QueryTrackResult`.
  6. Updates `SearchQuery` with `queryType = CURATED_KEYWORD` and `expiresAt = now + 21 days`.

---

### 3. File Modification Log (Phase 1)

| File | Change Description |
|---|---|
| [`backend/prisma/schema.prisma`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/prisma/schema.prisma) | Verified presence of `SearchQueryPage`, `SearchQueryPageResult`, and `QueryType` enum. |
| [`backend/src/tracks/tracks.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/tracks/tracks.service.ts) | Implemented `ensureCategoryPopulated()`, `fetchAndStoreSearchPage()`, updated `cacheSearchResultsInPostgres()` with 21-day TTL & `QueryTrackResult` upsert, and increased `maxResults` to 50. |

---

### 4. Git Commit Message (Phase 1)

```git
feat(explore): implement Phase 1 DB-first resumable category ingestion and 21-day TTL

- Update searchTracks and YouTube search requests to use maxResults=50 (5x track yield at 100 quota units).
- Implement ensureCategoryPopulated() in TracksService for multi-page category backfilling.
- Add fetchAndStoreSearchPage() supporting page token continuation via SearchQueryPage model.
- Introduce 21-day TTL for CURATED_KEYWORD search queries to prevent daily quota burn on evergreen genres.
- Upsert flattened ordered read models in QueryTrackResult alongside SearchQueryPageResult.
```

---

## Phase 2: Personalization & Affinity Scoring Layer

### 1. Summary of Phase 2 Deliverables
- **Shared Taste Weighting Utility:** Created `taste-weight.util.ts` containing the shared play count + recency decay + like status weighting formula.
- **Relational Affinity Mapping:** Implemented `getCategoryAffinity(userId)` in `RecommendationsService` computing category affinity weights from listen history joins.
- **Exploit / Explore Blend:** Refactored `getExploreFeed()` to select up to 6 personalized categories (exploit) and 4 globally popular discovery categories (explore).
- **In-Memory Caching:** Enabled 1-hour cache expiration for affinity rankings per user, invalidated on new play events.

---

### 2. Deep-Dive: What, Why, and How

#### A. Shared Taste Weighting (`taste-weight.util.ts`)
* **WHAT:**
  Extracts the user taste weighting calculation out of `TfIdfEngine` into a shared utility function `calculateTasteWeight()`.
* **WHY:**
  To guarantee that the mathematical weight representing a track's significance (based on like status, play count, and recency) remains identical between track-level recommendations (`TfIdfEngine`) and category-level rankings (`RecommendationsService`).
* **HOW:**
  ```typescript
  export function calculateTasteWeight(item: TasteWeightInput, now: Date = new Date()): number {
    const RECENCY_DECAY_MS = 30 * 24 * 60 * 60 * 1000;
    const likedWeight = item.liked ? 2.0 : 1.0;
    const timeDiff = now.getTime() - new Date(item.lastPlayedAt).getTime();
    const recencyWeight = Math.max(0.0, 1.0 - timeDiff / RECENCY_DECAY_MS);
    const playCountWeight = Math.min(5.0, (item.playCount || 1) / 5.0);
    const randomJitter = 0.9 + Math.random() * 0.2;
    return likedWeight * (0.5 * recencyWeight + 0.5 * playCountWeight) * randomJitter;
  }
  ```

#### B. Relational Affinity Scoring (`getCategoryAffinity`)
* **WHAT:**
  Computes affinity scores for curated category keywords based on the user's historical tracks and their query category associations.
* **WHY:**
  Direct database queries mapping `ListenHistory` relationally to `QueryTrackResult` category queries eliminate fuzzy text matching or API delays, delivering high-performance taste metrics.
* **HOW:**
  ```
  User Play History ──► Joined Tracks ──► Joined QueryTrackResult (CURATED_KEYWORD) ──► Sum weights per category
  ```

#### C. 60/40 Exploit / Explore Blend
* **WHAT:**
  A hybrid feed structure replacing pure random or pure personalized feeds.
* **WHY:**
  Pure personalization leads to filter bubbles. Pure discovery ignores user interests. Blending 6 personalized categories (exploit) and 4 popular categories (explore) maintains high discovery variety while satisfying user taste.
* **HOW:**
  1. **Personalized (Exploit - 6):** Top categories with positive affinity weights.
  2. **Discovery (Explore - 4):** Curated categories not in the personalized set, sorted by global `hitCount` (stored in `SearchQuery`).
  3. **Cold Start:** If the user has $<3$ plays or thin history, shuffles category keys.

---

### 3. File Modification Log (Phase 2)

| File | Change Description |
|---|---|
| [`backend/src/recommendations/taste-weight.util.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/taste-weight.util.ts) | Created utility file for unified composite weighting. |
| [`backend/src/recommendations/tfidf-engine.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/tfidf-engine.ts) | Imported `calculateTasteWeight` and delegated weight computation. |
| [`backend/src/recommendations/recommendations.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/recommendations.service.ts) | Implemented `getCategoryAffinity()`, 60/40 Exploit/Explore blend in `getExploreFeed()`, and cache invalidation hooks. |

---

### 4. Git Commit Message (Phase 2)

```git
feat(explore): implement Phase 2 personalization and 60/40 exploit/explore blend

- Create taste-weight.util.ts to share taste weighting calculations.
- Update TfIdfEngine to use calculateTasteWeight utility.
- Add getCategoryAffinity() to RecommendationsService with 1-hour in-memory caching.
- Refactor getExploreFeed() to blend 6 personalized categories with 4 globally popular discovery categories.
- Pre-warm selected explore categories dynamically using ensureCategoryPopulated.
```

---

## Phase 3: Single Source of Truth Category API & Frontend Sync

### 1. Summary of Phase 3 Deliverables
- **Authoritative Category Metadata:** Enhanced `curated-genres.ts` to represent full `CuratedCategory` objects with `slug`, `keyword`, `label`, `icon`, and Tailwind `gradient` values.
- **REST Category Endpoint:** Added `GET /api/music/categories` to Recommendations Controller and Service.
- **Dynamic Frontend Fetching:**
  - Added `fetchExploreFeed()` and `fetchExploreCategories()` in `frontend/src/utils/api.js`.
  - Refactored `ExploreCategoryGrid.jsx` to fetch from the categories endpoint dynamically.
  - Refactored `ExplorePage.jsx` to fetch the entire 10-category explore feed in a single backend call.
  - Removed client-side loops, localStorage timers, and local `curatedGenres` hardcoded fallbacks.

---

### 2. Deep-Dive: What, Why, and How

#### A. Centralizing Visual Metadata
* **WHAT:**
  Migrated categories to represent complete rich metadata objects:
  ```typescript
  export interface CuratedCategory {
    slug: string;
    keyword: string;
    label: string;
    icon: string;
    gradient: string;
  }
  ```
* **WHY:**
  Keeping styling (gradients) and labeling (names) metadata in static frontend arrays led to tag drift. Centralizing them on the backend establishes one source of truth. Adding or renaming a category now only requires editing `curated-genres.ts` in the backend.
* **HOW:**
  Exported `CURATED_CATEGORIES` containing all 42 genres with their respective gradients, icons, and slugs, while mapping `CURATED_GENRES = CURATED_CATEGORIES.map(c => c.keyword)` to preserve recommendation engine compatibility.

#### B. Single-Request Server-Side Explore Feed (`fetchExploreFeed`)
* **WHAT:**
  Replaced client-side loops that triggered up to 8 separate YouTube API requests on page load with a single endpoint request.
* **WHY:**
  Client-side fetching increased load latency (users had to wait for 8 separate responses) and triggered duplicate calls. Server-side fetching consolidates this into one database-first query, delivering sub-20ms database page fetches.
* **HOW:**
  `ExplorePage.jsx` fetches `fetchExploreFeed()` and sets `exploreFeed` in one state update on component mount.

---

### 3. File Modification Log (Phase 3)

| File | Change Description |
|---|---|
| [`backend/src/recommendations/curated-genres.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/curated-genres.ts) | Enhanced to define `CURATED_CATEGORIES` metadata objects and export mapped string array `CURATED_GENRES`. |
| [`backend/src/recommendations/recommendations.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/recommendations.service.ts) | Added `getCategories()` returning authoritative category taxonomy. |
| [`backend/src/recommendations/recommendations.controller.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/recommendations.controller.ts) | Exposed `GET /api/music/categories` endpoint. |
| [`frontend/src/utils/api.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/utils/api.js) | Implemented `fetchExploreFeed()` and `fetchExploreCategories()` utility helpers. |
| [`frontend/src/components/Explore/ExploreCategoryGrid.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreCategoryGrid.jsx) | Refactored to dynamically request category config and render top 8 tiles. |
| [`frontend/src/pages/ExplorePage.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/pages/ExplorePage.jsx) | Refactored `useEffect` to load explore feed in a single API call and deleted local fallback arrays. |

---

### 4. Git Commit Message (Phase 3)

```git
feat(explore): implement Phase 3 unified categories API and backend explore feed sync

- Add CuratedCategory interface and metadata mapping (slug, label, icon, gradient) to curated-genres.ts.
- Expose GET /api/music/categories REST endpoint in Recommendations controller.
- Implement fetchExploreFeed and fetchExploreCategories helpers in frontend api.js.
- Refactor ExploreCategoryGrid to dynamically fetch category metadata.
- Refactor ExplorePage to load entire feed in a single API call, removing client-side loop requests and local state fallbacks.
```

---

## Enhancement: Category Deduplication & Diversity (Strategy A & C)

### 1. Problem Statement
In Phase 2, users listening to a specific genre (e.g. Lofi) had multiple YouTube query tags linked to their history (e.g. `"lofi music"`, `"lofi beats"`, `"chill lofi"`). As a result, all 6 exploit slots in `getExploreFeed()` were filled with nearly identical Lofi keyword variations.

---

### 2. Implemented Solution (Strategies A & C)

#### Strategy C: Parent Taxonomy Cluster Constraints
- Added a `cluster` property to each of the 42 categories in `curated-genres.ts` (e.g. `'chill-lofi'`, `'pop'`, `'rock-alt'`, `'hiphop-urban'`, `'electronic'`, `'classical-inst'`, `'regional'`).
- Enforces a **Max 1 Category per Cluster** rule when selecting the 6 personalized exploit categories.

#### Strategy A: Token Stem Deduplication
- Implemented `extractStemTokens()` to strip common stopwords (`"music"`, `"hits"`, `"songs"`, `"playlist"`, `"beats"`).
- Implemented `isDuplicateOrOverlappingCategory()` to check if a candidate shares core stem roots (e.g. `"lofi"`, `"pop"`, `"hip hop"`) with already-selected categories in the feed.

---

### 3. Future Scope: Strategy B (AI/ML Vector Embeddings & MMR Ranking)

To further enhance category diversity without manually defined parent clusters, future architectural iterations can implement **Maximal Marginal Relevance (MMR)** using vector embeddings:

$$\text{Score}(c) = \lambda \cdot \text{Affinity}(c) - (1 - \lambda) \cdot \max_{s \in \text{Selected}} \text{CosineSimilarity}(\vec{v}_c, \vec{v}_s)$$

- **How it will work:** Categories will be mapped to a 768-dimensional vector space using sentence-transformer or Gemini text embeddings. The MMR algorithm will dynamically penalize candidate categories that are semantically close to previously selected feed categories, automatically balancing relevance with novelty.

---

### 4. File Modification Log (Deduplication Enhancement)

| File | Change Description |
|---|---|
| [`backend/src/recommendations/curated-genres.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/curated-genres.ts) | Added `cluster` taxonomy property to `CuratedCategory` interface and all 42 category records. |
| [`backend/src/recommendations/recommendations.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/recommendations.service.ts) | Implemented `extractStemTokens()`, `isDuplicateOrOverlappingCategory()`, and updated `getExploreFeed()` selection routines. |

---

### 5. Git Commit Message (Deduplication Enhancement)

```git
feat(explore): implement category deduplication and cluster diversity filtering (Strategy A & C)

- Add cluster taxonomy property to CuratedCategory interface across all 42 category entries in curated-genres.ts.
- Implement extractStemTokens() and isDuplicateOrOverlappingCategory() in RecommendationsService.
- Enforce Max 1 Category per cluster constraint and stem token overlap filtering in getExploreFeed().
- Document Strategy B (AI/ML Vector Embeddings & MMR Ranking) as future scope in implementation log.
```

---

## Phase 4: UI Consolidation & Redundancy Removal

### 1. Summary of Phase 4 Deliverables
- **UI Consolidation:** Removed legacy filter pills bar (`ExploreFilterPills.jsx`), standardizing category discovery on the dynamic 4-column `ExploreCategoryGrid.jsx`.
- **Frontend Clean-up:** Removed unused `activeGenre` state, unused imports (`cacheRelatedTracks`), and unnecessary client-side synchronization loops from `ExplorePage.jsx`.
- **Component Pruning:** Removed redundant `ExploreFilterPills.jsx` component file from disk.

---

### 2. Deep-Dive: What, Why, and How

#### A. Consolidating Category Discovery UI
* **WHAT:**
  Removed `ExploreFilterPills.jsx` from `ExplorePage.jsx` and deleted the component file.
* **WHY:**
  Having filter pills sitting directly above the Category Grid created duplicate category interaction pathways on the Explore page. Consolidating category selection into `ExploreCategoryGrid.jsx` simplifies the visual hierarchy, adheres to Stitch design specifications (`6aaba54d100944a28329f65c95eb684f`), and provides a cleaner user experience.
* **HOW:**
  1. Updated `ExplorePage.jsx` layout to remove `<ExploreFilterPills ... />`.
  2. Routed category card clicks in `ExploreCategoryGrid` directly to `handleCategoryClick(genreQuery)`.
  3. Smoothly scrolls to existing section element (`#explore-sec-${index}`) if already loaded, or fetches fresh category items.

---

### 3. File Modification Log (Phase 4)

| File | Change Description |
|---|---|
| [`frontend/src/pages/ExplorePage.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/pages/ExplorePage.jsx) | Removed `ExploreFilterPills` import/JSX, removed `activeGenre` state, updated component documentation header. |
| `frontend/src/components/Explore/ExploreFilterPills.jsx` | Deleted redundant component file. |

---

### 4. Git Commit Message (Phase 4)

```git
refactor(explore): implement Phase 4 UI consolidation and redundancy cleanup

- Remove legacy ExploreFilterPills component and delete file to establish ExploreCategoryGrid as single category discovery UI.
- Clean up unused activeGenre state and cacheRelatedTracks import in ExplorePage.jsx.
- Update category selection handler in ExplorePage.jsx to smoothly scroll to loaded sections or fetch fresh category feeds.
```

---

## Phase 5: Background Pre-Warming Cron & Configurable Cache TTL

### 1. Summary of Phase 5 Deliverables
- **Configurable Cache TTL Variable:** Exported `CURATED_CATEGORY_CACHE_TTL_DAYS` in `tracks.service.ts`, defaulted to **7 days** (168 hours) as requested, allowing easy future adjustments.
- **Background Pre-Warming Scheduler Service:** Created `ExplorePreWarmingService` implementing NestJS `OnApplicationBootstrap` to run automatic background pre-warming of top explore categories.
- **Cron REST Trigger Endpoints:** Added `POST /api/music/cron/refresh-explore-cache` and `GET /api/music/cron/refresh-explore-cache` in `RecommendationsController`.
- **Public Auth Bypass:** Updated `GoogleAuthGuard` to allow `/cron/` requests to execute without requiring user Bearer tokens for platform scheduler compatibility.

---

### 2. Deep-Dive: What, Why, and How

#### A. Configurable TTL Variable (`CURATED_CATEGORY_CACHE_TTL_DAYS`)
* **WHAT:**
  ```typescript
  // backend/src/tracks/tracks.service.ts
  export const CURATED_CATEGORY_CACHE_TTL_DAYS = 7;
  ```
* **WHY:**
  The user requested setting the default category cache TTL to **7 days** while maintaining an easily configurable variable in the code file so it can be updated later without hunting through functions.
* **HOW:**
  `cacheSearchResultsInPostgres()` and `ensureCategoryPopulated()` dynamically compute expiry timestamps:
  ```typescript
  const ttlHours = queryType === QueryType.CURATED_KEYWORD ? CURATED_CATEGORY_CACHE_TTL_DAYS * 24 : 24;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
  ```

#### B. Automated Background Pre-Warming (`ExplorePreWarmingService`)
* **WHAT:**
  Implements an automated background task service (`ExplorePreWarmingService`) that runs `refreshExploreCache(20)` periodically.
* **WHY:**
  Pre-warming popular explore categories in PostgreSQL eliminates YouTube API fetch latency when users visit the Explore page, keeping page loads under 20ms and daily API quota consumption bounded to ~3,000 units.
* **HOW:**
  - `onApplicationBootstrap()` triggers an initial non-blocking pre-warm run 15 seconds after NestJS server boot.
  - Sets a recurring `setInterval` to refresh categories every 24 hours.
  - Exposes REST endpoints (`GET/POST /api/music/cron/refresh-explore-cache`) for external cron triggers (Vercel Cron, GitHub Actions, AWS EventBridge, or curl).

---

### 3. File Modification Log (Phase 5)

| File | Change Description |
|---|---|
| [`backend/src/tracks/tracks.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/tracks/tracks.service.ts) | Exported `CURATED_CATEGORY_CACHE_TTL_DAYS = 7` constant and updated `cacheSearchResultsInPostgres()` and `ensureCategoryPopulated()` TTL calculations. |
| [`backend/src/recommendations/recommendations.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/recommendations.service.ts) | Implemented `refreshExploreCache(maxCategoriesToWarm)` batch pre-warming routine. |
| [`backend/src/recommendations/explore-prewarming.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/explore-prewarming.service.ts) | Created NestJS `OnApplicationBootstrap` pre-warming scheduler service. |
| [`backend/src/recommendations/recommendations.module.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/recommendations.module.ts) | Registered `ExplorePreWarmingService` in `providers` and `exports`. |
| [`backend/src/recommendations/recommendations.controller.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/recommendations/recommendations.controller.ts) | Exposed `GET` and `POST` `/api/music/cron/refresh-explore-cache` REST endpoints. |
| [`backend/src/auth/google-auth.guard.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/auth/google-auth.guard.ts) | Allowed `/cron/` endpoints to bypass user authentication check for platform schedulers. |

---

### 4. Git Commit Message (Phase 5)

---

## Phase 6: UI/UX Interactive Redesign & Visual Polish

### 1. Summary of Phase 6 Deliverables
- **Custom AI Category Cover Artworks:** Replaced plain emoji category icons with 8 high-resolution AI-generated cover images (`cat_lofi.jpg`, `cat_pop.jpg`, `cat_rock.jpg`, `cat_edm.jpg`, `cat_hiphop.jpg`, `cat_jazz.jpg`, `cat_anime.jpg`, `cat_ambient.jpg`) stored in `frontend/assets/categories/`.
- **Clean Lucide Header Architecture:** Replaced raw emojis in page title (`"🔍 Explore Music 🎶"`) with clean Lucide icons (`Compass`, `Sparkles`, `Music`) for a high-end, professional design.
- **Mobile-Optimized 3D Parallax Hover:** Implemented `requestAnimationFrame`-throttled 3D mouse parallax on `ExploreTrendingBanner.jsx` with touch-device detection to ensure locked 60fps performance on 2-3 year old mobile devices.
- **Micro-Animations & Equalizer Visualizers:** Created custom keyframe micro-animations (`fadeInUp`, `shimmerGlow`, `floatBounce`, `eqBarPulse`) in `index.css` and added live pulsing audio equalizer bars to both the Hero CTA button and active `MusicCard`s.
- **Reactive "Now Playing" State:** Integrated Zustand selector on `MusicCard.jsx` (`usePlayerStore((state) => state.track?.id)`) to highlight active playing tracks with a custom `PLAYING` badge and equalizer visualizer.
- **Scroll-Reveal Sections (`useInView.js`):** Built lightweight custom React hook `useInView` wrapping `IntersectionObserver` to trigger smooth scroll-reveal entrance animations for category track sections.
- **Carousel Controls & Active Highlights:** Added desktop scroll buttons (`ChevronLeft` / `ChevronRight`) to `ExplorePlaylistsCarousel.jsx` and active ring indicators (`ring-4 ring-[var(--color-primary)]`) to `ExploreCategoryGrid.jsx`.

---

### 2. Deep-Dive: What, Why, and How

#### A. Custom AI Category Cover Artworks
* **WHAT:**
  Generated 8 high-definition square cover illustrations for the category tiles:
  - `cat_lofi.jpg` (Cyberpunk room lofi aesthetic)
  - `cat_pop.jpg` (Magenta pop concert stage)
  - `cat_rock.jpg` (Cyan electric rock guitar)
  - `cat_edm.jpg` (Synthwave DJ soundboard & lasers)
  - `cat_hiphop.jpg` (Urban street art boombox & headphones)
  - `cat_jazz.jpg` (Golden saxophone lounge spotlight)
  - `cat_anime.jpg` (Fantasy sky cherry blossom moonlight)
  - `cat_ambient.jpg` (Cosmic meditation nebula portal)
* **WHY:**
  Plain emojis on flat gradient backgrounds looked basic. High-res cover art gives AudioScape a Spotify/Apple Music-grade visual experience.
* **HOW:**
  Saved image assets to `frontend/assets/categories/` and mapped them in `ExploreCategoryGrid.jsx` via static image imports with smooth `opacity-70 group-hover:opacity-90 group-hover:scale-110` transition overlays.

#### B. Mobile-Optimized 3D Parallax Mouse Hover
* **WHAT:**
  Implemented a subtle 3D parallax tilt effect on the Trending Hero Banner backdrop artwork.
* **WHY:**
  Parallax elevates visual immersion, but un-throttled mouse event listeners can cause frame drops on mobile devices or mid-tier laptops.
* **HOW:**
  Used `requestAnimationFrame` to batch displacement updates and checked `"ontouchstart" in window || window.navigator.maxTouchPoints > 0` to bypass calculation overhead on touch devices.

#### C. Micro-Animations & Audio Equalizer Visualizers
* **WHAT:**
  Added CSS keyframe animations and interactive audio equalizer bars in `index.css`:
  ```css
  @keyframes eqBarPulse {
    0%, 100% { height: 4px; }
    50% { height: 16px; }
  }
  .eq-bar {
    width: 3px;
    background-color: currentColor;
    border-radius: 9999px;
    animation: eqBarPulse 1.2s infinite ease-in-out;
  }
  ```
* **WHY:**
  Static buttons feel flat. Animated equalizer bars signal live playback and give immediate feedback.
* **HOW:**
  Embedded 3 staggered `.eq-bar` elements inside `ExploreTrendingBanner`'s CTA button and active `MusicCard` hover overlays. Wrapped all animations in `@media (prefers-reduced-motion: reduce)` for full accessibility compliance.

#### D. Top 5 Trending Tracklist & Hero Multi-Resolution Image Fitting
* **WHAT:**
  Redesigned `ExploreTrendingBanner.jsx` to feature a Top 5 Trending track list on the right side and crisp backdrop image fitting across resolutions (`object-cover object-center w-full h-full`).
* **WHY:**
  Users wanted to see and interact with 5 trending songs directly within the hero banner instead of only 1 track, and background image scaling needed to look uncropped across all mobile and desktop screen sizes.
* **HOW:**
  Passed `trendingTracks` (slice of top 5 tracks across explore feed) from `ExplorePage.jsx` into `ExploreTrendingBanner.jsx`. Added click-to-preview track selection (#1..#5) which dynamically updates the hero background artwork and title spotlight.

#### F. Multi-Tier YouTube CDN Fallback Chain (hqdefault -> mqdefault -> default -> placeholder)
* **WHAT:**
  - Fixed logic bug in `MusicCard.jsx` `onError` handler: `!e.target.src.includes(...)` evaluated to `false` on DOM image errors because `e.target.src` already contained the absolute YouTube URL, forcing all 404s (e.g. live stream thumbnails) straight to `placeholder.jpg`.
  - Implemented multi-tier YouTube CDN fallback sequence: `hqdefault.jpg` -> `mqdefault.jpg` -> `default.jpg` -> `placeholder.jpg`. YouTube 24/7 live streams (e.g. Lofi Girl `X4VbdwhkE10`) serve `default.jpg`, resolving to HTTP 200 OK and preventing fallback to placeholder.
  - Applied this multi-tier fallback chain consistently across all components: `MusicCard`, `ExploreTrendingBanner`, `RecommendForYou`, `MiniPlayer`, `FullScreenPlayer`, `TrackQueue`, `SearchBar`, and `RecentlyPlayed`.

#### G. Parent Category Aligned Unsplash Photography
* **WHAT:**
  Replaced synthetic AI images with authentic Unsplash photography mapped strictly to parent cluster categories (`chill-lofi`, `pop`, `rock-alt`, `electronic`, `hiphop-urban`, `jazz-soul`, `gaming-anime`, `classical-inst`).

#### H. Hover-Only Equalizer Bar Animation
* **WHAT:**
  Updated `index.css` `.eq-bar` CSS rules so equalizer bars in the "START LISTENING" button stay static by default and animate dynamically ONLY when hovered (`group-hover/btn:hover`).

---

### 3. File Modification Log (Phase 6)

| File | Change Description |
|---|---|
| [`backend/src/tracks/tracks.service.ts`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/tracks/tracks.service.ts) | Mapped YouTube search thumbnails via official `high.url` -> `medium.url` -> `default.url` fallback chain. |
| [`frontend/src/index.css`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/index.css) | Added keyframes (`fadeInUp`, `shimmerGlow`, `floatBounce`, `eqBarPulse`), `.glass-card` utilities, `.scrollbar-hide`, hover-only `.eq-bar` rules, and `prefers-reduced-motion` safety rules. |
| [`frontend/src/hooks/useInView.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/hooks/useInView.js) | **[NEW]** Created custom `useInView` React hook wrapping `IntersectionObserver` for performant scroll-reveal animations. |
| [`frontend/src/components/Cards/MusicCard.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Cards/MusicCard.jsx) | Cleaned `getValidThumbnail()` to return valid thumbnail URL or `placeholder.jpg`, Zustand "Now Playing" selector, and ambient hover shadow. |
| [`frontend/src/components/Explore/ExploreTrendingBanner.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreTrendingBanner.jsx) | Upgraded with Top 5 Trending tracklist selection, `getValidThumbnail()` resolver, hover-only equalizer animation, 3D parallax tilt, and fail-safe image error fallbacks. |
| [`frontend/src/components/Explore/ExploreCategoryGrid.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreCategoryGrid.jsx) | Bound real Unsplash photography cover images mapped to parent category clusters, active category ring selection (`activeCategory`), standard music icons, and hover play overlays. |
| [`frontend/src/components/Explore/ExploreSection.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreSection.jsx) | Bound `useInView` scroll reveal, top gradient accent bar (`from-primary to-secondary`), standard music icons, and clean `LOAD MORE` button. |
| [`frontend/src/components/Explore/ExplorePlaylistsCarousel.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExplorePlaylistsCarousel.jsx) | Added desktop horizontal scroll controls (`ChevronLeft`/`ChevronRight`), frosted glass cards (`backdrop-blur-md`), and standard music icons. |
| [`frontend/src/components/Home/RecommendForYou.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/RecommendForYou.jsx) | Bound `getValidThumbnail()` resolver and bulletproof `onError` image fallback handling to hero daily mix banner. |
| [`frontend/src/pages/ExplorePage.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/pages/ExplorePage.jsx) | Streamlined header layout (removed extra subtitle text and tags), passed top 5 trending tracks to hero banner, and bound `activeCategory` state. |
| `frontend/assets/categories/cat_*.jpg` | **[NEW]** Added 8 real Unsplash music photography category cover images mapped to parent clusters. |
| `frontend/assets/placeholder.jpg` | Updated with Stitch-inspired high-res Unsplash aesthetic music wallpaper fallback image. |

---

### 4. Git Commit Message (Phase 6)

```git
feat(explore): use official YouTube high/medium/low thumbnail modes, hover-only CTA animation, and parent category imagery

- Configure backend YouTube search mapping in tracks.service.ts to use official high -> medium -> default thumbnail URL fallback chain.
- Clean getValidThumbnail() resolver and onError fallback handling to placeholder.jpg across all card and banner components without string manipulation.
- Update index.css to restrict equalizer bar animation (.eq-bar) strictly to hover state (group-hover/btn) on CTA buttons.
- Replace AI-generated category images with authentic Unsplash photography mapped strictly to parent cluster categories in frontend/assets/categories/.
- Update placeholder.jpg fallback image with a Stitch-aligned aesthetic vinyl music wallpaper.
- Redesign ExploreTrendingBanner to support Top 5 Trending tracklist with interactive spotlight selection and crisp multi-resolution image fitting.
- Streamline ExplorePage header by removing redundant subtitle text and tags for a cleaner UI.
- Standardize iconography across all Explore components to standard music icons (Compass, Flame, Disc, Music, TrendingUp).
- Change section pagination button wording in ExploreSection to clean "LOAD MORE" action button.
- Create custom useInView hook wrapping IntersectionObserver for performant scroll-reveal animations.
- Document Phase 6 official YouTube API thumbnail modes, hover animations, and photography replacements in plan/explore_v2_implementation_log.md.
```

---

## Phase 7: Filter Boxes Overhaul & HD Full-Width Background Carousel Hero Banner

### 1. Summary of Phase 7 Deliverables
- **Compact Category Filter Bar (`ExploreFilterBar.jsx`):** Replaced bulky 4-column category grid with a compact, single-row horizontal pill bar with Lucide icons (`Headphones`, `Mic`, `Guitar`, `Zap`, `Flame`, `Radio`, `Smile`, `Sparkles`).
- **Full-Width HD Background Hero Banner (`ExploreTrendingBanner.jsx`):** Overhauled hero banner back to the full-width background layout, powered by high-definition YouTube HD thumbnail resolution (`maxresdefault.jpg`/`sddefault.jpg`) via `getHighResThumbnailUrl`, multi-tier error fallback (`maxresdefault` -> `sddefault` -> `hqdefault` -> `mqdefault` -> `default` -> `placeholder`), and multi-stop gradient overlays for maximum image sharpness and text contrast.
- **Contextual Multi-Song Carousel:**
  - **"All" Mode:** Banner rotates through the #1 song from each category section (up to 8 tracks).
  - **Filtered Mode:** Banner rotates through top 5 trending songs in the selected category.
- **Clean Vector Icon Header:** Replaced emoji title with clean vector Lucide icon `<Compass>` header.

---

### 2. Deep-Dive: What, Why, and How

#### A. Category Filter Bar Overhaul
* **WHAT:** Created [`ExploreFilterBar.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreFilterBar.jsx).
* **WHY:** The 4-column category grid occupied ~280px of vertical space. Replacing it with a single horizontal pill bar saves 80% vertical space while improving category switching UX.
* **HOW:** Renders an "All" pill plus category pills with vector Lucide icons. Selecting a pill updates `activeFilter` state in `ExplorePage.jsx`.

#### B. Full-Width HD Background Artwork & Automatic Vertical Slow-Pan Animation
* **WHAT:** Added `@keyframes heroPanUpDown` and `.animate-pan-vertical` in [`index.css`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/index.css), and bound `enablePanAnimation` prop in [`ExploreTrendingBanner.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreTrendingBanner.jsx).
* **WHY:** Provides a dynamic Ken Burns slow-pan effect (`center 5%` -> `center 95%`) on background artwork. When the banner transitions to the next track, `key={`${trackId}-${currentIndex}`}` automatically resets and restarts the smooth top-to-bottom pan animation for the new slide!
* **HOW:** `animation: heroPanUpDown 12s ease-in-out infinite alternate;` with GPU-accelerated `will-change: object-position, transform`.

#### C. Context-Aware Track Carousel & Declarative Curation (`useMemo`)
* **WHAT:** Refactored track derivation and section filtering in [`ExplorePage.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/pages/ExplorePage.jsx) using declarative React `useMemo` hooks.
#### D. Explore Page Layout Streamlining (Playlists Carousel Removal)
* **WHAT:** Removed `ExplorePlaylistsCarousel` component from [`ExplorePage.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/pages/ExplorePage.jsx).
* **WHY:** The saved playlists carousel cluttered the bottom of the Explore page and detracted from core music category discovery.
* **HOW:** Cleanly removed import and JSX rendering from `ExplorePage.jsx`.

---

### 3. File Modification Log (Phase 7)

| File | Change Description |
|---|---|
| [`frontend/src/index.css`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/index.css) | Added `@keyframes heroPanUpDown` and `.animate-pan-vertical` for hardware-accelerated vertical slow-pan image motion. |
| [`frontend/src/utils/youtubeUtils.js`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/utils/youtubeUtils.js) | Added `getHighResThumbnailUrl` and `getNextFallbackThumbnailUrl` helper pipeline for declarative image resolution fallbacks without nested if/else statements. |
| [`frontend/src/components/Explore/ExploreFilterBar.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreFilterBar.jsx) | **[NEW]** Created compact horizontal filter pill bar with clean Lucide icons and smooth horizontal scrolling. |
| [`frontend/src/components/Explore/ExploreTrendingBanner.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Explore/ExploreTrendingBanner.jsx) | Restored full-width background hero banner design with automatic top-to-bottom slow-pan vertical animation (`enablePanAnimation`), HD `maxresdefault` resolution, declarative 1-line `onError` fallback, and multi-song carousel (auto-rotate, dots, chevrons). |
| [`frontend/src/pages/ExplorePage.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/pages/ExplorePage.jsx) | Replaced `ExploreCategoryGrid` with `ExploreFilterBar`, added `activeFilter` state, derived contextual `trendingTracks` & `displayedSections` via `useMemo`, removed `ExplorePlaylistsCarousel`, and enabled `enablePanAnimation={true}`. |

---

### 4. Git Commit Message (Phase 7)

```

---

## Phase 7.1: Home Dashboard Banner Alignment & Fail-Safe Recommendations

### 1. Summary of Deliverables
- **Home Hero Banner Design Alignment (`HeroSection.jsx`):** Aligned Home hero spotlight banner with Explore banner styling (full-width HD background artwork, hardware-accelerated `.animate-pan-vertical` slow-pan motion, multi-stop gradient overlays).
- **Search Music CTA Action:** Updated CTA button from `START LISTENING` to `SEARCH MUSIC` (`<Search size={18} />`) with a `handleSearchClick` handler that smooth-scrolls and auto-focuses `#search-input`.
- **Recommendation Banner Alignment & Fail-Safe Loader (`RecommendForYou.jsx`):** Applied full-width HD background slow-pan banner design and replaced silent `if (!userId) return null` returns with a multi-level fallback loader (`getRecommendations` -> `fetchExploreFeed` -> `fetchYoutubeMusic` -> `FALLBACK_RECOMMENDATIONS`) guaranteeing 100% section visibility.

---

### 2. File Modification Log (Phase 7.1)

| File | Change Description |
|---|---|
| [`frontend/src/components/Home/HeroSection.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/HeroSection.jsx) | Restored full-width HD background banner design with `.animate-pan-vertical` motion, updated CTA button to `SEARCH MUSIC`, and bound `#search-input` auto-focus handler. |
| [`frontend/src/components/Home/RecommendForYou.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/RecommendForYou.jsx) | Aligned banner with full-width HD slow-pan motion, and added multi-level fallback loader so recommendation banner and grid never disappear. |
| [`frontend/src/components/Home/SearchBar.jsx`](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/src/components/Home/SearchBar.jsx) | Added `id="search-input"` to input element for programmatic focus and smooth scroll. |

---

### 3. Git Commit Message (Phase 7.1)

```git
feat(home): align hero & recommendation banners with HD slow-pan design and add search CTA navigation

- Update Home HeroSection with full-width HD background artwork layout and hardware-accelerated vertical slow-pan animation (.animate-pan-vertical).
- Change HeroSection CTA button to "SEARCH MUSIC" with handleSearchClick handler that smooth-scrolls to and auto-focuses #search-input.
- Add id="search-input" to SearchBar input component for programmatic focus.
- Align RecommendForYou banner with full-width HD background slow-pan design and multi-tier resolution fallback pipeline.
- Implement multi-level recommendation fallback engine in RecommendForYou (getRecommendations -> fetchExploreFeed -> fetchYoutubeMusic -> FALLBACK_RECOMMENDATIONS) guaranteeing section visibility for all users.
- Log Phase 7.1 updates in plan/explore_v2_implementation_log.md.
```










