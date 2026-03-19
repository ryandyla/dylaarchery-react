-- Dyla Archery: Migrate catalog schema → commerce schema
-- Renames columns and adds pricing/active fields so the worker API can serve the catalog.
-- Pricing defaults to 0.0 — update via admin panel after running.
--
-- Run: wrangler d1 execute dylaarchery --remote --file=scripts/migrate-catalog-to-commerce.sql

PRAGMA foreign_keys = OFF;

-- ============================================================
-- shafts
-- ============================================================
ALTER TABLE shafts RENAME COLUMN id_in        TO inner_diameter;
ALTER TABLE shafts RENAME COLUMN od_in        TO outer_diameter;

ALTER TABLE shafts ADD COLUMN max_length      REAL    DEFAULT 32.0;
ALTER TABLE shafts ADD COLUMN straightness    TEXT;
ALTER TABLE shafts ADD COLUMN price_per_shaft REAL    NOT NULL DEFAULT 0.0;
ALTER TABLE shafts ADD COLUMN active          INTEGER NOT NULL DEFAULT 1;

-- ============================================================
-- vanes
-- ============================================================
ALTER TABLE vanes RENAME COLUMN length_in  TO length;
ALTER TABLE vanes RENAME COLUMN height_in  TO height;
ALTER TABLE vanes RENAME COLUMN weight_gr  TO weight_grains;

ALTER TABLE vanes ADD COLUMN profile         TEXT;
ALTER TABLE vanes ADD COLUMN compatible_micro INTEGER NOT NULL DEFAULT 1;
ALTER TABLE vanes ADD COLUMN price_per_arrow  REAL    NOT NULL DEFAULT 0.0;
ALTER TABLE vanes ADD COLUMN active           INTEGER NOT NULL DEFAULT 1;

-- Populate profile from stiffness where present
UPDATE vanes SET profile = stiffness WHERE stiffness IS NOT NULL AND stiffness != '';

-- ============================================================
-- nocks
-- ============================================================
ALTER TABLE nocks RENAME COLUMN weight_gr TO weight_grains;

ALTER TABLE nocks ADD COLUMN system        TEXT;
ALTER TABLE nocks ADD COLUMN style         TEXT;
ALTER TABLE nocks ADD COLUMN price_per_arrow REAL    NOT NULL DEFAULT 0.0;
ALTER TABLE nocks ADD COLUMN active          INTEGER NOT NULL DEFAULT 1;

-- Map nock_type → system / style
UPDATE nocks SET
  system = CASE nock_type
    WHEN 'press_fit'       THEN 'press_fit'
    WHEN 'press_fit_large' THEN 'press_fit'
    WHEN 'pin'             THEN 'pin'
    WHEN 'glue_on'         THEN 'glue_on'
    WHEN 'traditional'     THEN 'traditional'
    ELSE                        'unknown'
  END,
  style = CASE nock_type
    WHEN 'press_fit'       THEN 'standard'
    WHEN 'press_fit_large' THEN 'large'
    WHEN 'pin'             THEN 'pin'
    WHEN 'glue_on'         THEN 'glue_on'
    WHEN 'traditional'     THEN 'traditional'
    ELSE                        'unknown'
  END;

-- ============================================================
-- points
-- ============================================================
ALTER TABLE points ADD COLUMN type         TEXT;
ALTER TABLE points ADD COLUMN weight_grains REAL;
ALTER TABLE points ADD COLUMN thread        TEXT DEFAULT '8-32';
ALTER TABLE points ADD COLUMN price         REAL NOT NULL DEFAULT 0.0;
ALTER TABLE points ADD COLUMN active        INTEGER NOT NULL DEFAULT 1;

-- Map category → type ("Field Point" → "field", "Broadhead" → "broadhead")
UPDATE points SET type = CASE category
  WHEN 'Field Point' THEN 'field'
  WHEN 'Broadhead'   THEN 'broadhead'
  ELSE                    'field'
END;

-- Copy weight (use fixed weight; ranges get their min as representative)
UPDATE points SET weight_grains = COALESCE(weight_gr, weight_gr_min, 0);

-- ============================================================
-- inserts
-- ============================================================
ALTER TABLE inserts ADD COLUMN system               TEXT;
ALTER TABLE inserts ADD COLUMN type                 TEXT;
ALTER TABLE inserts ADD COLUMN weight_grains         REAL;
ALTER TABLE inserts ADD COLUMN price_per_arrow       REAL    NOT NULL DEFAULT 0.0;
ALTER TABLE inserts ADD COLUMN requires_collar       INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inserts ADD COLUMN collar_weight_grains  REAL;
ALTER TABLE inserts ADD COLUMN collar_price_per_arrow REAL;
ALTER TABLE inserts ADD COLUMN active                INTEGER NOT NULL DEFAULT 1;

-- Map product_type → system / type
UPDATE inserts SET
  system = product_type,
  type   = product_type;

-- Copy weight (use fixed weight; ranges get their min as representative)
UPDATE inserts SET weight_grains = COALESCE(weight_gr, weight_gr_min, 0);

PRAGMA foreign_keys = ON;
