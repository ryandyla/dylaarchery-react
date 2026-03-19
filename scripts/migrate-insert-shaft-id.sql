-- Add shaft_id_in to inserts so they can be filtered by shaft inner diameter.
-- Leave NULL for existing rows (= compatible with all shafts until admin sets it).
--
-- Run: wrangler d1 execute dylaarchery --remote --file=scripts/migrate-insert-shaft-id.sql

ALTER TABLE inserts ADD COLUMN shaft_id_in REAL;
