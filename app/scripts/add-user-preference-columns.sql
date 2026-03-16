-- Exécuter une fois sur la base Neon (prod) si les colonnes preferredLocale/preferredTheme n'existent pas.
-- Via Neon Console > SQL Editor, ou en local : psql "$DATABASE_URL" -f scripts/add-user-preference-columns.sql

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferredLocale" TEXT DEFAULT 'en';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferredTheme" TEXT;
