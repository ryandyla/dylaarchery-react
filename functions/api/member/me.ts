// GET  /api/member/me  — returns member profile + bows
// PATCH /api/member/me  — update name and/or interests

import { getMember, json, unauthorized } from "../../_utils/member-auth";

export const onRequest = async ({ request, env }: any) => {
  const auth = await getMember(request, env);
  if (!auth) return unauthorized();

  if (request.method === "GET") {
    const bows = await env.DB.prepare(
      `SELECT id, nickname, brand, model, bow_type, ibo_speed, draw_length, draw_weight, created_at
       FROM bows WHERE member_id = ? ORDER BY id ASC`
    ).bind(auth.member.id).all();

    return json({
      ok: true,
      member: {
        id: auth.member.id,
        email: auth.member.email,
        name: auth.member.name,
        interests: auth.member.interests ? JSON.parse(auth.member.interests) : [],
      },
      bows: bows.results,
    });
  }

  if (request.method === "PATCH") {
    let body: any;
    try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

    const updates: string[] = [];
    const args: any[] = [];

    if (typeof body.name === "string") { updates.push("name = ?"); args.push(body.name.trim() || null); }
    if (Array.isArray(body.interests)) { updates.push("interests = ?"); args.push(JSON.stringify(body.interests)); }

    if (updates.length) {
      updates.push("updated_at = ?");
      args.push(new Date().toISOString(), auth.member.id);
      await env.DB.prepare(
        `UPDATE members SET ${updates.join(", ")} WHERE id = ?`
      ).bind(...args).run();
    }

    return json({ ok: true });
  }

  return json({ ok: false, error: "Method not allowed" }, { status: 405 });
};
