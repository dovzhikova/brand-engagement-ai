-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateTable: organizations
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable: organization_members
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: organizations
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex: organization_members
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- AlterTable: users
ALTER TABLE "users" ADD COLUMN "default_organization_id" TEXT;

-- AlterTable: user_preferences
ALTER TABLE "user_preferences" ADD COLUMN "organization_id" TEXT;

-- AlterTable: personas
ALTER TABLE "personas" ADD COLUMN "organization_id" TEXT;

-- AlterTable: reddit_accounts
ALTER TABLE "reddit_accounts" ADD COLUMN "organization_id" TEXT;

-- AlterTable: keywords
ALTER TABLE "keywords" ADD COLUMN "organization_id" TEXT;

-- AlterTable: engagement_items
ALTER TABLE "engagement_items" ADD COLUMN "organization_id" TEXT;

-- AlterTable: google_accounts
ALTER TABLE "google_accounts" ADD COLUMN "organization_id" TEXT;

-- AlterTable: gsc_keywords
ALTER TABLE "gsc_keywords" ADD COLUMN "organization_id" TEXT;

-- AlterTable: youtube_channels
ALTER TABLE "youtube_channels" ADD COLUMN "organization_id" TEXT;

-- AlterTable: youtube_videos
ALTER TABLE "youtube_videos" ADD COLUMN "organization_id" TEXT;

-- AlterTable: youtube_discovery_jobs
ALTER TABLE "youtube_discovery_jobs" ADD COLUMN "organization_id" TEXT;

-- CreateIndex: organization_id indexes
CREATE INDEX "personas_organization_id_idx" ON "personas"("organization_id");
CREATE INDEX "reddit_accounts_organization_id_idx" ON "reddit_accounts"("organization_id");
CREATE INDEX "keywords_organization_id_idx" ON "keywords"("organization_id");
CREATE INDEX "engagement_items_organization_id_idx" ON "engagement_items"("organization_id");
CREATE INDEX "google_accounts_organization_id_idx" ON "google_accounts"("organization_id");
CREATE INDEX "gsc_keywords_organization_id_idx" ON "gsc_keywords"("organization_id");
CREATE INDEX "youtube_channels_organization_id_idx" ON "youtube_channels"("organization_id");
CREATE INDEX "youtube_videos_organization_id_idx" ON "youtube_videos"("organization_id");
CREATE INDEX "youtube_discovery_jobs_organization_id_idx" ON "youtube_discovery_jobs"("organization_id");

-- AddForeignKey: organization_members -> organizations
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: organization_members -> users
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: user_preferences -> organizations
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: personas -> organizations
ALTER TABLE "personas" ADD CONSTRAINT "personas_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: reddit_accounts -> organizations
ALTER TABLE "reddit_accounts" ADD CONSTRAINT "reddit_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: keywords -> organizations
ALTER TABLE "keywords" ADD CONSTRAINT "keywords_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: engagement_items -> organizations
ALTER TABLE "engagement_items" ADD CONSTRAINT "engagement_items_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: google_accounts -> organizations
ALTER TABLE "google_accounts" ADD CONSTRAINT "google_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: gsc_keywords -> organizations
ALTER TABLE "gsc_keywords" ADD CONSTRAINT "gsc_keywords_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: youtube_channels -> organizations
ALTER TABLE "youtube_channels" ADD CONSTRAINT "youtube_channels_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: youtube_videos -> organizations
ALTER TABLE "youtube_videos" ADD CONSTRAINT "youtube_videos_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: youtube_discovery_jobs -> organizations
ALTER TABLE "youtube_discovery_jobs" ADD CONSTRAINT "youtube_discovery_jobs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data migration: Create default organization and migrate existing data
-- This section creates a default organization and assigns existing users/data to it

-- Create default organization
INSERT INTO "organizations" ("id", "name", "slug", "created_at", "updated_at")
VALUES (
    'default-org-' || gen_random_uuid()::text,
    'Default Organization',
    'default',
    NOW(),
    NOW()
);

-- Store the default org ID for subsequent queries
DO $$
DECLARE
    default_org_id TEXT;
BEGIN
    SELECT id INTO default_org_id FROM "organizations" WHERE slug = 'default' LIMIT 1;

    -- Add all existing users as OWNER of the default organization
    INSERT INTO "organization_members" ("id", "organization_id", "user_id", "role", "created_at")
    SELECT
        gen_random_uuid()::text,
        default_org_id,
        id,
        'OWNER'::"OrgRole",
        NOW()
    FROM "users";

    -- Set default organization for all users
    UPDATE "users" SET "default_organization_id" = default_org_id;

    -- Migrate all existing data to the default organization
    UPDATE "personas" SET "organization_id" = default_org_id;
    UPDATE "reddit_accounts" SET "organization_id" = default_org_id;
    UPDATE "keywords" SET "organization_id" = default_org_id;
    UPDATE "engagement_items" SET "organization_id" = default_org_id;
    UPDATE "google_accounts" SET "organization_id" = default_org_id;
    UPDATE "gsc_keywords" SET "organization_id" = default_org_id;
    UPDATE "youtube_channels" SET "organization_id" = default_org_id;
    UPDATE "youtube_videos" SET "organization_id" = default_org_id;
    UPDATE "youtube_discovery_jobs" SET "organization_id" = default_org_id;
    UPDATE "user_preferences" SET "organization_id" = default_org_id;
END $$;
