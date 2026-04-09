-- Vane color assignments
-- Run: wrangler d1 execute dylaarchery --file=scripts/seed-vane-colors.sql --remote

-- ── Bohning Blazer (id 26) — full catalog ─────────────────────────────────────
UPDATE vanes SET colors = '["white","silver","black","blackout","neon red","red","neon orange","neon yellow","neon green","kiwi","teal","blue","satin blue","purple","hot pink","brown","white tiger","red tiger","orange tiger","yellow tiger","green tiger","teal tiger","pink tiger","purple tiger","american flag","don''t tread on me","american made","fred bear","realtree"]'
WHERE id = 26;

-- ── Bohning Blazer X2 (id 29) — same color family as Blazer ──────────────────
UPDATE vanes SET colors = '["white","silver","black","blackout","neon red","red","neon orange","neon yellow","neon green","kiwi","teal","blue","satin blue","purple","hot pink","brown","white tiger","red tiger","orange tiger","yellow tiger","green tiger","teal tiger","pink tiger","purple tiger","american flag"]'
WHERE id = 29;

-- ── Bohning Mini Blazer (id 33) — Blazer subset ───────────────────────────────
UPDATE vanes SET colors = '["white","black","neon red","red","neon orange","neon yellow","neon green","teal","blue","purple","hot pink","american flag"]'
WHERE id = 33;

-- ── Bohning X3 1.75" (id 36) ─────────────────────────────────────────────────
UPDATE vanes SET colors = '["white","silver","black","red","neon orange","neon yellow","teal","blue","satin blue","hot pink","purple","neon red","neon green","american flag"]'
WHERE id = 36;

-- ── Bohning X3 2.25" (id 44) — same colors as X3 ─────────────────────────────
UPDATE vanes SET colors = '["white","silver","black","red","neon orange","neon yellow","teal","blue","satin blue","hot pink","purple","neon red","neon green","american flag"]'
WHERE id = 44;

-- ── Bohning Alpha (id 40) ─────────────────────────────────────────────────────
UPDATE vanes SET colors = '["purple","orange","blue","red","navy","neon green","white","hot pink","gray","teal","black","yellow","american flag"]'
WHERE id = 40;

-- ── Bohning Atlas 2.8" (id 41) ───────────────────────────────────────────────
UPDATE vanes SET colors = '["white","black","navy","hot pink","neon green","orange","red","yellow","olive","purple","teal","silver","tan","american flag"]'
WHERE id = 41;

-- ── Bohning X 1.5" (id 34), X 1.75" (id 35), X 2.25" (id 43) ───────────────
UPDATE vanes SET colors = '["white","black","red","neon orange","neon yellow","neon green","teal","blue","purple","hot pink"]'
WHERE id IN (34, 35, 43);

-- ── Bohning X3.5 (id 37) ─────────────────────────────────────────────────────
UPDATE vanes SET colors = '["white","black","red","neon orange","neon yellow","neon green","teal","blue","purple","hot pink","american flag"]'
WHERE id = 37;

-- ── Bohning Bully (id 28), Bronco 3 (id 27), Bronco 4 (id 30) ───────────────
UPDATE vanes SET colors = '["white","black","red","neon orange","neon yellow","neon green","teal","blue","purple","hot pink"]'
WHERE id IN (27, 28, 30);

-- ── Bohning Griffin 1" (id 31), Griffin 2" (id 39) ───────────────────────────
UPDATE vanes SET colors = '["white","black","red","neon orange","neon yellow","neon green","teal","blue","purple","hot pink"]'
WHERE id IN (31, 39);

-- ── Bohning Heat (id 42), Air (id 45), Ice (id 46) ───────────────────────────
UPDATE vanes SET colors = '["white","black","red","neon orange","neon yellow","neon green","teal","blue","purple","hot pink"]'
WHERE id IN (42, 45, 46);

-- ── Bohning Impulse 3" (id 47), Impulse 4" (id 32), Zen (id 38) ─────────────
UPDATE vanes SET colors = '["white","black","red","neon orange","neon yellow","neon green","teal","blue","purple","hot pink"]'
WHERE id IN (32, 38, 47);
