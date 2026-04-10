// GET    /api/member/bows          — list member's bows
// POST   /api/member/bows          — add a bow
// PATCH  /api/member/bows/:id      — update a bow
// DELETE /api/member/bows/:id      — delete a bow

import { getMember, json, unauthorized } from "../../_utils/member-auth";

const BOW_FIELDS = ["nickname", "brand", "model", "bow_type", "ibo_speed", "draw_length", "draw_weight"] as const;

export const onRequest = async ({ request, env }: any) => {
  const auth = await getMember(request, env);
  if (!auth) return unauthorized();

  const url = new URL(request.url);
  // /api/member/bows or /api/member/bows/123
  const pathParts = url.pathname.replace(/^\/api\/member\/bows\/?/, "").split("/").filter(Boolean);
  const bowId = pathParts[0] ? parseInt(pathParts[0]) : null;

  const DB = env.DB;
  const now = new Date().toISOString();

  // ── GET /api/member/bows ─────────────────────────────────────────────────
  if (request.method === "GET" && !bowId) {
    const rows = await DB.prepare(
      `SELECT id, nickname, brand, model, bow_type, ibo_speed, draw_length, draw_weight, created_at
       FROM bows WHERE member_id = ? ORDER BY id ASC`
    ).bind(auth.member.id).all();
    return json({ ok: true, bows: rows.results });
  }

  // ── POST /api/member/bows ────────────────────────────────────────────────
  if (request.method === "POST" && !bowId) {
    let body: any;
    try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

    const r = await DB.prepare(
      `INSERT INTO bows (member_id, nickname, brand, model, bow_type, ibo_speed, draw_length, draw_weight, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      auth.member.id,
      body.nickname?.trim() || null,
      body.brand?.trim() || null,
      body.model?.trim() || null,
      body.bow_type?.trim() || null,
      body.ibo_speed ? Number(body.ibo_speed) : null,
      body.draw_length ? Number(body.draw_length) : null,
      body.draw_weight ? Number(body.draw_weight) : null,
      now, now
    ).run();

    return json({ ok: true, id: r.meta.last_row_id });
  }

  // ── PATCH /api/member/bows/:id ───────────────────────────────────────────
  if (request.method === "PATCH" && bowId) {
    // Verify ownership
    const existing = await DB.prepare(
      `SELECT id FROM bows WHERE id = ? AND member_id = ?`
    ).bind(bowId, auth.member.id).first();
    if (!existing) return json({ ok: false, error: "Not found" }, { status: 404 });

    let body: any;
    try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

    const updates: string[] = [];
    const args: any[] = [];

    for (const field of BOW_FIELDS) {
      if (field in body) {
        updates.push(`${field} = ?`);
        const v = body[field];
        if (field === "ibo_speed" || field === "draw_length" || field === "draw_weight") {
          args.push(v !== null && v !== "" ? Number(v) : null);
        } else {
          args.push(typeof v === "string" ? v.trim() || null : null);
        }
      }
    }

    if (updates.length) {
      updates.push("updated_at = ?");
      args.push(now, bowId);
      await DB.prepare(`UPDATE bows SET ${updates.join(", ")} WHERE id = ?`).bind(...args).run();
    }

    return json({ ok: true });
  }

  // ── DELETE /api/member/bows/:id ──────────────────────────────────────────
  if (request.method === "DELETE" && bowId) {
    const existing = await DB.prepare(
      `SELECT id FROM bows WHERE id = ? AND member_id = ?`
    ).bind(bowId, auth.member.id).first();
    if (!existing) return json({ ok: false, error: "Not found" }, { status: 404 });

    await DB.prepare(`DELETE FROM bows WHERE id = ?`).bind(bowId).run();
    return json({ ok: true });
  }

  return json({ ok: false, error: "Not found" }, { status: 404 });
};
