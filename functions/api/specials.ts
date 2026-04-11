// GET /api/specials — returns currently active, non-member-only specials (public)

export const onRequestGet = async ({ env }: any) => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const rows = await env.DB.prepare(
    `SELECT id, name, description, type, value
     FROM specials
     WHERE active = 1
       AND (member_only = 0)
       AND (starts_at IS NULL OR starts_at <= ?)
       AND (ends_at   IS NULL OR ends_at   >= ?)
       AND (max_uses  IS NULL OR use_count < max_uses)
     ORDER BY id DESC`
  ).bind(today, today).all();

  return new Response(JSON.stringify({ ok: true, specials: rows.results }), {
    headers: { "content-type": "application/json" },
  });
};
