// GET /api/member/orders — returns orders linked to this member

import { getMember, json, unauthorized } from "../../_utils/member-auth";

export const onRequestGet = async ({ request, env }: any) => {
  const auth = await getMember(request, env);
  if (!auth) return unauthorized();

  const rows = await env.DB.prepare(
    `SELECT o.id, o.status, o.subtotal, o.total, o.discount_amount, o.coupon_code,
            o.shipping_carrier, o.tracking_number, o.shipped_at, o.paid_at, o.created_at
     FROM orders o
     WHERE o.member_id = ?
     ORDER BY o.id DESC`
  ).bind(auth.member.id).all();

  return json({ ok: true, orders: rows.results });
};
