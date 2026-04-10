// POST /api/member/auth/request
// Takes an email, upserts the member, sends a magic link.

import { sendMagicLink } from "../../../_utils/email";
import { json } from "../../../_utils/member-auth";

const LINK_EXPIRY_MINUTES = 15;

export const onRequestPost = async ({ request, env }: any) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, error: "Invalid request" }, { status: 400 }); }

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim() || null;
  if (!email || !email.includes("@")) {
    return json({ ok: false, error: "Valid email required" }, { status: 400 });
  }

  const DB = env.DB;
  const now = new Date().toISOString();

  // Upsert member
  const existing = await DB.prepare(
    `SELECT id, name FROM members WHERE email = ? LIMIT 1`
  ).bind(email).first() as { id: number; name: string | null } | null;

  let memberId: number;
  if (existing) {
    memberId = existing.id;
    if (name && !existing.name) {
      await DB.prepare(`UPDATE members SET name = ?, updated_at = ? WHERE id = ?`)
        .bind(name, now, memberId).run();
    }
  } else {
    const r = await DB.prepare(
      `INSERT INTO members (email, name, created_at, updated_at) VALUES (?, ?, ?, ?)`
    ).bind(email, name, now, now).run();
    memberId = r.meta.last_row_id as number;
  }

  // Invalidate any unused existing links for this member
  await DB.prepare(
    `DELETE FROM magic_links WHERE member_id = ? AND used_at IS NULL`
  ).bind(memberId).run();

  // Generate token
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date(Date.now() + LINK_EXPIRY_MINUTES * 60 * 1000).toISOString();

  await DB.prepare(
    `INSERT INTO magic_links (member_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)`
  ).bind(memberId, token, expiresAt, now).run();

  // Build login URL
  const origin = new URL(request.url).origin;
  const loginUrl = `${origin}/api/member/auth/verify?token=${encodeURIComponent(token)}`;

  try {
    const memberName = name || (existing?.name ?? null);
    await sendMagicLink(env, { to: email, name: memberName, loginUrl });
  } catch (e: any) {
    console.error("Magic link email failed:", e);
    return json({ ok: false, error: "Failed to send email. Please try again." }, { status: 500 });
  }

  return json({ ok: true });
};
