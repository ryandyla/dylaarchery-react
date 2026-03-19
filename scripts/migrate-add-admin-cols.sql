-- Add image_url convenience column to catalog tables (admin writes here on image upload)
-- and system column to shafts (for shaft system grouping: .204 / .166 / 5mm / etc.)
--
-- Run: wrangler d1 execute dylaarchery --remote --file=scripts/migrate-add-admin-cols.sql

ALTER TABLE shafts  ADD COLUMN system    TEXT;
ALTER TABLE shafts  ADD COLUMN image_url TEXT;
ALTER TABLE vanes   ADD COLUMN image_url TEXT;
ALTER TABLE nocks   ADD COLUMN image_url TEXT;
ALTER TABLE points  ADD COLUMN image_url TEXT;
ALTER TABLE inserts ADD COLUMN image_url TEXT;
