-- Assign existing engagement items without a brandId to the Default Brand
-- This fixes legacy data that was created before the brand system was fully implemented

-- Update engagement_items to assign them to "Default Brand"
UPDATE "engagement_items"
SET "brand_id" = (
  SELECT "id" FROM "brands" WHERE "name" = 'Default Brand' LIMIT 1
)
WHERE "brand_id" IS NULL
  AND EXISTS (SELECT 1 FROM "brands" WHERE "name" = 'Default Brand');

-- If no "Default Brand" exists, assign to the first available brand
UPDATE "engagement_items"
SET "brand_id" = (
  SELECT "id" FROM "brands" ORDER BY "created_at" ASC LIMIT 1
)
WHERE "brand_id" IS NULL
  AND EXISTS (SELECT 1 FROM "brands");
