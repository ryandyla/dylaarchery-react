// Public endpoint — no auth required.
// Called from the lead capture widget on first site visit.
// Upserts a marketing lead, generates a WELCOME10 coupon, and emails it.

import { sendWelcomeDiscount } from "../../_utils/email";

const DISCOUNT_AMOUNT = 10;

export const onRequestPost = async ({ request, env }: any) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return bad();
  }

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim() || null;
  if (!email || !email.includes("@")) return bad();

  const DB = env.DB;
  const now = new Date().toISOString();

  // Upsert lead
  const existing = await DB.prepare(
    `SELECT id FROM marketing_leads WHERE email = ? ORDER BY id DESC LIMIT 1`
  ).bind(email).first() as { id: number } | null;

  let leadId: number;
  if (existing) {
    leadId = existing.id;
    // If they already have a welcome coupon, just return it (no re-send)
    const prev = await DB.prepare(
      `SELECT code FROM coupons WHERE lead_id = ? AND code LIKE 'WELCOME%' ORDER BY id DESC LIMIT 1`
    ).bind(leadId).first() as { code: string } | null;
    if (prev) return json({ ok: true, code: prev.code });
  } else {
    const r = await DB.prepare(
      `INSERT INTO marketing_leads (email, name, created_at, updated_at) VALUES (?, ?, ?, ?)`
    ).bind(email, name, now, now).run();
    leadId = r.meta.last_row_id as number;
  }

  // Generate coupon
  const randomPart = crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 8);
  const code = `WELCOME10-${randomPart}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await DB.prepare(
    `INSERT INTO coupons (code, discount_amount, lead_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`
  ).bind(code, DISCOUNT_AMOUNT, leadId, now, expiresAt).run();

  await DB.prepare(
    `UPDATE marketing_leads SET coupon_sent = 1, name = COALESCE(?, name), updated_at = ? WHERE id = ?`
  ).bind(name, now, leadId).run();

  // Email the code — fire and forget so a Resend hiccup doesn't fail the widget
  const origin = new URL(request.url).origin;
  sendWelcomeDiscount(env, { to: email, name: name || "", code, discountAmount: DISCOUNT_AMOUNT, siteOrigin: origin })
    .catch((e: any) => console.error("Welcome discount email failed:", e));

  return json({ ok: true, code });
};

function json(data: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json" },
  });
}

function bad() {
  return new Response(JSON.stringify({ ok: false }), { status: 400 });
}
