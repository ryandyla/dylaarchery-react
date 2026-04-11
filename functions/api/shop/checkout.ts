// POST /api/shop/checkout — creates a draft order + Stripe checkout session for component pack purchases

import { createDraftOrder, json, readJson, round2, upsertCustomer } from "../../_utils/db";

type CartItem = {
  type: string;
  id: number;
  name: string;
  pack_qty: number;
  qty: number;        // number of packs
  unit_price: number; // price per individual item
  pack_price: number; // unit_price × pack_qty
};

async function createStripeSession({
  secretKey,
  origin,
  orderId,
  customerEmail,
  items,
}: {
  secretKey: string;
  origin: string;
  orderId: number;
  customerEmail: string;
  items: CartItem[];
}) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("customer_email", customerEmail);

  items.forEach((item, i) => {
    const label = `${item.name} — Pack of ${item.pack_qty}`;
    params.set(`line_items[${i}][price_data][currency]`, "usd");
    params.set(`line_items[${i}][price_data][product_data][name]`, label);
    params.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(item.pack_price * 100)));
    params.set(`line_items[${i}][quantity]`, String(item.qty));
  });

  params.set("success_url", `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}&type=shop`);
  params.set("cancel_url", `${origin}/shop`);
  params.set("metadata[order_id]", String(orderId));
  params.set("metadata[order_type]", "shop");

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err: any = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Stripe error ${res.status}`);
  }

  return res.json() as Promise<{ url: string; id: string }>;
}

export const onRequestPost = async ({ request, env }: any) => {
  try {
    const DB = env.DB;
    if (!DB) return json({ ok: false, error: "DB not configured" }, 500);

    const body = await readJson(request);
    if (!body) return json({ ok: false, error: "Invalid JSON" }, 400);

    const email = String(body.email ?? "").trim().toLowerCase();
    const name = String(body.name ?? "").trim();
    const couponCode = String(body.coupon_code ?? "").trim().toUpperCase() || null;
    const items: CartItem[] = Array.isArray(body.items) ? body.items : [];

    if (!email) return json({ ok: false, error: "Email is required" }, 400);
    if (!items.length) return json({ ok: false, error: "Cart is empty" }, 400);

    // Validate and total cart
    for (const item of items) {
      if (!item.name || !item.pack_price || !item.qty || item.qty < 1) {
        return json({ ok: false, error: "Invalid cart item" }, 400);
      }
    }

    const subtotal = round2(items.reduce((sum, item) => sum + item.pack_price * item.qty, 0));

    // Validate coupon
    let discountAmount = 0;
    let validatedCoupon: string | null = null;
    if (couponCode) {
      const coupon = await DB.prepare(
        `SELECT discount_amount, used, expires_at FROM coupons WHERE code = ?`
      ).bind(couponCode).first() as any;

      if (coupon && !coupon.used) {
        const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
        if (!expired) {
          discountAmount = Number(coupon.discount_amount) ?? 0;
          validatedCoupon = couponCode;
        }
      }
    }

    const discountedTotal = round2(Math.max(0, subtotal - discountAmount));

    // Write to DB
    const customer = await upsertCustomer(DB, { email, name });
    if (!customer) return json({ ok: false, error: "Invalid email" }, 400);

    const order = await createDraftOrder(DB, {
      customer_id: customer.id,
      subtotal,
      discountAmount,
      couponCode: validatedCoupon,
    });

    // Store shop items on the order
    await DB.prepare(`UPDATE orders SET shop_items = ? WHERE id = ?`)
      .bind(JSON.stringify(items), order.id)
      .run();

    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) return json({ ok: false, error: "Payment not configured" }, 500);

    const origin = new URL(request.url).origin;
    const session = await createStripeSession({
      secretKey: stripeKey,
      origin,
      orderId: order.id,
      customerEmail: email,
      items: items.map((item) => ({
        ...item,
        // Apply discount proportionally across items
        pack_price: discountAmount > 0
          ? round2(item.pack_price * (discountedTotal / subtotal))
          : item.pack_price,
      })),
    });

    // Store Stripe session ID
    await DB.prepare(`UPDATE orders SET stripe_session_id = ? WHERE id = ?`)
      .bind(session.id, order.id)
      .run();

    return json({ ok: true, order_id: order.id, checkout_url: session.url });
  } catch (e: any) {
    return json({ ok: false, error: e?.message ?? "Unhandled error" }, 500);
  }
};
