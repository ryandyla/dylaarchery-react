-- Victory Insert update: correct model names + add real pricing from Lancaster Archery
-- Run: wrangler d1 execute dylaarchery --file=scripts/update-victory-inserts.sql --remote

-- ── UPDATE existing .204 rows ─────────────────────────────────────────────────

UPDATE inserts SET model = 'RIP SHOK 21gr Aluminum', price_per_arrow = 1.58
  WHERE brand = 'Victory' AND shaft_id_in = 0.204 AND system = 'rip-shok' AND weight_grains = 21;

UPDATE inserts SET model = 'HLR SHOK 50gr SS Halfout', price_per_arrow = 2.58
  WHERE brand = 'Victory' AND shaft_id_in = 0.204 AND system = 'rip-shok' AND weight_grains = 50;

UPDATE inserts SET model = 'RIP SHOK 60gr SS', price_per_arrow = 2.58
  WHERE brand = 'Victory' AND shaft_id_in = 0.204 AND system = 'rip-shok' AND weight_grains = 60;

UPDATE inserts SET model = 'RIP/HLR SHOK Taper Lock 50gr Aluminum', price_per_arrow = 3.75
  WHERE brand = 'Victory' AND shaft_id_in = 0.204 AND system = 'taper-lock' AND weight_grains = 50;

UPDATE inserts SET model = 'RIP/HLR SHOK Taper Lock 75gr SS/Alum', price_per_arrow = 4.58
  WHERE brand = 'Victory' AND shaft_id_in = 0.204 AND system = 'taper-lock' AND weight_grains = 75;

-- ── UPDATE existing .166 rows ─────────────────────────────────────────────────

UPDATE inserts SET model = 'VAP SHOK Taper Lock 50gr Aluminum', price_per_arrow = 3.75
  WHERE brand = 'Victory' AND shaft_id_in = 0.166 AND system = 'taper-lock' AND weight_grains = 50;

UPDATE inserts SET model = 'VAP SHOK Taper Lock 75gr SS/Alum', price_per_arrow = 4.58
  WHERE brand = 'Victory' AND shaft_id_in = 0.166 AND system = 'taper-lock' AND weight_grains = 75;

UPDATE inserts SET model = 'VAP SHOK Taper Lock 95gr SS', price_per_arrow = 4.58
  WHERE brand = 'Victory' AND shaft_id_in = 0.166 AND system = 'taper-lock' AND weight_grains = 95;

-- ── INSERT new .166 rows (VAP SHOK non-taper-lock) ───────────────────────────

-- VAP Shok Aluminum Insert — $20.99/12 = $1.75/arrow
INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Victory', 'VAP SHOK 35gr Aluminum', 'rip-shok', 'half-out', 0.166, 35, 1.75, 0, NULL, NULL, 1, 'insert');

-- VAP Shok SS Insert — $35.88/12 = $2.99/arrow
INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Victory', 'VAP SHOK 95gr SS', 'rip-shok', 'half-out', 0.166, 95, 2.99, 0, NULL, NULL, 1, 'insert');
