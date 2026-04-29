-- AlterEnum
BEGIN;
CREATE TYPE "ActivityType_new" AS ENUM ('ADD_ITEM', 'ADD_WANT', 'RATE_ITEM', 'CREATE_COLLECTION', 'ADD_TO_COLLECTION', 'FOLLOW_USER');
ALTER TABLE "activities" ALTER COLUMN "type" TYPE "ActivityType_new" USING ("type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "public"."ActivityType_old";
COMMIT;

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'NEW_SHELF_ADD';

-- DropForeignKey
ALTER TABLE "activities" DROP CONSTRAINT "activities_itemId_fkey";

-- DropForeignKey
ALTER TABLE "items" DROP CONSTRAINT "items_userId_fkey";

-- DropForeignKey
ALTER TABLE "list_items" DROP CONSTRAINT "list_items_itemId_fkey";

-- DropForeignKey
ALTER TABLE "list_items" DROP CONSTRAINT "list_items_listId_fkey";

-- DropForeignKey
ALTER TABLE "lists" DROP CONSTRAINT "lists_userId_fkey";

-- DropForeignKey
ALTER TABLE "wishlist_items" DROP CONSTRAINT "wishlist_items_userId_fkey";

-- DropIndex
DROP INDEX "sessions_token_idx";

-- AlterTable
ALTER TABLE "activities" DROP COLUMN "itemId",
DROP COLUMN "listId",
DROP COLUMN "wishlistItemId",
ADD COLUMN     "collectionId" TEXT,
ADD COLUMN     "shelfItemId" TEXT,
ADD COLUMN     "targetUserId" TEXT;

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "count" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "windowStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "wishlistIsPublic",
ADD COLUMN     "isPrivate" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastExportAt" TIMESTAMP(3),
ADD COLUMN     "notificationPrefs" JSONB,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "username" DROP NOT NULL,
ALTER COLUMN "bio" SET DATA TYPE VARCHAR(280);

-- DropTable
DROP TABLE "items";

-- DropTable
DROP TABLE "list_items";

-- DropTable
DROP TABLE "lists";

-- DropTable
DROP TABLE "wishlist_items";

-- CreateTable
CREATE TABLE "releases" (
    "id" TEXT NOT NULL,
    "discogsId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "label" TEXT,
    "year" INTEGER,
    "country" TEXT,
    "format" TEXT NOT NULL,
    "coverUrl" TEXT,
    "tracklist" JSONB,
    "avgRating" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shelf_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "rating" INTEGER,
    "note" TEXT,
    "acquiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shelf_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "releaseId" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "shelfItemId" TEXT NOT NULL,
    "position" INTEGER,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "releases_discogsId_key" ON "releases"("discogsId");

-- CreateIndex
CREATE INDEX "shelf_items_userId_idx" ON "shelf_items"("userId");

-- CreateIndex
CREATE INDEX "shelf_items_releaseId_idx" ON "shelf_items"("releaseId");

-- CreateIndex
CREATE INDEX "shelf_items_createdAt_idx" ON "shelf_items"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "shelf_items_userId_releaseId_key" ON "shelf_items"("userId", "releaseId");

-- CreateIndex
CREATE INDEX "wants_userId_idx" ON "wants"("userId");

-- CreateIndex
CREATE INDEX "wants_releaseId_idx" ON "wants"("releaseId");

-- CreateIndex
CREATE UNIQUE INDEX "wants_userId_releaseId_key" ON "wants"("userId", "releaseId");

-- CreateIndex
CREATE INDEX "collections_userId_idx" ON "collections"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "collections_userId_slug_key" ON "collections"("userId", "slug");

-- CreateIndex
CREATE INDEX "collection_items_shelfItemId_idx" ON "collection_items"("shelfItemId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_items_collectionId_shelfItemId_key" ON "collection_items"("collectionId", "shelfItemId");

-- CreateIndex
CREATE INDEX "user_blocks_blockerId_idx" ON "user_blocks"("blockerId");

-- CreateIndex
CREATE INDEX "user_blocks_blockedId_idx" ON "user_blocks"("blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerId_blockedId_key" ON "user_blocks"("blockerId", "blockedId");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_userId_idx" ON "push_tokens"("userId");

-- CreateIndex
CREATE INDEX "activities_userId_createdAt_idx" ON "activities"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "activities_collectionId_idx" ON "activities"("collectionId");

-- CreateIndex
CREATE INDEX "activities_targetUserId_idx" ON "activities"("targetUserId");

-- CreateIndex
CREATE INDEX "activity_likes_activityId_idx" ON "activity_likes"("activityId");

-- CreateIndex
CREATE INDEX "activity_likes_userId_idx" ON "activity_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_userId_fromUserId_type_windowStart_key" ON "notifications"("userId", "fromUserId", "type", "windowStart");

-- AddForeignKey
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wants" ADD CONSTRAINT "wants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wants" ADD CONSTRAINT "wants_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_shelfItemId_fkey" FOREIGN KEY ("shelfItemId") REFERENCES "shelf_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_shelfItemId_fkey" FOREIGN KEY ("shelfItemId") REFERENCES "shelf_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
