/*
  Warnings:

  - Added the required column `slug` to the `items` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "discogsId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "year" INTEGER,
    "genre" TEXT,
    "country" TEXT,
    "label" TEXT,
    "format" TEXT NOT NULL,
    "barcode" TEXT,
    "coverUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "collectionId" TEXT,
    CONSTRAINT "items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_items" ("addedAt", "artist", "barcode", "collectionId", "country", "coverUrl", "createdAt", "discogsId", "format", "genre", "id", "label", "slug", "title", "updatedAt", "userId", "year") SELECT "addedAt", "artist", "barcode", "collectionId", "country", "coverUrl", "createdAt", "discogsId", "format", "genre", "id", "label", "id", "title", "updatedAt", "userId", "year" FROM "items";
DROP TABLE "items";
ALTER TABLE "new_items" RENAME TO "items";
CREATE INDEX "items_userId_idx" ON "items"("userId");
CREATE INDEX "items_collectionId_idx" ON "items"("collectionId");
CREATE INDEX "items_discogsId_idx" ON "items"("discogsId");
CREATE INDEX "items_format_idx" ON "items"("format");
CREATE UNIQUE INDEX "items_userId_slug_key" ON "items"("userId", "slug");
CREATE UNIQUE INDEX "items_discogsId_userId_collectionId_key" ON "items"("discogsId", "userId", "collectionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
