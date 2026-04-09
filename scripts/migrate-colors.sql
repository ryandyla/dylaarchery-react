-- Add color support to vanes, nocks, and arrow_builds
-- Run: wrangler d1 execute dylaarchery --file=scripts/migrate-colors.sql --remote

ALTER TABLE vanes ADD COLUMN colors TEXT; -- JSON array e.g. '["black","white","red"]'
ALTER TABLE nocks ADD COLUMN colors TEXT;
ALTER TABLE arrow_builds ADD COLUMN nock_color TEXT;
-- vane_primary_color already exists on arrow_builds

-- Default standard nock colors for all non-lighted nocks
UPDATE nocks
SET colors = '["black","white","orange","yellow","green","blue","red","pink"]'
WHERE active = 1
  AND brand NOT IN ('Lumenok', 'Nockturnal');
