-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferredLocale" TEXT DEFAULT 'en';
