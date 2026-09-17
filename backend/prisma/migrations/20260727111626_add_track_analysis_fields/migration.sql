-- AlterTable
ALTER TABLE "tracks" ADD COLUMN     "artist_name" TEXT,
ADD COLUMN     "content_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "is_embeddable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "licensed_content" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "quality_score" DOUBLE PRECISION,
ADD COLUMN     "raw_title" TEXT,
ADD COLUMN     "topic_categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
