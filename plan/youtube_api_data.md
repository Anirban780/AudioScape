# YouTube Data API v3 — Current State & Fit for Audioscape

**Researched:** July 28, 2026. YouTube's API docs and quota table change often enough that I verified everything below against current sources rather than relying on memory — dates are given so you can tell what's fresh.

This doc has two jobs: (1) tell you exactly what the API can and can't do today, and (2) map that onto your actual code (`youtubeService.js`, `youtube.js`, `recommend.js`, `generateQueue.js`, the Phase 2 Prisma schema) so you know precisely where you're spending quota and where you're leaving cheap wins on the table.

---

## 1. The one fact that governs every other decision

> **The bottleneck isn't money — it's the 10,000-unit daily quota, and `search.list` alone can burn all of it in 100 calls.**

There is no paid tier for the Data API. It's free, uncapped in time, capped in daily volume. Every project gets **10,000 units/day**, reset at midnight Pacific. Quota is consumed per method call, not per result — an invalid request still costs at least 1 unit.

The costs that matter to a music app:

| Method | Cost | What it buys |
|---|---|---|
| `search.list` | **100 units** | Keyword → list of video IDs (your `SearchBar.jsx` flow) |
| `videos.list` | **1 unit** | Metadata/stats for up to 50 IDs at once (your `fetchTrack` flow) |
| `videoCategories.list` | **1 unit** | Category lookup (your `getMusicCategoryId`) |
| `playlistItems.list` | **1 unit** | Up to 50 items from a playlist/uploads feed |
| `channels.list` | **1 unit** | Channel metadata |

Source: Google's own quota table, current as of June 2026.<br>
https://developers.google.com/youtube/v3/determine_quota_cost

That 100:1 ratio between `search.list` and everything else is *the* design constraint for your app. 100 units per search means **100 free-text searches per day, total, across all users**, before you're locked out until midnight Pacific. Everything in this doc is really about working around that one number.

**One documentation discrepancy worth flagging**: Google's own 2020 changelog says they removed the extra cost for requesting multiple `part` values — you're charged the flat method cost regardless of how many parts you ask for. Several 2026 third-party blog posts claim the opposite ("the part parameter tax compounds"). I'm going with Google's own documentation as authoritative here, since it's the primary source and the third-party claims don't cite a mechanism — but it's worth a 5-minute check against your own Cloud Console quota dashboard before you rely on it, since third-party observations sometimes catch real undocumented behavior. Either way, the practical advice is the same: only request the `part` values you actually read, since larger responses cost you latency and parsing time regardless of quota.

---

## 2. What changed recently (last 12 months) that affects you

- **`relatedToVideoId` on `search.list` was removed in 2023, not just deprecated.** This matters directly for you: your Phase 2 schema note "No append-only event log yet" and your `recommend.js` TF-IDF-over-genre-keywords approach are *not* a workaround for a nicer feature you're missing — they're the correct current architecture. There is no first-party "get videos related to this video" call anymore. Anyone building "related tracks" today has to do what you're already doing: derive similarity from your own metadata (tags/genre) and cached search results. Good news: you don't need to change anything here.
  Source: https://developers.google.com/youtube/v3/revision_history

- **`videos.insert` quota dropped from ~1,600 units to ~100 units (Dec 4, 2025), then moved to its own separate daily bucket outside the shared 10,000 (June 1, 2026).** Irrelevant to you today — you don't upload video — but relevant if you ever add "upload a cover" or similar creator features later; it's now cheap and doesn't compete with your read/search budget.
  Source: https://www.blotato.com/blog/youtube-api-pricing

- **Default free-tier allocation is now explicitly listed as "100 `search.list` calls, 100 `videos.insert` calls, and 10,000 units/day for everything else"** rather than one undifferentiated pool. This is a subtle but important shift from how the quota used to be framed — search has effectively always had its own ceiling in practice (100 units × 100 calls = the whole budget), but Google now states it as a named bucket.
  Source: https://developers.google.com/youtube/v3/getting-started (updated June 1, 2026)

- **No transcript/caption access for third-party videos**, and this hasn't changed. `captions.list`/`download` require OAuth as the *video owner*. Not relevant to your current feature set, but rules out "show lyrics from captions" as a first-party option if that's ever on your roadmap — you'd need a separate lyrics API (Musixmatch, Genius, etc.).

---

## 3. Auditing your actual code against this

### `backend/services/youtubeService.js` — your primary quota sink

```js
const searchTrack = async (query, pageToken = "") => {
    const musicCategoryId = await getMusicCategoryId();   // videoCategories.list — 1 unit
    const url = `.../search?...videoCategoryId=${musicCategoryId}...`;  // search.list — 100 units
```

Every call to `searchSongs` costs **101 units minimum** (1 for the category lookup + 100 for the search). At 10,000 units/day that's **~99 searches/day, app-wide, across every user**, before you hit `quotaExceeded`. This is almost certainly why your `SearchBar.jsx` shows the toast *"Search is currently unavailable. Please try next day"* — that's not a bug, that's you hitting the wall Google's docs describe.

Two free wins here, in order of impact:

1. **Cache `getMusicCategoryId()` instead of calling it on every search.** The music category ID (`"10"` for `regionCode=US`) essentially never changes. Right now every single search pays this 1-unit tax for a value that's static. Hardcode it or cache it once at boot with a long TTL (your Phase 2 schema's `api_quota_usage` table is exactly the right place to also stash config-cache metadata, or just an in-memory `let cachedCategoryId` with a 24h refresh). This alone removes ~1% overhead — small, but it's a one-line fix with zero downside.

2. **Route pasted/known video IDs around `search.list` entirely.** If a user pastes a YouTube URL or you already have a `videoId` from your cache, never call `search.list` — go straight to `videos.list` (1 unit) with that ID. Your `fetchTrack` controller already does this correctly for the "select a track" flow. Worth double-checking `SearchBar.jsx`'s debounced free-text path doesn't accidentally re-search when it could look up a cached ID instead.

### `frontend/utils/youtube.js` — your Explore-page ingestion

```js
const searchUrl = `${BASE_URL}/search?...q=${query}...`;          // 100 units
const detailsUrl = `${BASE_URL}/videos?...id=${videoIds}...`;      // 1 unit
```

This is the classic "101 units per keyword" pattern the research above calls out explicitly as the thing to avoid. Your `ExplorePage.jsx` already mitigates this well — it caches per-keyword results in `localStorage` with a 30-minute TTL (`CACHE_EXPIRY_MS`) and calls `cacheRelatedTracks` to persist to Firestore too. That's the right instinct. The gap: **this is a client-side API key call** (`VITE_YOUTUBE_API_KEY`), meaning it runs against quota independently of your backend's search, and the key is bundled into the frontend JS. Two separate concerns:

- **Quota concern**: with `curatedGenres` at 8 keywords and `keywords.slice(0, 10)` in `ExplorePage.jsx`, a single cold cache-miss user visit can burn `10 × 101 = 1,010` units — 10% of your entire daily budget from one page load, before any user has typed a single search query. This is the actual highest-leverage fix available to you.
- **Security concern**: an API key embedded in shipped frontend code is extractable by anyone who opens devtools. It's restricted by HTTP referrer typically, but referrer restrictions are spoofable and this key shares your daily quota pool with your backend key if they're the same project. Worth confirming whether `VITE_YOUTUBE_API_KEY` and `backend/config/youtubeAuth.js`'s `API_KEY` are the same key or different projects — if the same, a scraper hitting your frontend bundle's key directly could exhaust the exact quota your backend search relies on.

**Recommended fix, in order of effort:**
1. Cheapest: move the Explore-page YouTube calls to your backend (you already have the `trackController`/`trackRoutes` pattern) so there's one key, one quota pool, one place to add caching logic and the `api_quota_usage` tracking your Phase 2 schema already models.
2. Once moved: the `search_queries` table with `expiresAt` (TTL) and `hitCount` you designed is exactly built for this — a curated-keyword search should check `search_queries` first, and only pay the 100-unit `search.list` cost on a genuine cache miss, same idea as `localStorage` but centralized and multi-user-shared instead of duplicated per browser.

### `recommend.js` and `generateQueue.js` — no API cost, correctly

Worth stating explicitly since it's easy to assume otherwise: your recommendation engine (TF-IDF over cached genre/keyword text) and queue generation both run entirely against Firestore-cached data, never touching the live YouTube API. This is good architecture and matches the "cache by video ID forever, never re-search for known content" pattern that shows up repeatedly. No changes needed here — just confirming it for the record so nobody "optimizes" it into making live calls later.

---

## 4. Concrete recommendations, ranked by effort-to-impact

| # | Change | Effort | Quota impact | Notes |
|---|---|---|---|---|
| 1 | Cache `getMusicCategoryId()` | Trivial (5 min) | Saves 1 unit/search | Category ID is effectively static |
| 2 | Move Explore-page YouTube calls server-side | Small (~1–2 hrs) | Consolidates quota pool, closes key-exposure gap | Reuse existing `trackController` pattern |
| 3 | Back `search_queries`/`query_track_results` (already designed in Phase 2 schema) with real TTL-checked reads before any `search.list` call | Medium | Could cut Explore-page cost by >90% on warm cache | This is the actual payoff of the schema work you already did — implement the read path, not just the tables |
| 4 | Batch `videos.list` calls to 50 IDs at once wherever you currently loop | Small | 1 unit per 50 tracks instead of N units | Relevant if any code path fetches track details one-by-one instead of batching |
| 5 | Add the `api_quota_usage` write-path so you have real visibility before hitting `quotaExceeded` in production | Medium | No direct quota savings, but turns "search unavailable, try tomorrow" into a monitored, alertable condition | You already modeled the table; wire up the increment-on-call logic |
| 6 | If usage genuinely outgrows 10,000/day: submit the Audit and Quota Extension form in Cloud Console | N/A (external process) | Reviews take weeks to months per current reports | Only worth doing after 1–5 are in place — Google's review process wants to see you're not wasting quota first |

## 5. What the API cannot do for you (so you don't design around it)

- **No related-videos endpoint** (removed 2023) — confirmed above, your own recommender is the permanent answer, not a stopgap.
- **No transcripts/lyrics for videos you don't own** — rules out first-party lyrics display.
- **No historical view-count trends** for third-party videos — only point-in-time snapshots via `videos.list`. If you ever want "trending this week" style features, you'd need your own time-series table sampling `videos.list` periodically (this is exactly why your Phase 2 schema's caution against premature `listening_events`/analytics tables is the right call — build that only when you're also willing to periodically re-poll and store snapshots yourself).
- **No purchasable quota increase** — the only lever beyond the free 10,000 is the manual audit/review process, and multiple current sources note it can take weeks and sometimes gets rejected for data-heavy use cases. Budget for this in project timelines if you expect real growth.

---

## Sources

- Google, YouTube Data API quota cost table (current): https://developers.google.com/youtube/v3/determine_quota_cost
- Google, YouTube Data API Overview / default quota allocation: https://developers.google.com/youtube/v3/getting-started
- Google, YouTube Data API revision history (relatedToVideoId, videos.insert changes): https://developers.google.com/youtube/v3/revision_history
- Third-party quota-optimization writeups (used for practical patterns, cross-checked against Google docs above): dev.to/siyabuilt, dev.to/qcrao, socialcrawl.dev, blotato.com, getphyllo.com — all dated 2026, cited inline above where a specific claim is drawn from them