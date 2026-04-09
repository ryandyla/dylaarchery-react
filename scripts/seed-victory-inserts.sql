-- Victory Archery Inserts Seed
-- Source: Victory Archery 2026 Hunting Application Guide
-- Run: wrangler d1 execute dylaarchery --file=scripts/seed-victory-inserts.sql --remote
-- NOTE: No pricing in source — price_per_arrow set to 0.00, update in admin.

-- ── .204 / SMALL DIAMETER (RIP, RIP XV, RIP TKO, RIP SS, HLR) ───────────────

-- RIP SHOK inserts — half-out style, sized per spine
-- Weight variants: 21gr Alum, 50gr SS, 60gr SS

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Victory', 'RIP SHOK 21gr Aluminum', 'rip-shok', 'half-out', 0.204, 21, 0.00, 0, NULL, NULL, 1, 'insert');

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Victory', 'RIP SHOK 50gr Stainless Steel', 'rip-shok', 'half-out', 0.204, 50, 0.00, 0, NULL, NULL, 1, 'insert');

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Victory', 'RIP SHOK 60gr Stainless Steel', 'rip-shok', 'half-out', 0.204, 60, 0.00, 0, NULL, NULL, 1, 'insert');

-- SHOK Taper Lock .204 inserts — fits RIP, RIP XV, RIP TKO, RIP SS, HLR
-- Weight variants: 50gr Alum, 75gr Alum/SS

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Victory', 'SHOK Taper Lock 50gr Aluminum', 'taper-lock', 'half-out', 0.204, 50, 0.00, 0, NULL, NULL, 1, 'insert');

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Victory', 'SHOK Taper Lock 75gr Alum/SS', 'taper-lock', 'half-out', 0.204, 75, 0.00, 0, NULL, NULL, 1, 'insert');

-- ── .166 / MICRO DIAMETER (VAP, VAP TKO, VAP SS, VLR) ───────────────────────

-- SHOK Taper Lock .166 inserts
-- Weight variants: 50gr Alum, 75gr Alum/SS, 95gr SS

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Victory', 'SHOK Taper Lock 50gr Aluminum', 'taper-lock', 'half-out', 0.166, 50, 0.00, 0, NULL, NULL, 1, 'insert');

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Victory', 'SHOK Taper Lock 75gr Alum/SS', 'taper-lock', 'half-out', 0.166, 75, 0.00, 0, NULL, NULL, 1, 'insert');

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Victory', 'SHOK Taper Lock 95gr Stainless Steel', 'taper-lock', 'half-out', 0.166, 95, 0.00, 0, NULL, NULL, 1, 'insert');
