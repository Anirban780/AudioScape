# Music Data Quality, Canonicalization & Categorical UX

> **Goal:** Transform raw YouTube search results into clean, deduplicated, well-categorised track data so that the frontend can render Spotify-style categorical music lists per user profile — artist groupings, genre/mood buckets, "recently played," "top tracks," etc. — with minimal API cost and solo-developer-feasible complexity.

---

## User Review Required

> [!IMPORTANT]
> **Postgres/Neon dependency.** Phases 2–4 assume the planned Postgres migration is happening. Phase 1 is designed to work against the current Firestore schema so you get immediate quality wins while the migration is in flight. If the Postgres timeline shifts, Phase 1 still delivers standalone value.

> [!IMPORTANT]
> **pgvector in Phase 4.** Neon supports pgvector natively, but embedding generation needs an external model (OpenAI `text-embedding-3-small` at ~$0.02/1M tokens, or a free local model like `all-MiniLM-L6-v2` via `@xenova/transformers` running in Node). The plan defaults to the local model for zero marginal cost — confirm if you'd prefer the hosted option for better quality at minimal spend.

> [!IMPORTANT]
> **Title-parsing heuristics for artist/track split.** YouTube Data API v3 does *not* expose structured artist/track metadata. Every approach here relies on regex parsing of video titles (e.g. `"Artist - Track (Official Audio)"`) plus channel name as a fallback. This works well for ~70-80% of mainstream music but will misparse edge cases (multi-artist collabs, non-Latin scripts, title formats that don't follow the `Artist - Track` convention). The plan treats `artist_name` as nullable and progressively enrichable, not a hard requirement.

## Open Questions

1. **Target region for `regionRestriction` filtering** — what region code(s) should the hard filter check against? Your primary user base's country code (e.g. `IN`, `US`)?
2. **"Cover" handling** — should covers be tagged and kept (useful for discovery) or excluded entirely? The plan currently tags them but keeps them as separate canonical tracks.
3. **Playback dwell-time tracking** — do you already have hooks in the YouTube IFrame Player API's `onStateChange` to capture actual seconds listened, or is this new instrumentation? This affects how quickly `user_listening_events` can populate with real `listened_seconds` data.
4. **How many tracks are currently in Firestore?** This affects whether batch backfill (re-fetching `videos.list` for all existing track IDs) is a one-time 10-minute script or a multi-hour paginated job.

---

## Phase 1 — Immediate Filtering & Quota Fixes (Current Firestore, No Migration Needed)

**Cost:** Low · **Timeline:** Ship this week · **Dependencies:** None

This phase fixes the most damaging data quality bugs — the ones actively breaking playback, wasting API quota, and polluting recommendations — without touching the database layer.

### 1.1 Batch `videos.list` Calls (Quota Fix)

**Problem:** Current flow does one `videos.list` call per video after search. At 1 quota unit per call, this is 1 unit × N videos. But `videos.list` accepts up to **50 comma-separated video IDs in a single call** for the same 1 unit cost.

**Implementation:**
- After `search.list` returns results, collect all `videoId`s from the response
- Make a single `videos.list` call with `id=vid1,vid2,...,vid50` and `part=snippet,contentDetails,statistics,status,topicDetails`
- This cuts per-search quota from `N` units to `ceil(N/50)` units (typically 1 call)
- The `search.list` call itself still costs 100 units — that's unavoidable, but batching the follow-up is a 10-50x reduction on the detail-fetch side

```
// Pseudocode for the batched fetch
const videoIds = searchResults.map(r => r.id.videoId).join(',');
const details = await youtube.videos.list({
  id: videoIds,
  part: 'snippet,contentDetails,statistics,status,topicDetails'
});
```

### 1.2 Hard Filters (Discard Immediately, Before Any Processing)

Apply these in order — they're boolean checks on fields from the batched `videos.list` response:

| Filter | Field | Condition | Why |
|--------|-------|-----------|-----|
| Not embeddable | `status.embeddable` | `=== false` | IFrame player silently fails — zero point keeping it |
| Live stream | `snippet.liveBroadcastContent` | `!== 'none'` | No stable duration/seek, breaks player UX |
| Region-blocked | `contentDetails.regionRestriction.blocked` | includes target region | Unplayable for your users |
| Privacy | `status.privacyStatus` | `!== 'public'` | Unlisted/private → unreliable availability |

### 1.3 Fix Duration Filter (Stop Rejecting Valid Music)

**Problem:** The current 60–360s (1–6 min) window silently discards a huge share of legitimate songs. Many mainstream tracks run 4:30–6:00+, hip-hop/EDM/classical frequently exceeds 6 minutes. Meanwhile, junk compilations and "sleep music" often fall *inside* the 60–360s window, so the filter doesn't effectively remove them either.

**Fix:**
- Widen the window to **30s – 900s (15 minutes)** as a loose outer bound
- Duration alone is a weak signal — pair it with title heuristics (Phase 1.4) for the actual filtering
- For tracks < 60s: flag as "short" (could be intro/interlude/skit) but don't auto-discard
- For tracks > 900s: almost certainly a compilation/mix/podcast → discard

```
// Parse ISO 8601 duration from contentDetails.duration
function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const h = parseInt(match?.[1] || 0);
  const m = parseInt(match?.[2] || 0);
  const s = parseInt(match?.[3] || 0);
  return h * 3600 + m * 60 + s;
}

const dur = parseDuration(video.contentDetails.duration);
if (dur > 900) return null; // hard reject: compilations/mixes
// dur < 60 → keep but tag as "short-form"
```

### 1.4 Title/Description Heuristic Tagging

Instead of binary accept/reject, **tag** videos with content-type markers and let downstream logic decide per-context:

| Pattern (case-insensitive regex) | Tag | Default action |
|---|---|---|
| `\b(full album|album mix)\b` | `compilation` | Exclude |
| `\b(1 hour|2 hour|10 hour|loop)\b` | `loop` | Exclude |
| `\breaction\b` | `reaction` | Exclude |
| `\btype beat\b` | `type_beat` | Exclude |
| `\b(podcast|interview|review)\b` | `non_music` | Exclude |
| `\b(8d|8 d)\s*(audio)?\b` | `8d_audio` | Tag, keep |
| `\b(sped up|nightcore)\b` | `speed_modified` | Tag, keep |
| `\b(slowed|reverb)\b` | `slowed_reverb` | Tag, keep |
| `\bcover\b` | `cover` | Tag, keep (separate canonical track) |
| `\b(lyric|lyrics)\s*(video)?\b` | `lyric_video` | Tag, keep (variant of canonical track) |
| `\b(official\s*(music\s*)?video)\b` | `official_mv` | Tag, keep (preferred variant) |
| `\b(official\s*audio)\b` | `official_audio` | Tag, keep (preferred variant) |
| `\b(live|concert|acoustic)\b` | `live_performance` | Tag, keep (separate canonical track) |
| `\b(remix)\b` | `remix` | Tag, keep (separate canonical track) |

**Key design decision:** `lyric_video`, `official_mv`, and `official_audio` of the *same song* are **variants** (they get folded into one canonical track in Phase 3). `cover`, `remix`, `live_performance` are **separate canonical tracks** — they're different artistic works even if they share a title.

### 1.5 Extract `topicDetails.topicCategories`

Start storing `topicCategories` (the Wikipedia-URL-based topic list) alongside each track. Even before Phase 3's similarity overhaul, this gives you structured genre data:

```
// topicCategories comes as an array of Wikipedia URLs like:
// ["https://en.wikipedia.org/wiki/Hip_hop_music", "https://en.wikipedia.org/wiki/Music"]
// Extract the topic name from the URL:
const topics = (video.topicDetails?.topicCategories || [])
  .map(url => decodeURIComponent(url.split('/wiki/')[1] || '').replace(/_/g, ' '))
  .filter(t => t !== 'Music' && t !== 'Entertainment'); // too generic to be useful
```

The post-2017 topic set is coarse (~30 categories) but **consistent** — "Hip hop music" means the same thing across every video, unlike free-text tags. This is your best structured genre signal until embeddings (Phase 4).

---

## Phase 2 — Relational Schema & Artist/Track Parsing (Postgres Migration)

**Cost:** Medium · **Timeline:** Part of the planned Postgres/Neon migration · **Dependencies:** Postgres migration decision

### 2.1 Core Schema

```sql
-- Canonical track: one row per real song regardless of how many YT uploads exist
CREATE TABLE tracks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_video_id  TEXT NOT NULL,
  title             TEXT NOT NULL,           -- cleaned ("Blinding Lights")
  raw_title         TEXT NOT NULL,           -- original ("The Weeknd - Blinding Lights (Official Music Video)")
  artist_name       TEXT,                    -- parsed, nullable until resolved
  channel_id        TEXT NOT NULL,
  channel_title     TEXT,
  duration_seconds  INT,
  thumbnail_url     TEXT,
  license           TEXT,                    -- 'youtube' | 'creativeCommon'
  is_embeddable     BOOLEAN NOT NULL DEFAULT true,
  licensed_content  BOOLEAN DEFAULT false,   -- label-claimed → strong "official" signal
  quality_score     NUMERIC,                 -- computed composite, re-scored on sync
  topic_categories  TEXT[],                  -- from topicDetails (Wikipedia-anchored)
  content_tags      TEXT[],                  -- heuristic tags from Phase 1.4
  raw_tags          TEXT[],                  -- original snippet.tags, kept but low-trust
  view_count        BIGINT,
  like_count        BIGINT,
  category_id       TEXT,                    -- YouTube categoryId (10 = Music)
  made_for_kids     BOOLEAN DEFAULT false,
  last_synced_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tracks_artist ON tracks (artist_name);
CREATE INDEX idx_tracks_topic ON tracks USING GIN (topic_categories);
CREATE INDEX idx_tracks_content_tags ON tracks USING GIN (content_tags);

-- Variant uploads folded into one canonical track
CREATE TABLE track_variants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id         UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL UNIQUE,
  variant_type     TEXT NOT NULL,           -- 'official_mv' | 'lyric_video' | 'official_audio' | 'reupload'
  view_count       BIGINT,
  quality_score    NUMERIC,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_variants_track ON track_variants (track_id);

-- Append-only listening events (raw signal)
CREATE TABLE user_listening_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  track_id         UUID NOT NULL REFERENCES tracks(id),
  played_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  listened_seconds INT,                    -- actual dwell time from IFrame API
  completed        BOOLEAN,               -- listened > 80% of duration
  source           TEXT                    -- 'search' | 'explore' | 'recommendation' | 'playlist'
);

CREATE INDEX idx_events_user_time ON user_listening_events (user_id, played_at DESC);
CREATE INDEX idx_events_track ON user_listening_events (track_id);

-- Aggregated per-user-per-track stats (derived from events)
CREATE TABLE user_track_stats (
  user_id        UUID NOT NULL,
  track_id       UUID NOT NULL REFERENCES tracks(id),
  play_count     INT NOT NULL DEFAULT 0,
  total_seconds  INT NOT NULL DEFAULT 0,
  skip_count     INT NOT NULL DEFAULT 0,   -- listened < 30s
  liked          BOOLEAN NOT NULL DEFAULT false,
  last_played_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, track_id)
);

-- Artist table for grouping (populated progressively)
CREATE TABLE artists (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  normalized    TEXT NOT NULL UNIQUE,      -- lowercase, trimmed, for dedup matching
  channel_id    TEXT,                      -- primary YouTube channel if known
  track_count   INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_artists_normalized ON artists (normalized);

-- Many-to-many: tracks can have multiple artists (features/collabs)
CREATE TABLE track_artists (
  track_id  UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'primary', -- 'primary' | 'featured'
  PRIMARY KEY (track_id, artist_id)
);
```

### 2.2 Title Parsing → Artist / Track Split

Since the YouTube API doesn't provide structured artist/track metadata, parsing is regex-based. This is inherently imperfect but handles the majority of mainstream music uploads:

```
// Priority order of parsing strategies:
// 1. "Artist - Track Title (Official Video)" → most common format
// 2. "Track Title" uploaded by channel "ArtistVEVO" or "Artist - Topic"
// 3. Fallback: channel_title as artist_name, full title as track title

function parseArtistTrack(rawTitle, channelTitle) {
  // Strategy 1: explicit separator
  const sepMatch = rawTitle.match(/^(.+?)\s*[-–—|]\s*(.+)$/);
  if (sepMatch) {
    const artist = sepMatch[1].trim();
    const track = cleanTrackTitle(sepMatch[2].trim());
    return { artist, track };
  }
  
  // Strategy 2: VEVO / Topic channel naming convention
  const vevoMatch = channelTitle.match(/^(.+?)VEVO$/i);
  const topicMatch = channelTitle.match(/^(.+?)\s*-\s*Topic$/i);
  if (vevoMatch || topicMatch) {
    const artist = (vevoMatch?.[1] || topicMatch?.[1]).trim();
    const track = cleanTrackTitle(rawTitle);
    return { artist, track };
  }
  
  // Strategy 3: fallback
  return { artist: channelTitle, track: cleanTrackTitle(rawTitle) };
}

function cleanTrackTitle(title) {
  return title
    .replace(/\(Official\s*(Music\s*)?Video\)/gi, '')
    .replace(/\(Official\s*Audio\)/gi, '')
    .replace(/\(Lyric\s*Video\)/gi, '')
    .replace(/\(Lyrics\)/gi, '')
    .replace(/\[Official\s*(Music\s*)?Video\]/gi, '')
    .replace(/\(HD\)/gi, '')
    .replace(/\(HQ\)/gi, '')
    .replace(/\s*\|\s*.*$/, '')  // trailing " | Something"
    .replace(/\s{2,}/g, ' ')
    .trim();
}
```

**Known limitations (accept, don't over-engineer):**
- Multi-artist titles like `"Artist A x Artist B - Track"` → parsed as single artist string; a second pass can split on ` x `, ` ft.`, ` feat.`, ` & ` to populate `track_artists` with `role = 'featured'`
- Non-Latin scripts → regex still works on the separator but artist/track may not cleanly split; fallback to channel name is usually correct
- `artist_name` stays nullable — the system works without it, it just gets progressively better as parsing improves

### 2.3 Quality Score Computation

A composite score to rank which variant becomes `primary_video_id` and to soft-rank search results:

```
function computeQualityScore(video) {
  let score = 0;
  
  // View count (log scale, capped contribution)
  score += Math.min(Math.log10(Math.max(video.viewCount, 1)) * 5, 50);   // max 50 pts
  
  // Like ratio (if available)
  if (video.likeCount > 0 && video.viewCount > 0) {
    const ratio = video.likeCount / video.viewCount;
    score += ratio * 100;  // typically 2-5% → 2-5 pts; highly liked → 10+ pts
  }
  
  // Licensed content (label-claimed → likely official)
  if (video.licensedContent) score += 15;
  
  // Channel signals
  if (/VEVO$/i.test(video.channelTitle)) score += 20;
  if (/- Topic$/i.test(video.channelTitle)) score += 10;
  
  // Content type bonuses
  if (video.contentTags?.includes('official_mv')) score += 10;
  if (video.contentTags?.includes('official_audio')) score += 8;
  
  // Penalties
  if (video.contentTags?.includes('speed_modified')) score -= 10;
  if (video.contentTags?.includes('8d_audio')) score -= 5;
  
  return Math.round(score * 100) / 100;
}
```

### 2.4 Aggregate Stats Refresh

Rather than computing aggregates on every request, use a simple upsert triggered periodically or on-demand:

```sql
-- Upsert user_track_stats from raw events (run as a scheduled job or after N new events)
INSERT INTO user_track_stats (user_id, track_id, play_count, total_seconds, skip_count, last_played_at)
SELECT
  user_id,
  track_id,
  COUNT(*),
  COALESCE(SUM(listened_seconds), 0),
  COUNT(*) FILTER (WHERE listened_seconds < 30),
  MAX(played_at)
FROM user_listening_events
GROUP BY user_id, track_id
ON CONFLICT (user_id, track_id) DO UPDATE SET
  play_count     = EXCLUDED.play_count,
  total_seconds  = EXCLUDED.total_seconds,
  skip_count     = EXCLUDED.skip_count,
  last_played_at = EXCLUDED.last_played_at;
```

Solo-dev approach: run this as a Neon serverless function on a cron (every 15 min or hourly). No need for a streaming pipeline.

---

## Phase 3 — Canonicalization / Dedup & Genre Categorisation

**Cost:** Medium · **Timeline:** After Phase 2 schema is live · **Dependencies:** Phase 2

### 3.1 Dedup / Canonicalization Logic

The core problem: the same song exists as 5–10 YouTube uploads (official MV, official audio, lyric video, re-uploads by random channels). Without dedup, your recommendations split signal across duplicates and your "recently played" shows the same song multiple times.

**Matching algorithm:**

```
function areSameTrack(trackA, trackB) {
  // 1. Normalize titles: lowercase, strip parenthetical clutter, strip common suffixes
  const normA = normalizeForMatch(trackA.title);
  const normB = normalizeForMatch(trackB.title);
  
  // 2. Fuzzy title similarity (Levenshtein or Dice coefficient)
  const titleSim = diceCoefficient(normA, normB);
  if (titleSim < 0.75) return false;  // titles too different
  
  // 3. Artist match (if both parsed)
  if (trackA.artist_name && trackB.artist_name) {
    const artistSim = diceCoefficient(
      trackA.artist_name.toLowerCase(),
      trackB.artist_name.toLowerCase()
    );
    if (artistSim < 0.7) return false;  // different artists
  }
  
  // 4. Duration proximity: ±5 seconds (accounts for intro/outro differences)
  if (Math.abs(trackA.duration_seconds - trackB.duration_seconds) > 5) return false;
  
  // 5. Content-type check: remix/cover/live are separate canonical tracks
  const separateTypes = ['remix', 'cover', 'live_performance'];
  const aType = trackA.content_tags?.find(t => separateTypes.includes(t));
  const bType = trackB.content_tags?.find(t => separateTypes.includes(t));
  if (aType !== bType) return false;  // different artistic works
  
  return true;
}

function normalizeForMatch(title) {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, '')       // strip all parentheticals
    .replace(/\[.*?\]/g, '')       // strip all brackets
    .replace(/official|video|audio|lyrics?|hd|hq|mv/gi, '')
    .replace(/[^\w\s]/g, '')       // strip punctuation
    .replace(/\s+/g, ' ')
    .trim();
}
```

**When to run:** On track ingest (new search result or batch import). For each new track, query existing tracks with the same `artist_name` (or `channel_id` if artist is null) and run `areSameTrack`. If a match is found → insert into `track_variants` pointing at the existing canonical track; if the new video has a higher `quality_score`, promote it to `primary_video_id`.

**Edge cases to handle explicitly:**
- **Radio edit vs. album version** — duration differs by 30+ seconds, so the ±5s check correctly keeps them separate; if you want to fold them, relax to ±30s but accept more false positives
- **"Remix" in title** — already handled: tagged as `remix`, treated as separate canonical
- **Same title, different artist** — artist match check at step 3 prevents false merges
- **Re-uploads by random channels** — no artist parse, but `licensedContent === false` + low view count → low quality score → gets folded as a variant, never promoted to primary

### 3.2 Genre/Category Buckets for Frontend Lists

Using `topicCategories` as the primary signal, map to user-facing genre buckets:

```javascript
const GENRE_MAP = {
  // topicCategory (Wikipedia slug) → frontend genre bucket
  'Hip hop music':            'Hip Hop & Rap',
  'Rhythm and blues':         'R&B & Soul',
  'Soul music':               'R&B & Soul',
  'Pop music':                'Pop',
  'Rock music':               'Rock',
  'Electronic music':         'Electronic & Dance',
  'Country music':            'Country',
  'Jazz':                     'Jazz',
  'Classical music':          'Classical',
  'Reggae':                   'Reggae',
  'Blues':                     'Blues',
  'Punk rock':                'Rock',
  'Heavy metal music':        'Metal',
  'Independent music':        'Indie',
  'Music of Latin America':   'Latin',
  'Music of Asia':            'Asian',
  'Christian music':          'Christian & Gospel',
  'Filmi':                    'Bollywood & Indian Cinema',
  'Bollywood':                'Bollywood & Indian Cinema',
  'Soundtrack':               'Soundtracks',
  'Video game music':         'Gaming',
  'Children\'s music':        'Kids',
};

function getGenreBuckets(topicCategories) {
  const buckets = new Set();
  for (const topic of topicCategories) {
    const bucket = GENRE_MAP[topic];
    if (bucket) buckets.add(bucket);
  }
  // Fallback: if no topic matched, use raw_tags heuristics as secondary
  return [...buckets];
}
```

This enables frontend queries like:

```sql
-- "Hip Hop & Rap tracks this user has listened to most"
SELECT t.*, uts.play_count, uts.total_seconds
FROM user_track_stats uts
JOIN tracks t ON t.id = uts.track_id
WHERE uts.user_id = $1
  AND 'Hip hop music' = ANY(t.topic_categories)
ORDER BY uts.total_seconds DESC
LIMIT 20;

-- "All genres this user listens to, ranked by total time"
SELECT unnest(t.topic_categories) AS genre, SUM(uts.total_seconds) AS total_time
FROM user_track_stats uts
JOIN tracks t ON t.id = uts.track_id
WHERE uts.user_id = $1
GROUP BY genre
ORDER BY total_time DESC;
```

### 3.3 Artist Grouping for Profile Pages

With the `artists` and `track_artists` tables populated from Phase 2's title parsing:

```sql
-- "User's top artists by listening time"
SELECT a.name, a.id,
       COUNT(DISTINCT uts.track_id) AS tracks_listened,
       SUM(uts.total_seconds) AS total_seconds
FROM user_track_stats uts
JOIN track_artists ta ON ta.track_id = uts.track_id
JOIN artists a ON a.id = ta.artist_id
WHERE uts.user_id = $1
GROUP BY a.id, a.name
ORDER BY total_seconds DESC
LIMIT 20;

-- "All tracks by a specific artist"
SELECT t.*
FROM tracks t
JOIN track_artists ta ON ta.track_id = t.id
WHERE ta.artist_id = $1
ORDER BY t.quality_score DESC;
```

### 3.4 Frontend List Types Enabled by This Schema

With the data model from Phases 2-3, you can build these categorical lists with simple queries:

| List | Query basis |
|------|-------------|
| **Recently Played** | `user_listening_events` ordered by `played_at DESC`, joined to canonical `tracks` (deduped — no repeated variants) |
| **Top Tracks (This Week / Month / All Time)** | `user_track_stats` ordered by `total_seconds`, optionally filtered by `played_at` range from events |
| **Top Artists** | `user_track_stats` → `track_artists` → `artists`, grouped by artist, ordered by total listening time |
| **By Genre** | `tracks.topic_categories` grouped into genre buckets, per-user via `user_track_stats` |
| **Liked Songs** | `user_track_stats WHERE liked = true` |
| **Discovery / New to You** | Tracks with low `play_count` that score high in similarity to liked tracks (Phase 4) |
| **Most Skipped** | `user_track_stats` ordered by `skip_count DESC` (useful for negative signal in recommendations) |
| **Artist Radio** | Given an artist, find their tracks + similar tracks via topic overlap or embedding similarity (Phase 4) |

---

## Phase 4 — Embedding-Based Similarity (Replacing TF-IDF)

**Cost:** Medium-high · **Timeline:** After Phase 2 Postgres is stable · **Dependencies:** Phase 2, pgvector on Neon

> [!NOTE]
> This is a distinct project phase, not a drop-in swap. Budget it separately from the DB migration.

### 4.1 Why Replace TF-IDF

Current `recommend.js` does TF-IDF + cosine similarity on `snippet.tags`. Problems:
- Raw YouTube tags are SEO-stuffed, inconsistent, and have no controlled vocabulary
- TF-IDF on noisy input gives noisy similarity
- Recomputed per request in Node — doesn't scale
- No semantic understanding ("moody piano" doesn't cluster near "sad ballad")

### 4.2 Implementation (Solo-Dev Friendly)

**Embedding generation** — use `@xenova/transformers` (runs the `all-MiniLM-L6-v2` model locally in Node.js, no external API costs):

```javascript
import { pipeline } from '@xenova/transformers';
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

async function embedTrack(track) {
  const text = [
    track.title,
    track.artist_name,
    ...(track.topic_categories || []),
    ...(track.content_tags || [])
  ].filter(Boolean).join(' ');
  
  const result = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data); // 384-dim vector
}
```

**Storage** — pgvector column on the `tracks` table:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE tracks ADD COLUMN embedding vector(384);
CREATE INDEX idx_tracks_embedding ON tracks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

**Similarity query:**

```sql
-- Find 20 most similar tracks to a given track
SELECT id, title, artist_name, 1 - (embedding <=> $1) AS similarity
FROM tracks
WHERE embedding IS NOT NULL
  AND id != $2  -- exclude self
ORDER BY embedding <=> $1
LIMIT 20;
```

**Ingest pipeline:** Embed each track once at insert/update time. For the existing corpus, run a one-time backfill script. Incremental cost for new tracks is ~50ms per track locally — negligible.

---

## Phase 5 — Taste Bootstrap via Liked Videos / Takeout (Optional, Independent)

**Cost:** Medium engineering, gated by Google OAuth verification · **Timeline:** Can start verification process in parallel

### 5.1 Option A: Liked Videos + Subscriptions Import (OAuth)

- Requires `youtube.readonly` scope (sensitive, needs Google verification)
- `channels.list?mine=true` → `contentDetails.relatedPlaylists.likes` → `playlistItems.list`
- `subscriptions.list` → channel IDs for taste inference
- **Bottleneck:** Google's human review process (weeks to months), not engineering time

### 5.2 Option B: Google Takeout Upload (Zero Verification Cost)

- User downloads their YouTube watch history from Google Takeout (JSON/HTML file)
- Upload to your app, parse locally, cross-reference video IDs against your `tracks` table
- **Pros:** More history data than Liked Videos, no OAuth verification needed
- **Cons:** Manual, one-time, users need to know about Takeout

### 5.3 Recommendation

Start with **Option B** (Takeout upload) as a v1 bootstrap — it's shippable immediately with zero external dependencies. File Option A's OAuth verification in parallel; when approved, offer it as the seamless "Connect YouTube" flow.

---

## Verification Plan

### Automated Tests

```bash
# Unit tests for title parsing
npm test -- --grep "parseArtistTrack"

# Unit tests for canonicalization matching
npm test -- --grep "areSameTrack"

# Unit tests for quality score computation
npm test -- --grep "computeQualityScore"

# Integration: batch videos.list call with mock data
npm test -- --grep "batchFetchVideoDetails"

# Integration: full ingest pipeline (search → filter → parse → dedup → insert)
npm test -- --grep "trackIngestPipeline"
```

### Manual Verification

- **Quota check:** Monitor YouTube API quota dashboard before/after Phase 1 to confirm ~10-50x reduction in `videos.list` calls
- **Filter quality audit:** Run the new filters against 100 known search queries, manually review the accept/reject decisions for false positives (good songs rejected) and false negatives (junk that got through)
- **Dedup audit:** Search for 5 popular songs known to have many YouTube uploads (e.g. "Blinding Lights", "Shape of You"), verify they canonicalize to one row with correct primary variant
- **Genre bucket check:** Verify that `topicCategories` → genre mapping produces sensible buckets for a sample of 50 tracks
- **Frontend list queries:** Execute each query from the "Frontend List Types" table against test data and verify correct results

---

## Summary: What's Low-Cost and High-Impact for a Solo Dev

| Phase | Solo-Dev Effort | Impact on UX | Ship independently? |
|-------|----------------|--------------|---------------------|
| **1 — Filters & Quota** | ~2-3 days | Stops playback failures, stops wasting quota, stops rejecting valid songs | ✅ Yes, this week |
| **2 — Schema & Parsing** | ~1 week (part of Postgres migration) | Enables all categorical lists, artist grouping, proper listening analytics | ✅ Ships with Postgres migration |
| **3 — Dedup & Genres** | ~3-4 days | "Recently played" stops showing duplicates, genre buckets work, recommendations improve | Needs Phase 2 |
| **4 — Embeddings** | ~3-4 days | "Similar songs" actually works well, "Artist Radio" becomes useful | Needs Phase 2 |
| **5 — Taste Bootstrap** | ~2 days (Takeout), weeks (OAuth) | New users get personalized lists immediately instead of cold-start | Independent |

> [!TIP]
> **Phases 1 → 2 → 3 is the critical path.** Phase 1 fixes active bugs and ships immediately. Phase 2 gives you the relational foundation. Phase 3 gives you the canonical track model that makes every frontend list work properly. Phases 4 and 5 are genuine improvements but not blockers for a good categorical UX.
