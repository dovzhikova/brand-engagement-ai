-- AlterTable: Add brand parameter columns to brands
ALTER TABLE "brands" ADD COLUMN "website" TEXT;
ALTER TABLE "brands" ADD COLUMN "tone_of_voice" TEXT;
ALTER TABLE "brands" ADD COLUMN "messaging_strategy" TEXT;
ALTER TABLE "brands" ADD COLUMN "goals" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "brands" ADD COLUMN "target_audience" TEXT;
ALTER TABLE "brands" ADD COLUMN "product_description" TEXT;
ALTER TABLE "brands" ADD COLUMN "key_differentiators" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "brands" ADD COLUMN "brand_values" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "brands" ADD COLUMN "content_guidelines" TEXT;

-- Data migration: ensure every persona has a brand_id
-- Assign orphaned personas to the first brand their org owner belongs to,
-- or the first brand in the system as a fallback
UPDATE "personas"
SET "brand_id" = (
  SELECT b.id FROM "brands" b
  INNER JOIN "brand_members" bm ON bm."brand_id" = b.id
  LIMIT 1
)
WHERE "brand_id" IS NULL;

-- Delete any personas that still have no brand_id (no brands exist)
DELETE FROM "personas" WHERE "brand_id" IS NULL;

-- AlterTable: Make brand_id NOT NULL on personas
ALTER TABLE "personas" ALTER COLUMN "brand_id" SET NOT NULL;

-- Drop organization_id from personas
-- First drop the FK constraint if it exists
ALTER TABLE "personas" DROP CONSTRAINT IF EXISTS "personas_organization_id_fkey";

-- Drop the index if it exists
DROP INDEX IF EXISTS "personas_organization_id_idx";

-- Drop the column
ALTER TABLE "personas" DROP COLUMN IF EXISTS "organization_id";
