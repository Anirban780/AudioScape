# 🔍 AudioScape Search Bar Upgrade & Implementation Blueprint

## Executive Summary & Alignment Review

This document contains the complete, production-grade technical implementation plan for the AudioScape Search System. It incorporates deep code audit findings and user architectural review, resolving critical bugs (pagination duplicates, race conditions, dropdown flicker), delivering high-value UX enhancements (keyboard navigation, optimistic track selection, safe recent searches), and instituting a relational database caching model (`SearchQueryPage`) with local PostgreSQL full-text search.

---

## 1. Audit & Gap Analysis (Post-Review Audit Summary)

Based on thorough codebase inspection and production architectural review, the following key gaps and technical requirements have been identified:

| Item | Target Area | Finding & Technical Solution |
|---|---|---|
| **Relational Paginated Cache** | `schema.prisma` & `tracks.service.ts` | **Gap**: Simple string-concatenated cache keys (`${query}::${pageToken}`) cannot model relational `nextPageToken` navigation or join back to track entities. <br>**Solution**: Add relational tables `SearchQueryPage` and `SearchQueryPageResult` via Prisma DB migration. |
| **FTS Threshold Tuning** | `tracks.service.ts` | **Finding**: Local FTS hit threshold should default to `>= 8` matches, treated as a configurable parameter for empirical tuning rather than a hardcoded rule. |
| **`localStorage` Exception Safety** | `SearchBar.jsx` | **Gap**: `localStorage` access throws uncaught exceptions in Private Browsing / Incognito mode or when storage quota is exceeded. <br>**Solution**: Wrap all `localStorage` reads/writes in defensive `try/catch` blocks. |
| **`Input` Component `forwardRef`** | `utils/components/ui/input.jsx` | **Blocker**: `utils/components/ui/input.jsx` currently lacks `React.forwardRef`. Passing `ref={inputRef}` fails silently. <br>**Solution**: Refactor `Input` with `React.forwardRef((props, ref) => ...)` to forward `ref` to the underlying `<input>`. |
| **Deployment Sequencing & Telemetry** | Migration & Operations | **Gap**: Need zero-downtime deployment ordering and quantitative quota verification post-deploy. <br>**Solution**: Sequence deployment as **Prisma Migration $\rightarrow$ Backend API $\rightarrow$ Frontend UI**, then verify quota reduction via `ApiQuotaUsage` database telemetry. |

---

## 2. Step-by-Step Codebase Modifications

### Step 1: Database Schema & Migration (`backend/prisma/`)

#### [MODIFY] [schema.prisma](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/prisma/schema.prisma)
Add relational models to support multi-page search result caching:

```prisma
model SearchQueryPage {
  id              String                  @id @default(uuid())
  queryId         String                  @map("query_id")
  pageToken       String?                 @map("page_token")          // null for page 0
  nextPageToken   String?                 @map("next_page_token")
  pageIndex       Int                     @default(0) @map("page_index")
  createdAt       DateTime                @default(now()) @map("created_at")

  query           SearchQuery             @relation(fields: [queryId], references: [id], onDelete: Cascade)
  results         SearchQueryPageResult[]

  @@unique([queryId, pageToken])
  @@map("search_query_pages")
}

model SearchQueryPageResult {
  id              String           @id @default(uuid())
  pageId          String           @map("page_id")
  trackId         String           @map("track_id")
  rankPosition    Int              @map("rank_position")

  page            SearchQueryPage  @relation(fields: [pageId], references: [id], onDelete: Cascade)
  track           Tracks           @relation(fields: [trackId], references: [youtubeVideoId], onDelete: Cascade)

  @@unique([pageId, trackId])
  @@map("search_query_page_results")
}
```

- Execute Prisma Migration command: `npx prisma migrate dev --name add_search_query_pages`

---

### Step 2: UI Input Component Refactoring (`utils/components/ui/input.jsx`)

#### [MODIFY] [input.jsx](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/utils/components/ui/input.jsx)
Wrap `Input` with `React.forwardRef` to enable ref forwarding to the native DOM element:

```jsx
import * as React from "react"
import { cn } from "utils/lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      data-slot="input"
      className={cn(
        "border-input file:text-foreground placeholder-white selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
export { Input };
```

---

### Step 3: Frontend Search Component (`frontend/components/Home/SearchBar.jsx`)

#### [MODIFY] [SearchBar.jsx](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/frontend/components/Home/SearchBar.jsx)

1. **State & Ref Architecture**:
   - `selectedIndex`: `number` (`-1` to `results.length - 1`) for keyboard arrow navigation.
   - `recentSearches`: `string[]` loaded safely from `localStorage`.
   - `abortControllerRef`: `useRef<AbortController | null>(null)` for request cancellation.
   - `inFlightRef`: `useRef<boolean>(false)` to guard against concurrent pagination calls during scroll jitter.
   - `inputRef`: `useRef<HTMLInputElement>(null)` (now working via `React.forwardRef`).
   - `dropdownRef`: `useRef<HTMLDivElement>(null)`.

2. **Safe `localStorage` Helper**:
   ```javascript
   const getSafeRecentSearches = () => {
     try {
       const saved = localStorage.getItem("audioscape_recent_searches");
       return saved ? JSON.parse(saved) : [];
     } catch (e) {
       return [];
     }
   };

   const saveSafeRecentSearch = (term) => {
     if (!term || !term.trim()) return;
     try {
       const existing = getSafeRecentSearches();
       const updated = [term.trim(), ...existing.filter(t => t !== term.trim())].slice(0, 5);
       localStorage.setItem("audioscape_recent_searches", JSON.stringify(updated));
       setRecentSearches(updated);
     } catch (e) {}
   };
   ```

3. **Request Cancellation & Deduplication**:
   - Cancel pending HTTP requests via `abortControllerRef.current?.abort()`.
   - Guard pagination requests with `inFlightRef.current`.
   - Deduplicate results on append using a `Set` on `videoId`.

4. **Optimistic Selection**:
   - Instantly update global player state `onSelectTrack({ id: track.videoId, name: track.title, artist: track.channelTitle, thumbnail: track.thumbNail })`.
   - Asynchronously invoke `/youtube/track/:id` in background without delaying UI playback.

5. **Keyboard Accessibility & Focus Handling**:
   - Attach `onKeyDown` to `<Input ref={inputRef}>`:
     - `ArrowDown` / `ArrowUp`: Cycle `selectedIndex`.
     - `Enter`: Select `results[selectedIndex]` or execute immediate search.
     - `Escape`: Blur `inputRef.current?.blur()` and close dropdown.

---

### Step 4: Backend Search Pipeline & Local FTS (`backend/src/tracks/tracks.service.ts`)

#### [MODIFY] [tracks.service.ts](file:///Users/as-mac-1375/Documents/GitHub/AudioScape/backend/src/tracks/tracks.service.ts)

1. **Query Normalization**:
   ```typescript
   private normalizeQuery(raw: string): string {
     return raw
       .toLowerCase()
       .trim()
       .replace(/\s+/g, ' ')
       .replace(/[^\w\s]/g, '');
   }
   ```

2. **Relational Page Cache & Local FTS Search**:
   - Check `SearchQueryPage` for relational page match (`queryId` + `pageToken`). If cached page exists and `expiresAt > NOW()`, return cached page tracks immediately.
   - If page cache MISS on page 0 (`!pageToken`):
     - Query local PostgreSQL `tracks` using `ts_rank` against `search_vector`:
       ```typescript
       const localMatches = await this.prisma.$queryRaw<Array<any>>`
         SELECT youtube_video_id AS "videoId",
                title,
                artist AS "channelTitle",
                thumbnail_url AS "thumbNail",
                ts_rank(search_vector, websearch_to_tsquery('english', ${normalizedQuery})) AS rank
         FROM tracks
         WHERE search_vector @@ websearch_to_tsquery('english', ${normalizedQuery})
         ORDER BY rank DESC
         LIMIT 10;
       `;
       ```
     - **Configurable FTS Threshold**: If `localMatches.length >= 8` (configurable parameter), return local matches with `cached: true` and `source: 'postgres_fts'`, consuming **zero YouTube API quota**.
3. **YouTube API Fallback & Page Storage**:
   - On cache MISS, fetch YouTube API search results.
   - Store results into `SearchQueryPage` and `SearchQueryPageResult` junction records asynchronously.

---

## 3. Rollout & Deployment Sequencing (Zero-Downtime)

To ensure zero downtime, deployment must follow this strict sequence:

1. **Phase 1 — Database Migration**:
   - Run Prisma migration (`npx prisma migrate deploy`). Additive schema change (`search_query_pages` and `search_query_page_results`), completely non-breaking to existing running services.
2. **Phase 2 — Backend Service Deployment**:
   - Deploy NestJS backend containing `tracks.service.ts` updates. Begins writing and reading from relational page cache and PostgreSQL local FTS.
3. **Phase 3 — Frontend UI Deployment**:
   - Deploy updated `Input.jsx` (`React.forwardRef`) and `SearchBar.jsx` containing keyboard nav, `AbortController`, optimistic selection, and guarded infinite scroll.

---

## 4. Comprehensive Verification Plan

### 4.1 Automated Build & Unit Testing
- Run NestJS backend tests: `cd backend && npm run test`
- Build frontend workspace: `cd frontend && npm run build`

### 4.2 Manual & Telemetry Verification
1. **Input Ref Test**: Verify pressing `Escape` in `SearchBar.jsx` triggers `inputRef.current.blur()` without errors.
2. **Infinite Scroll Deduplication Test**: Perform search, scroll down dropdown rapidly. Verify zero duplicate video IDs exist in state or DOM.
3. **Optimistic Selection Test**: Click a track in dropdown. Confirm player bar updates in <50ms without waiting for background track details request.
4. **`localStorage` Exception Test**: Disable third-party cookies / set browser to Incognito with storage blocked. Verify search bar functions cleanly without crashing.
5. **Quota Reduction Telemetry Verification**:
   - Post-deploy, query PostgreSQL telemetry table:
     ```sql
     SELECT endpoint, SUM("unitsConsumed") as total_units, COUNT(*) as call_count
     FROM "api_quota_usage"
     WHERE date >= CURRENT_DATE - INTERVAL '7 days'
     GROUP BY endpoint;
     ```
   - Verify `SEARCH_LIST` quota unit consumption drops significantly due to PostgreSQL FTS hits and relational page caching.

---

## 5. Architectural Improvements & Pagination Refinements

Based on architectural review of YouTube API quota efficiency and floating dropdown UX, the following three core refinements are added to the search blueprint:

### 1. `maxResults=25` Quota Optimization (`tracks.service.ts`)
* **Finding**: YouTube Data API v3 charges a flat 100 quota units for a `search.list` call regardless of whether `maxResults` is 10 or 25.
* **Refinement**: Increase `maxResults` from `10` to `25` in `TracksService.searchTracks`.
* **Impact**: Delivers 2.5x more tracks on initial search at **0 additional API quota cost**, dramatically reducing the need for users to trigger page 2 pagination.

### 2. Explicit "Load More Results" Dropdown Trigger (`SearchBar.jsx`)
* **Finding**: In a floating scrollable dropdown panel, an invisible `IntersectionObserver` tail boundary can trigger late or fail to intersect due to container height clipping (`max-h-80`).
* **Refinement**: Replace the `IntersectionObserver` tail element with an explicit, deterministic **"Load more results ↓"** button at the bottom of the results dropdown when `pageToken` is present.
* **Impact**: Eliminates scroll observer jitter, prevents accidental quota-consuming page triggers, and provides clear user intent.

### 3. Expanded Floating Dropdown Viewport (`SearchBar.jsx`)
* **Finding**: A fixed height of `max-h-80` (320px) is too constrained when rendering recent search tags, telemetry status banners, and track cards simultaneously.
* **Refinement**: Increase maximum dropdown viewport height to `max-h-[480px]` (or `max-h-[60vh]`).
* **Impact**: Displays up to 6–8 tracks simultaneously without scroll truncation, providing a vastly superior desktop and mobile user experience.

