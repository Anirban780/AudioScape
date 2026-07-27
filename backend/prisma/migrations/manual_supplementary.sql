-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Fuzzy/typo-tolerant matching indexes
CREATE INDEX IF NOT EXISTS idx_tracks_title_trgm ON tracks USING GIN (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_channels_title_trgm ON channels USING GIN (title gin_trgm_ops);

-- Auto-maintained full-text search vector trigger
CREATE OR REPLACE FUNCTION tracks_search_vector_trigger() RETURNS trigger AS $$
begin
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(array_to_string(new.genre, ' '), '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
  return new;
end
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvectorupdate ON tracks;
CREATE TRIGGER tsvectorupdate
BEFORE INSERT OR UPDATE ON tracks
FOR EACH ROW EXECUTE FUNCTION tracks_search_vector_trigger();

-- Integrity constraints Prisma's DSL cannot express
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_duration_nonneg') THEN
        ALTER TABLE tracks ADD CONSTRAINT chk_duration_nonneg CHECK (duration_seconds IS NULL OR duration_seconds >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_view_count_nonneg') THEN
        ALTER TABLE tracks ADD CONSTRAINT chk_view_count_nonneg CHECK (view_count IS NULL OR view_count >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_play_count_min') THEN
        ALTER TABLE listen_history ADD CONSTRAINT chk_play_count_min CHECK (play_count >= 1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_position_nonneg') THEN
        ALTER TABLE playlist_tracks ADD CONSTRAINT chk_position_nonneg CHECK (position >= 0);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_units_nonneg') THEN
        ALTER TABLE api_quota_usage ADD CONSTRAINT chk_units_nonneg CHECK (units_consumed >= 0);
    END IF;
END $$;
