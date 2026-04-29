/*
  Warnings:

  - You are about to drop the column `addedAt` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `artist` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `barcode` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `collectionId` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `discogsId` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `genre` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `items` table. All the data in the column will be lost.
  - You are about to drop the column `banned` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastActiveAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `locked` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `phoneNumber` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `preferredLocale` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `preferredTheme` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `privateMetadata` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `publicMetadata` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `collections` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `item_metadata` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `wishlist` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `albumTitle` to the `items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `artistName` to the `items` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `format` on the `items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `username` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('ADD_ITEM', 'ADD_WANT', 'RATE_ITEM', 'CREATE_LIST', 'ADD_TO_LIST');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_FOLLOWER', 'ACTIVITY_LIKE', 'ACTIVITY_COMMENT');

-- DropForeignKey
ALTER TABLE "collections" DROP CONSTRAINT "collections_userId_fkey";

-- DropForeignKey
ALTER TABLE "item_metadata" DROP CONSTRAINT "item_metadata_itemId_fkey";

-- DropForeignKey
ALTER TABLE "items" DROP CONSTRAINT "items_collectionId_fkey";

-- DropForeignKey
ALTER TABLE "wishlist" DROP CONSTRAINT "wishlist_userId_fkey";

-- DropIndex
DROP INDEX "items_collectionId_idx";

-- DropIndex
DROP INDEX "items_discogsId_idx";

-- DropIndex
DROP INDEX "items_discogsId_userId_collectionId_key";

-- DropIndex
DROP INDEX "items_format_idx";

-- DropIndex
DROP INDEX "users_emailVerified_idx";

-- AlterTable
ALTER TABLE "items" DROP COLUMN "addedAt",
DROP COLUMN "artist",
DROP COLUMN "barcode",
DROP COLUMN "collectionId",
DROP COLUMN "country",
DROP COLUMN "discogsId",
DROP COLUMN "genre",
DROP COLUMN "title",
ADD COLUMN     "albumTitle" TEXT NOT NULL,
ADD COLUMN     "artistName" TEXT NOT NULL,
ADD COLUMN     "condition" TEXT,
ADD COLUMN     "discogsReleaseId" TEXT,
ADD COLUMN     "discogsUrl" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "ownedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "pressing" TEXT,
ADD COLUMN     "rating" INTEGER,
DROP COLUMN "format",
ADD COLUMN     "format" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "banned",
DROP COLUMN "emailVerified",
DROP COLUMN "firstName",
DROP COLUMN "lastActiveAt",
DROP COLUMN "lastLoginAt",
DROP COLUMN "lastName",
DROP COLUMN "locked",
DROP COLUMN "phoneNumber",
DROP COLUMN "preferredLocale",
DROP COLUMN "preferredTheme",
DROP COLUMN "privateMetadata",
DROP COLUMN "publicMetadata",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "wishlistIsPublic" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "username" SET NOT NULL;

-- DropTable
DROP TABLE "collections";

-- DropTable
DROP TABLE "item_metadata";

-- DropTable
DROP TABLE "wishlist";

-- DropEnum
DROP TYPE "Format";

-- CreateTable
CREATE TABLE "wishlist_items" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "discogsReleaseId" TEXT NOT NULL,
    "artistName" TEXT NOT NULL,
    "albumTitle" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "coverUrl" TEXT,
    "discogsUrl" TEXT,
    "year" INTEGER,
    "label" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lists" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "list_items" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "position" INTEGER,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "list_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follows" (
    "id" TEXT NOT NULL,
    "followerId" TEXT NOT NULL,
    "followingId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "itemId" TEXT,
    "wishlistItemId" TEXT,
    "listId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_likes" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_comments" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" VARCHAR(280) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "fromUserId" TEXT,
    "activityId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wishlist_items_userId_idx" ON "wishlist_items"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "wishlist_items_userId_discogsReleaseId_key" ON "wishlist_items"("userId", "discogsReleaseId");

-- CreateIndex
CREATE INDEX "lists_userId_idx" ON "lists"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "list_items_listId_itemId_key" ON "list_items"("listId", "itemId");

-- CreateIndex
CREATE INDEX "follows_followerId_idx" ON "follows"("followerId");

-- CreateIndex
CREATE INDEX "follows_followingId_idx" ON "follows"("followingId");

-- CreateIndex
CREATE UNIQUE INDEX "follows_followerId_followingId_key" ON "follows"("followerId", "followingId");

-- CreateIndex
CREATE INDEX "activities_userId_idx" ON "activities"("userId");

-- CreateIndex
CREATE INDEX "activities_createdAt_idx" ON "activities"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "activity_likes_activityId_userId_key" ON "activity_likes"("activityId", "userId");

-- CreateIndex
CREATE INDEX "activity_comments_activityId_idx" ON "activity_comments"("activityId");

-- CreateIndex
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

-- CreateIndex
CREATE INDEX "items_discogsReleaseId_idx" ON "items"("discogsReleaseId");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- AddForeignKey
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lists" ADD CONSTRAINT "lists_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "list_items" ADD CONSTRAINT "list_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follows" ADD CONSTRAINT "follows_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_likes" ADD CONSTRAINT "activity_likes_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_likes" ADD CONSTRAINT "activity_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_comments" ADD CONSTRAINT "activity_comments_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_comments" ADD CONSTRAINT "activity_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
