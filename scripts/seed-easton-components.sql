-- Easton Components Seed
-- Run: wrangler d1 execute dylaarchery --file=scripts/seed-easton-components.sql --remote

-- ── INSERTS ──────────────────────────────────────────────────────────────────

-- 5MM HIT System ($29.99 / 12 = $2.50/arrow)
-- Break-off design: adjustable 50–75gr; listed at max weight (75gr)
-- shaft_id_in = 0.204 → diameterSchool "small" (5mm)
INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '5MM Steel X HIT™ Break-Off', 'HIT', 'hit', 0.204, 75, 2.50, 0, NULL, NULL, 1, 'hit');

-- 5MM Half-Out Inserts ($27.99 / 12 = $2.33/arrow)
INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '5MM Half-Out 25gr Aluminum', 'half-out', 'half-out', 0.204, 25, 2.33, 0, NULL, NULL, 1, 'half-out');

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '5MM Half-Out 75gr Steel', 'half-out', 'half-out', 0.204, 75, 2.33, 0, NULL, NULL, 1, 'half-out');

-- 5MM Steel Half-Outs ($24.99 / 12 = $2.08/arrow)
INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '5MM Steel Half-Out 50gr', 'half-out', 'half-out', 0.204, 50, 2.08, 0, NULL, NULL, 1, 'half-out');

-- 5MM Match Grade Half-Outs ($31.99 / 6 = $5.33 | $36.99 / 6 = $6.17)
INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '5MM Match Grade Half-Out 55gr', 'half-out', 'match-grade', 0.204, 55, 5.33, 0, NULL, NULL, 1, 'half-out');

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '5MM Match Grade Half-Out 75gr', 'half-out', 'match-grade', 0.204, 75, 6.17, 0, NULL, NULL, 1, 'half-out');

-- 4MM Aluminum Half-Out ($38.99 / 12 = $3.25/arrow)
-- shaft_id_in = 0.166 → diameterSchool "micro" (4mm)
INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '4MM Aluminum Half-Out 50gr', 'half-out', 'half-out', 0.166, 50, 3.25, 0, NULL, NULL, 1, 'half-out');

-- 4MM Steel Half-Out ($34.99 / 12 = $2.92/arrow)
INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '4MM Steel Half-Out 95gr', 'half-out', 'half-out', 0.166, 95, 2.92, 0, NULL, NULL, 1, 'half-out');

-- 4MM Titanium Half-Out ($50.99 / 6 = $8.50/arrow)
INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '4MM Titanium Half-Out 55gr', 'half-out', 'titanium', 0.166, 55, 8.50, 0, NULL, NULL, 1, 'half-out');

-- 4MM Match Grade Half-Outs (range $31.99–$57.99 / 6 — prices estimated per weight)
INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '4MM Match Grade Half-Out 55gr', 'half-out', 'match-grade', 0.166, 55, 5.33, 0, NULL, NULL, 1, 'half-out');

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '4MM Match Grade Half-Out 75gr', 'half-out', 'match-grade', 0.166, 75, 6.67, 0, NULL, NULL, 1, 'half-out');

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '4MM Match Grade Half-Out 100gr', 'half-out', 'match-grade', 0.166, 100, 8.33, 0, NULL, NULL, 1, 'half-out');

INSERT INTO inserts (brand, model, system, type, shaft_id_in, weight_grains, price_per_arrow, requires_collar, collar_weight_grains, collar_price_per_arrow, active, product_type)
VALUES ('Easton', '4MM Match Grade Half-Out 150gr', 'half-out', 'match-grade', 0.166, 150, 9.67, 0, NULL, NULL, 1, 'half-out');

-- ── POINTS ───────────────────────────────────────────────────────────────────

-- Multi Points ($8.99 / 12 = $0.75/arrow)
INSERT INTO points (brand, model, type, weight_grains, thread, price, active, category, product_type)
VALUES ('Easton', 'Multi Point 85gr', 'field', 85, '8-32', 0.75, 1, 'Field Point', 'field');

INSERT INTO points (brand, model, type, weight_grains, thread, price, active, category, product_type)
VALUES ('Easton', 'Multi Point 100gr', 'field', 100, '8-32', 0.75, 1, 'Field Point', 'field');

INSERT INTO points (brand, model, type, weight_grains, thread, price, active, category, product_type)
VALUES ('Easton', 'Multi Point 125gr', 'field', 125, '8-32', 0.75, 1, 'Field Point', 'field');

-- Deep Six Steel Field Points ($9.99 / 12 = $0.83/arrow)
INSERT INTO points (brand, model, type, weight_grains, thread, price, active, category, product_type)
VALUES ('Easton', 'Deep Six Field Point 100gr', 'field', 100, 'Deep Six', 0.83, 1, 'Field Point', 'field');

-- Match Grade Field Points ($13.99 / 6 = $2.33/arrow)
INSERT INTO points (brand, model, type, weight_grains, thread, price, active, category, product_type)
VALUES ('Easton', 'Match Grade Field Point 100gr', 'field', 100, '8-32', 2.33, 1, 'Field Point', 'field');

INSERT INTO points (brand, model, type, weight_grains, thread, price, active, category, product_type)
VALUES ('Easton', 'Match Grade Field Point 125gr', 'field', 125, '8-32', 2.33, 1, 'Field Point', 'field');

INSERT INTO points (brand, model, type, weight_grains, thread, price, active, category, product_type)
VALUES ('Easton', 'Match Grade Field Point 150gr', 'field', 150, '8-32', 2.33, 1, 'Field Point', 'field');
