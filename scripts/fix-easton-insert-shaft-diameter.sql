-- Set shaft_id_in for Easton inserts so they filter correctly in the builder.
-- diameterSchool: <=0.175 = micro (4mm), 0.175-0.215 = small (5mm)

UPDATE inserts SET shaft_id_in = 0.204 WHERE brand = 'Easton' AND model LIKE '5MM%';
UPDATE inserts SET shaft_id_in = 0.166 WHERE brand = 'Easton' AND model LIKE '4MM%';
