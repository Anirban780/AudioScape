/*
  Warnings:

  - A unique constraint covering the columns `[date,endpoint,api_key_id]` on the table `api_quota_usage` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "api_quota_usage_date_endpoint_key";

-- AlterTable
ALTER TABLE "api_quota_usage" ADD COLUMN     "api_key_id" TEXT NOT NULL DEFAULT 'A';

-- CreateTable
CREATE TABLE "search_query_pages" (
    "id" TEXT NOT NULL,
    "query_id" TEXT NOT NULL,
    "page_token" TEXT,
    "next_page_token" TEXT,
    "page_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_query_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_query_page_results" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "track_id" TEXT NOT NULL,
    "rank_position" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_query_page_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "search_query_pages_query_id_page_token_key" ON "search_query_pages"("query_id", "page_token");

-- CreateIndex
CREATE INDEX "search_query_page_results_track_id_idx" ON "search_query_page_results"("track_id");

-- CreateIndex
CREATE UNIQUE INDEX "search_query_page_results_page_id_track_id_key" ON "search_query_page_results"("page_id", "track_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_quota_usage_date_endpoint_api_key_id_key" ON "api_quota_usage"("date", "endpoint", "api_key_id");

-- AddForeignKey
ALTER TABLE "search_query_pages" ADD CONSTRAINT "search_query_pages_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "search_queries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_query_page_results" ADD CONSTRAINT "search_query_page_results_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "search_query_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_query_page_results" ADD CONSTRAINT "search_query_page_results_track_id_fkey" FOREIGN KEY ("track_id") REFERENCES "tracks"("youtube_video_id") ON DELETE CASCADE ON UPDATE CASCADE;
