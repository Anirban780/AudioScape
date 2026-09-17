-- CreateIndex
CREATE INDEX "tracks_artist_idx" ON "tracks"("artist");

-- CreateIndex
CREATE INDEX "tracks_artist_name_idx" ON "tracks"("artist_name");

-- Trigram GIN Indexes (pg_trgm) for Fuzzy Substring & Fast ILIKE Matching
-- Prevents sequential table scans during recommendation artist expansion queries
CREATE INDEX IF NOT EXISTS "idx_tracks_artist_trgm" ON "tracks" USING GIN ("artist" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "idx_tracks_artist_name_trgm" ON "tracks" USING GIN ("artist_name" gin_trgm_ops);

