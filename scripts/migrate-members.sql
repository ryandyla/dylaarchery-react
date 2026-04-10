-- Migration: member accounts, magic-link auth, bows, specials
-- Run with: wrangler d1 execute dylaarchery --file=scripts/migrate-members.sql --remote

-- ── Members ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS members (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT    NOT NULL UNIQUE,
  name         TEXT,
  interests    TEXT,   -- JSON array: ["hunting","target","3d","tac"]
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Magic links (single-use login tokens) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS magic_links (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token       TEXT    NOT NULL UNIQUE,
  expires_at  TEXT    NOT NULL,
  used_at     TEXT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Sessions (set as HTTP-only cookie) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS member_sessions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  token       TEXT    NOT NULL UNIQUE,
  expires_at  TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── Bows ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bows (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id    INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  nickname     TEXT,           -- e.g. "Hunting Rig", "Target Setup"
  brand        TEXT,
  model        TEXT,
  bow_type     TEXT,           -- compound | recurve | traditional | crossbow
  ibo_speed    INTEGER,        -- fps (IBO rating on the box)
  draw_length  REAL,           -- inches
  draw_weight  REAL,           -- lbs
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Specials (admin-managed promotions) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS specials (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,  -- "Spring Sale", "Member Appreciation"
  description  TEXT,
  type         TEXT    NOT NULL,  -- percent_off | fixed_off | free_shipping
  value        REAL,              -- percent (10 = 10%) or dollar amount; NULL for free_shipping
  active       INTEGER NOT NULL DEFAULT 0,
  member_only  INTEGER NOT NULL DEFAULT 1,
  max_uses     INTEGER,           -- NULL = unlimited
  use_count    INTEGER NOT NULL DEFAULT 0,
  starts_at    TEXT,
  ends_at      TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Link orders to members going forward ────────────────────────────────────
ALTER TABLE orders ADD COLUMN member_id INTEGER REFERENCES members(id);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_members_email        ON members(email);
CREATE INDEX IF NOT EXISTS idx_magic_links_token    ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_member_sessions_token ON member_sessions(token);
CREATE INDEX IF NOT EXISTS idx_bows_member          ON bows(member_id);
CREATE INDEX IF NOT EXISTS idx_orders_member        ON orders(member_id);
