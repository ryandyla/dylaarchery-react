// Stripe webhook handler — verifies signature and flips order draft → paid
// Required env vars: STRIPE_WEBHOOK_SECRET, RESEND_API_KEY
// Register this URL in your Stripe dashboard: https://yourdomain.com/api/webhooks/stripe
// Event to subscribe to: checkout.session.completed

import { sendOrderConfirmation, sendShopOrderConfirmation } from "../../_utils/email";

async function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  const parts = sigHeader.split(",");
  const ts = parts.find((p) => p.startsWith("t="))?.slice(2);
  const v1 = parts.find((p) => p.startsWith("v1="))?.slice(3);
  if (!ts || !v1) return false;

  const signedPayload = `${ts}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return computed === v1;
}

function buildLabelsFromRow(row: any) {
  return {
    shaft: [row.shaft_brand, row.shaft_model, row.shaft_spine].filter(Boolean).join(" "),
    cutMode: row.cut_length && row.cut_length > 0 ? "cut" : "uncut",
    cutLength: row.cut_length > 0 ? row.cut_length : null,
    wrap: row.wrap_name || "None",
    vane: row.vane_brand ? `${row.vane_brand} ${row.vane_model}` : "None",
    insert: row.insert_brand ? `${row.insert_brand} ${row.insert_model}` : "None",
    point: row.point_brand
      ? `${row.point_brand} ${row.point_model} ${row.point_weight}gr`
      : row.point_type
      ? `${row.point_type} ${row.point_weight}gr`
      : "None",
    nock: row.nock_brand ? `${row.nock_brand} ${row.nock_model}` : "None",
    quantity: row.quantity,
  };
}

export const onRequest = async ({ request, env }: any) => {
  if (request.method !== "POST") {
    return new Response("Not found", { status: 404 });
  }

  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set");
    return new Response("Configuration error", { status: 500 });
  }

  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature") || "";

  const valid = await verifyStripeSignature(rawBody, sig, webhookSecret);
  if (!valid) {
    console.warn("Stripe signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response("OK", { status: 200 });
  }

  const session = event.data?.object;
  const orderId = session?.metadata?.order_id ? Number(session.metadata.order_id) : null;
  if (!orderId) {
    console.warn("Stripe webhook: no order_id in session metadata");
    return new Response("OK", { status: 200 });
  }

  const DB = env.DB;

  // Flip order to paid
  const now = new Date().toISOString();
  await DB.prepare(
    `UPDATE orders SET status = 'paid', paid_at = ?, stripe_session_id = ? WHERE id = ? AND status = 'draft'`
  )
    .bind(now, session.id ?? null, orderId)
    .run();

  // Record status change
  await DB.prepare(
    `INSERT INTO order_status_history (order_id, status, changed_at, changed_by) VALUES (?, 'paid', ?, 'stripe')`
  )
    .bind(orderId, now)
    .run();

  // Mark coupon used if one was applied
  const order = await DB.prepare(`SELECT coupon_code, customer_id, total FROM orders WHERE id = ?`)
    .bind(orderId)
    .first();

  if (order?.coupon_code) {
    await DB.prepare(`UPDATE coupons SET used = 1, order_id = ? WHERE code = ?`)
      .bind(orderId, order.coupon_code)
      .run();
  }

  // Mark any matching marketing lead as converted
  const customer = order?.customer_id
    ? await DB.prepare(`SELECT email, name FROM customers WHERE id = ?`).bind(order.customer_id).first()
    : null;

  if (customer?.email) {
    await DB.prepare(
      `UPDATE marketing_leads SET converted = 1, updated_at = ? WHERE email = ? AND converted = 0`
    )
      .bind(now, customer.email)
      .run();
  }

  // Send confirmation email
  try {
    const orderType = session?.metadata?.order_type;

    if (orderType === "shop") {
      // Shop order — use shop_items JSON
      const shopRow = await DB.prepare(
        `SELECT o.total, o.shop_items, c.email as customer_email, c.name as customer_name
         FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`
      ).bind(orderId).first();

      if (shopRow?.customer_email && shopRow?.shop_items) {
        const items = JSON.parse(shopRow.shop_items);
        await sendShopOrderConfirmation(env, {
          to: shopRow.customer_email,
          name: shopRow.customer_name || "",
          orderId,
          items,
          total: shopRow.total,
        });
      }
    } else {
      // Custom arrow build order
      const row = await DB.prepare(`
        SELECT
          o.total,
          c.email as customer_email, c.name as customer_name,
          ab.cut_length, ab.quantity,
          s.brand as shaft_brand, s.model as shaft_model, s.spine as shaft_spine,
          w.name as wrap_name,
          v.brand as vane_brand, v.model as vane_model,
          i.brand as insert_brand, i.model as insert_model,
          p.brand as point_brand, p.model as point_model, p.weight_grains as point_weight, p.type as point_type,
          n.brand as nock_brand, n.model as nock_model
        FROM orders o
        JOIN customers c ON c.id = o.customer_id
        LEFT JOIN arrow_builds ab ON ab.order_id = o.id
        LEFT JOIN shafts s ON s.id = ab.shaft_id
        LEFT JOIN wraps w ON w.id = ab.wrap_id
        LEFT JOIN vanes v ON v.id = ab.vane_id
        LEFT JOIN inserts i ON i.id = ab.insert_id
        LEFT JOIN points p ON p.id = ab.point_id
        LEFT JOIN nocks n ON n.id = ab.nock_id
        WHERE o.id = ?
      `).bind(orderId).first();

      if (row?.customer_email) {
        await sendOrderConfirmation(env, {
          to: row.customer_email,
          name: row.customer_name || "",
          orderId,
          build: buildLabelsFromRow(row),
          total: row.total,
        });
      }
    }
  } catch (emailErr) {
    console.error("Failed to send order confirmation email:", emailErr);
    // Don't fail the webhook — email failure shouldn't un-pay the order
  }

  return new Response("OK", { status: 200 });
};
