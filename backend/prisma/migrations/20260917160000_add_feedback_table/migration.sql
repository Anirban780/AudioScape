-- CreateTable: Additive migration for Feedback
-- SAFE: Uses IF NOT EXISTS to guarantee zero data loss and idempotent execution across local Docker and Neon PostgreSQL.

CREATE TABLE IF NOT EXISTS "feedbacks" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_email" TEXT NOT NULL,
    "user_name" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "rating" INTEGER,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "device_info" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey safely
DO $$ BEGIN
    ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "feedbacks_created_at_idx" ON "feedbacks"("created_at" DESC);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "feedbacks_category_idx" ON "feedbacks"("category");
