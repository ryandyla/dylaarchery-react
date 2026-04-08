-- Migration: orders management + marketing leads
-- Run with: wrangler d1 execute dylaarchery --file=scripts/migrate-orders-marketing.sql --remote

-- Extend orders table with fulfillment + payment fields
ALTER TABLE orders ADD COLUMN shipping_carrier TEXT;
ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN shipped_at TEXT;
ALTER TABLE orders ADD COLUMN paid_at TEXT;
ALTER TABLE orders ADD COLUMN notes TEXT;
ALTER TABLE orders ADD COLUMN discount_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN coupon_code TEXT;
ALTER TABLE orders ADD COLUMN stripe_session_id TEXT;

-- Log every status change on an order
CREATE TABLE IF NOT EXISTS order_status_history (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id     INTEGER NOT NULL REFERENCES orders(id),
  status       TEXT NOT NULL,
  changed_at   TEXT NOT NULL DEFAULT (datetime('now')),
  changed_by   TEXT NOT NULL DEFAULT 'system'
);

-- Admin-to-customer messages per order (one-way; admin sends, customer receives via email)
CREATE TABLE IF NOT EXISTS order_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id   INTEGER NOT NULL REFERENCES orders(id),
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  sent_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Marketing leads: visitors who entered their email + built something but didn't complete checkout
CREATE TABLE IF NOT EXISTS marketing_leads (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL,
  name          TEXT,
  cart_snapshot TEXT,    -- JSON: { shaft, wrap, vane, quantity, ... }
  coupon_sent   INTEGER NOT NULL DEFAULT 0,
  converted     INTEGER NOT NULL DEFAULT 0,  -- 1 once they place an order
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Single-use coupon codes generated for abandoned cart campaigns
CREATE TABLE IF NOT EXISTS coupons (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  code            TEXT NOT NULL UNIQUE,
  discount_amount REAL NOT NULL DEFAULT 10,
  lead_id         INTEGER REFERENCES marketing_leads(id),
  order_id        INTEGER REFERENCES orders(id),   -- set when redeemed
  used            INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at      TEXT  -- ISO datetime; NULL = no expiry
);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_email ON marketing_leads(email);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_order_messages_order ON order_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON order_status_history(order_id);
