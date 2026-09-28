-- AlterEnum: Add FAVORITES and HISTORY to PlaybackSource
-- SAFE: Idempotent execution using IF NOT EXISTS for Neon PostgreSQL
ALTER TYPE "PlaybackSource" ADD VALUE IF NOT EXISTS 'FAVORITES';
ALTER TYPE "PlaybackSource" ADD VALUE IF NOT EXISTS 'HISTORY';
