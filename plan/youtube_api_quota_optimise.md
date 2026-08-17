# YouTube API Quota Optimization — Hybrid Search & Caching Architecture

Assumes target stack from project roadmap: **PostgreSQL (Neon)**. Firestore has no native FTS/fuzzy search, so this is designed for post-migration; a Firestore stopgap is noted at the end.

---

## 1. Database Schema & Indexing

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TABLE music_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id VARCHAR(20) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  channel_id VARCHAR(50),
  description TEXT,
  thumbnail_url TEXT,
  duration_seconds INT,
  tags TEXT[],
  category_id VARCHAR(10),
  published_at TIMESTAMPTZ,
  view_count BIGINT,
  like_count BIGINT,
  search_terms TEXT[],              -- queries that surfaced this video (popularity signal)
  search_vector TSVECTOR,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_available BOOLEAN DEFAULT TRUE, -- false = deleted/private on YouTube, soft-delete
  fetch_count INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mv_search_vector ON music_videos USING GIN(search_vector);
CREATE INDEX idx_mv_title_trgm    ON music_videos USING GIN(title gin_trgm_ops);
CREATE INDEX idx_mv_channel_trgm  ON music_videos USING GIN(channel_title gin_trgm_ops);
CREATE INDEX idx_mv_last_fetched  ON music_videos(last_fetched_at);

CREATE FUNCTION music_videos_search_trigger() RETURNS trigger AS $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.channel_title,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.tags,' '),'')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.description,'')), 'D');
  return new;
end
$$ LANGUAGE plpgsql;

CREATE TRIGGER tsvectorupdate BEFORE INSERT OR UPDATE
ON music_videos FOR EACH ROW EXECUTE FUNCTION music_videos_search_trigger();

-- Tracks whether a *query string* has been YouTube-verified recently.
-- This is the real quota-saving lever, not the per-video cache.
CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_query TEXT UNIQUE NOT NULL,
  raw_query TEXT NOT NULL,
  hit_count INT DEFAULT 1,
  last_youtube_fetch_at TIMESTAMPTZ,
  last_searched_at TIMESTAMPTZ DEFAULT now(),
  result_count INT
);
CREATE INDEX idx_sq_normalized ON search_queries(normalized_query);
```

Denormalized `search_terms[]`/`tags[]` arrays are fine at this scale; a many-to-many `video_query_map` join table is unnecessary complexity until you're doing per-query cache invalidation at high volume.

---

## 2. Search Execution Flow

**Normalize:** lowercase, trim, collapse whitespace, strip diacritics. Avoid aggressive stopword removal — "the," "of" etc. are often meaningful in song titles.

```
function searchMusic(rawQuery, limit=20):
    normQuery = normalize(rawQuery)

    # 1. Local search first
    localResults = db.query("""
        SELECT *, ts_rank(search_vector, plainto_tsquery('english', $1)) AS rank,
               similarity(title, $2) AS trgm_score
        FROM music_videos
        WHERE search_vector @@ plainto_tsquery('english', $1)
           OR title % $2                       -- pg_trgm fuzzy match
        ORDER BY rank DESC, trgm_score DESC
        LIMIT $3
    """, normQuery, rawQuery, limit * 2)         -- over-fetch, filter after

    freshResults = filter(localResults, r =>
        r.is_available AND daysSince(r.last_fetched_at) < STALE_THRESHOLD_DAYS)

    # 2. Sufficiency check
    queryMeta = db.getSearchQuery(normQuery)
    isSufficient =
        len(freshResults) >= MIN_RESULTS_THRESHOLD
        AND (queryMeta is None OR daysSince(queryMeta.last_youtube_fetch_at) < QUERY_TTL_DAYS)

    if isSufficient:
        recordQueryHit(normQuery)
        return rank(freshResults)[:limit]

    # 3. Fallback to YouTube (100 units for search.list)
    ytResults = youtubeSearch(rawQuery)
    videoIds  = ytResults.map(r => r.videoId)

    # videos.list is 1 unit per call, batchable up to 50 IDs/call
    details = youtubeVideosList(videoIds)

    upsertVideos(details, searchTerm=normQuery)   -- ON CONFLICT (video_id) DO UPDATE
    updateSearchQueryRecord(normQuery, fetchedAt=now(), resultCount=len(details))

    merged = mergeDedupe(freshResults, details, key='video_id')
    return rank(merged)[:limit]
```

**Sufficiency criteria (tunable):**
- `MIN_RESULTS_THRESHOLD` ≈ 8–10 relevant local hits
- Discard hits below a minimum rank/similarity floor so "enough but irrelevant" doesn't short-circuit a real search
- Query freshness gate (`QUERY_TTL_DAYS`) prevents re-querying YouTube for something already verified recently, even if a user hasn't searched it before personally

**Merge & rank:** dedupe by `video_id`; score = `text_rank*0.5 + trgm_similarity*0.2 + normalized(view_count)*0.2 + recency_boost*0.1`.

---

## 3. Cache Maintenance & ToS Compliance

YouTube's API ToS expects cached/displayed data to be refreshed periodically (commonly ~30 days) and deleted/private videos to be removed from display.

- Track `last_fetched_at` per video. Background job re-validates anything older than 30 days.
- Nightly/weekly job, prioritizing popular videos:
  ```sql
  SELECT video_id FROM music_videos
  WHERE last_fetched_at < now() - interval '30 days'
  ORDER BY fetch_count DESC
  LIMIT 500;
  ```
  Batch into `videos.list` calls, 50 IDs/call → 500 videos refreshed for **10 quota units**.
- If `videos.list` returns nothing for an ID → video deleted/private → set `is_available = false` (soft delete, keep for history/analytics), exclude from search results.
- Never present data older than the TTL as "current" — either refresh it synchronously if quota allows, or drop it from top-ranked results and only surface via lazy refresh.
- Don't mirror thumbnails/images — always link YouTube's CDN URLs directly (compliant, zero storage cost).

---

## 4. Additional Optimization Strategies

1. **Query-level cache is the real lever.** `search_queries` + `QUERY_TTL_DAYS` prevents repeat 100-unit charges for the same/similar query across *all* users, not just one — this is where most quota is saved, since `search.list` (not `videos.list`) is the expensive call.
2. **Canonicalize paraphrased queries** ("lofi music" / "lo-fi music" / "lofi songs") into a shared bucket via light stemming or a synonym table so they share one cache entry.
3. **Pre-warm curated/popular queries** (you already have `curatedGenres` in `ExplorePage.jsx`) via a scheduled off-peak batch job instead of reactively on first user request — turns quota cost predictable instead of bursty.
4. **Always batch `videos.list`** at 50 IDs/call. Your current `fetchTrack`/track-details calls are per-video; batch queue/related-track detail lookups where possible.
5. **Deepen the index opportunistically.** When a `search.list` call already cost 100 units, optionally pull 1–2 extra pages via `nextPageToken` during low-traffic windows to index more videos per dollar spent.
6. **Log underperforming local searches** (low result count/low rank) to prioritize what to backfill in the next batch job.
7. **Daily quota guardrail.** Track usage in a counter (Postgres row or Redis key). Near the daily cap (10,000 units default), disable live `search.list` fallback, serve local-only results with a "results may be limited" note, and catch up via overnight batch job.
8. **Meilisearch/Typesense** only once the catalog is large (100k+ videos) and Postgres FTS/trigram latency becomes a real bottleneck — turnkey relevance/typo-tolerance, but it's another service to operate. Not justified at current scale.

---

## Suggested Constants (tune empirically)

| Constant | Suggested value |
|---|---|
| `MIN_RESULTS_THRESHOLD` | 8 |
| `STALE_THRESHOLD_DAYS` (video) | 30 |
| `QUERY_TTL_DAYS` | 14–30 |
| Batch size for `videos.list` | 50 |
| Daily quota budget | 10,000 units (default cap) |

---

## Firestore Stopgap (if not yet migrated)

No native FTS/fuzzy matching. Approximate with a denormalized `keywords: string[]` field per doc and `array-contains-any` queries. Expect materially worse relevance and no fuzzy/typo tolerance — treat as a temporary bridge, not the end state, until the Postgres migration lands.