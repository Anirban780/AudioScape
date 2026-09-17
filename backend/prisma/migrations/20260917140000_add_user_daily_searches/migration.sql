-- CreateTable: Additive migration for UserDailySearch
-- SAFE: Uses IF NOT EXISTS to guarantee zero data loss and idempotent execution across local Docker and Neon PostgreSQL.

CREATE TABLE IF NOT EXISTS "user_daily_searches" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "search_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_daily_searches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "user_daily_searches_identifier_date_key" ON "user_daily_searches"("identifier", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "user_daily_searches_date_idx" ON "user_daily_searches"("date");
