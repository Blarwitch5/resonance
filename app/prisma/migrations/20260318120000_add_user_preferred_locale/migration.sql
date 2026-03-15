-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferredLocale" TEXT DEFAULT 'en';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferredTheme" TEXT;
