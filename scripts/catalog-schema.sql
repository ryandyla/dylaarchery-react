-- Dyla Archery product catalog schema
-- Run: wrangler d1 execute dylaarchery --file=scripts/catalog-schema.sql

PRAGMA foreign_keys = OFF;

DROP TABLE IF EXISTS inserts;
DROP TABLE IF EXISTS points;
DROP TABLE IF EXISTS nocks;
DROP TABLE IF EXISTS vanes;
DROP TABLE IF EXISTS shafts;

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS shafts (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  brand            TEXT    NOT NULL,
  model            TEXT    NOT NULL,
  spine            INTEGER NOT NULL,
  id_in            REAL,
  od_in            REAL,
  gpi              REAL,
  wall_thickness   REAL,
  wall_area        REAL,
  circumference_in REAL,
  wrap_width_in    REAL,
  wrap_width_16th  INTEGER
);

CREATE TABLE IF NOT EXISTS vanes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  brand      TEXT NOT NULL,
  model      TEXT NOT NULL,
  length_in  REAL,
  height_in  REAL,
  weight_gr  REAL,
  stiffness  TEXT
);

CREATE TABLE IF NOT EXISTS nocks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  brand       TEXT NOT NULL,
  model       TEXT NOT NULL,
  nock_type   TEXT NOT NULL,  -- press_fit | pin | glue_on | traditional | press_fit_large | unknown
  shaft_id_in REAL,
  weight_gr   REAL
);

CREATE TABLE IF NOT EXISTS points (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category      TEXT NOT NULL,  -- Field Point | Broadhead
  product_type  TEXT NOT NULL,  -- Screw-in | Glue-on | Fixed | Mechanical
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  weight_gr     REAL,           -- NULL when weight is a range
  weight_gr_min REAL,           -- NULL when weight is a fixed value
  weight_gr_max REAL,           -- NULL when range is open-ended or weight is fixed
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS inserts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  category      TEXT NOT NULL DEFAULT 'Insert',
  product_type  TEXT NOT NULL,  -- HIT | Half-out | Internal | Outsert
  brand         TEXT NOT NULL,
  model         TEXT NOT NULL,
  weight_gr     REAL,
  weight_gr_min REAL,
  weight_gr_max REAL,
  material      TEXT,
  notes         TEXT
);
