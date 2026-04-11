-- Migration: add shop_items JSON column to orders for component pack purchases
-- Run: wrangler d1 execute dylaarchery --remote --file=scripts/migrate-shop.sql

ALTER TABLE orders ADD COLUMN shop_items TEXT; -- JSON: [{type,id,name,pack_qty,qty,unit_price,pack_price}]
