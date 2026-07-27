-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- CreateEnum
CREATE TYPE "PlaybackSource" AS ENUM ('SEARCH', 'EXPLORE', 'RECOMMENDATION', 'PLAYLIST', 'RELATED_QUEUE');

-- CreateEnum
CREATE TYPE "TrackSource" AS ENUM ('SEARCH', 'RELATED_CACHE', 'RECOMMENDATION_BACKFILL', 'MANUAL');

-- CreateEnum
CREATE TYPE "QueryType" AS ENUM ('USER_SEARCH', 'CURATED_KEYWORD', 'RECOMMENDATION');

-- CreateEnum
CREATE TYPE "ApiEndpoint" AS ENUM ('SEARCH_LIST', 'VIDEOS_LIST', 'VIDEO_CATEGORIES_LIST');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "auth_id" TEXT NOT NULL,
    "email" TEXT,
    "display_name" TEXT,
    "photo_url" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listen_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "play_count" INTEGER NOT NULL DEFAULT 1,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "liked_at" TIMESTAMP(3),
    "source" "PlaybackSource" NOT NULL DEFAULT 'SEARCH',
    "first_played_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_played_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listen_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_tracks" (
    "id" TEXT NOT NULL,
    "playlist_id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "playlist_tracks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "subscriber_count" BIGINT,
    "last_fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracks" (
    "youtube_video_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channel_id" TEXT,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "duration" TEXT,
    "duration_seconds" INTEGER,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "genre" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "category_id" TEXT,
    "published_at" TIMESTAMP(3),
    "view_count" BIGINT,
    "like_count" BIGINT,
    "search_vector" tsvector,
    "source" "TrackSource" NOT NULL DEFAULT 'SEARCH',
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "last_fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetch_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracks_pkey" PRIMARY KEY ("youtube_video_id")
);

-- CreateTable
CREATE TABLE "search_queries" (
    "id" TEXT NOT NULL,
    "normalized_query" TEXT NOT NULL,
    "raw_query" TEXT NOT NULL,
    "query_type" "QueryType" NOT NULL DEFAULT 'USER_SEARCH',
    "hit_count" INTEGER NOT NULL DEFAULT 1,
    "result_count" INTEGER,
    "last_youtube_fetch_at" TIMESTAMP(3),
    "last_searched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_queries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_track_results" (
    "id" TEXT NOT NULL,
    "query_id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "rank_position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "query_track_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_quota_usage" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "endpoint" "ApiEndpoint" NOT NULL,
    "units_consumed" INTEGER NOT NULL DEFAULT 0,
    "call_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_quota_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_id_key" ON "users"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "listen_history_user_id_last_played_at_idx" ON "listen_history"("user_id", "last_played_at" DESC);

-- CreateIndex
CREATE INDEX "listen_history_track_id_idx" ON "listen_history"("track_id");

-- CreateIndex
CREATE UNIQUE INDEX "listen_history_user_id_track_id_key" ON "listen_history"("user_id", "track_id");

-- CreateIndex
CREATE UNIQUE INDEX "playlists_user_id_name_key" ON "playlists"("user_id", "name");

-- CreateIndex
CREATE INDEX "playlist_tracks_playlist_id_position_idx" ON "playlist_tracks"("playlist_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "playlist_tracks_playlist_id_track_id_key" ON "playlist_tracks"("playlist_id", "track_id");

-- CreateIndex
CREATE INDEX "tracks_channel_id_idx" ON "tracks"("channel_id");

-- CreateIndex
CREATE INDEX "tracks_last_fetched_at_idx" ON "tracks"("last_fetched_at");

-- CreateIndex
CREATE INDEX "tracks_search_vector_idx" ON "tracks" USING GIN ("search_vector");

-- CreateIndex
CREATE UNIQUE INDEX "search_queries_normalized_query_key" ON "search_queries"("normalized_query");

-- CreateIndex
CREATE INDEX "search_queries_expires_at_idx" ON "search_queries"("expires_at");

-- CreateIndex
CREATE INDEX "query_track_results_track_id_idx" ON "query_track_results"("track_id");

-- CreateIndex
CREATE UNIQUE INDEX "query_track_results_query_id_track_id_key" ON "query_track_results"("query_id", "track_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_quota_usage_date_endpoint_key" ON "api_quota_usage"("date", "endpoint");

-- AddForeignKey
ALTER TABLE "listen_history" ADD CONSTRAINT "listen_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listen_history" ADD CONSTRAINT "listen_history_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("youtube_video_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_tracks" ADD CONSTRAINT "playlist_tracks_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("youtube_video_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracks" ADD CONSTRAINT "tracks_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_track_results" ADD CONSTRAINT "query_track_results_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "search_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "query_track_results" ADD CONSTRAINT "query_track_results_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("youtube_video_id") ON DELETE CASCADE ON UPDATE CASCADE;
