import {
  badRequest,
  calculatePrice,
  corsHeaders,
  createArrowBuild,
  createDraftOrder,
  getInsert,
  getNock,
  getPoint,
  getShaft,
  getVane,
  getWrap,
  json,
  readJson,
  serverError,
  upsertCustomer,
  validateBuild,
} from "../../_utils/db";

async function createStripeCheckoutSession({
  secretKey,
  origin,
  orderId,
  customerEmail,
  amountCents,
  quantity,
  shaftLabel,
}: {
  secretKey: string;
  origin: string;
  orderId: number;
  customerEmail: string;
  amountCents: number;
  quantity: number;
  shaftLabel: string;
}) {
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("customer_email", customerEmail);
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][product_data][name]", `Custom Arrow Build — Set of ${quantity}`);
  params.set("line_items[0][price_data][product_data][description]", shaftLabel);
  params.set("line_items[0][price_data][unit_amount]", String(amountCents));
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", `${origin}/order/success?session_id={CHECKOUT_SESSION_ID}&order_id=${orderId}`);
  params.set("cancel_url", `${origin}/builder`);
  params.set("metadata[order_id]", String(orderId));

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

export const onRequest = async ({ request, env }: any) => {
  try {
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
    if (request.method !== "POST") return new Response("Not found", { status: 404 });

    const DB = env.DB;
    if (!DB) return serverError("Missing D1 binding: env.DB");

    const body = await readJson(request);
    if (!body) return badRequest("Invalid JSON.", "body");

    const customer = body.customer || {};
    const build = body.build || {};

    const email = String(customer.email || "").trim();
    const name = String(customer.name || "").trim();
    const couponCode = String(body.coupon_code || "").trim().toUpperCase() || null;

    if (!email) return badRequest("Email is required.", "customer.email");

    const shaft_id = Number(build.shaft_id);
    const wrap_id = build.wrap_id == null ? null : Number(build.wrap_id);
    const vane_id = build.vane_id == null ? null : Number(build.vane_id);
    const insert_id = build.insert_id == null ? null : Number(build.insert_id);
    const point_id = build.point_id == null ? null : Number(build.point_id);
    const nock_id = build.nock_id == null ? null : Number(build.nock_id);

    const vane_color = build.vane_color ? String(build.vane_color).trim() : null;
    const nock_color = build.nock_color ? String(build.nock_color).trim() : null;

    const cut_mode: "uncut" | "cut" = build.cut_mode === "cut" ? "cut" : "uncut";
    const cut_length = cut_mode === "cut" && build.cut_length != null ? Number(build.cut_length) : null;

    const quantity = Number(build.quantity);
    const fletch_count = build.fletch_count == null ? 3 : Number(build.fletch_count);

    if (!Number.isInteger(shaft_id)) return badRequest("shaft_id must be an integer.", "build.shaft_id");
    if (wrap_id != null && !Number.isInteger(wrap_id)) return badRequest("wrap_id must be an integer.", "build.wrap_id");
    if (vane_id != null && !Number.isInteger(vane_id)) return badRequest("vane_id must be an integer.", "build.vane_id");
    if (insert_id != null && !Number.isInteger(insert_id)) return badRequest("insert_id must be an integer.", "build.insert_id");
    if (point_id != null && !Number.isInteger(point_id)) return badRequest("point_id must be an integer.", "build.point_id");
    if (nock_id != null && !Number.isInteger(nock_id)) return badRequest("nock_id must be an integer.", "build.nock_id");

    // Fetch referenced items
    const [shaft, wrap, vane, insert, point, nock] = await Promise.all([
      getShaft(DB, shaft_id),
      wrap_id != null ? getWrap(DB, wrap_id) : Promise.resolve(null),
      vane_id != null ? getVane(DB, vane_id) : Promise.resolve(null),
      insert_id != null ? getInsert(DB, insert_id) : Promise.resolve(null),
      point_id != null ? getPoint(DB, point_id) : Promise.resolve(null),
      nock_id != null ? getNock(DB, nock_id) : Promise.resolve(null),
    ]);

    if (!shaft) return badRequest("Selected shaft not found.", "build.shaft_id");
    if (wrap_id != null && !wrap) return badRequest("Selected wrap not found.", "build.wrap_id");
    if (vane_id != null && !vane) return badRequest("Selected vane not found.", "build.vane_id");
    if (insert_id != null && !insert) return badRequest("Selected insert not found.", "build.insert_id");
    if (point_id != null && !point) return badRequest("Selected point not found.", "build.point_id");
    if (nock_id != null && !nock) return badRequest("Selected nock not found.", "build.nock_id");

    // Validate (your db.ts validateBuild now supports insert/nock + nullable cut_length if you updated it)
    const v = validateBuild({ shaft, wrap, vane, insert, point, nock, cut_mode, cut_length, quantity, fletch_count });
    if (!v.ok) return json(v, 400, cors);

    // Price snapshot
    const price = calculatePrice({ shaft, wrap, vane, insert, point, nock, fletch_count, quantity });

    // Validate coupon if provided
    let discountAmount = 0;
    let validatedCouponCode: string | null = null;
    if (couponCode) {
      const coupon = await DB.prepare(
        `SELECT discount_amount, used, expires_at FROM coupons WHERE code = ?`
      ).bind(couponCode).first() as any;

      if (coupon && !coupon.used) {
        const expired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
        if (!expired) {
          discountAmount = Number(coupon.discount_amount) || 0;
          validatedCouponCode = couponCode;
        }
      }
    }

    const discountedSubtotal = Math.max(0, price.subtotal - discountAmount);

    // Write order data
    const cust = await upsertCustomer(DB, { email, name });
    if (!cust) return badRequest("Invalid email.", "customer.email");

    const order = await createDraftOrder(DB, {
      customer_id: cust.id,
      subtotal: price.subtotal,
      discountAmount,
      couponCode: validatedCouponCode,
    });

    const buildRow = await createArrowBuild(DB, {
      order_id: order.id,
      shaft_id,
      wrap_id,
      vane_id,
      vane_color,
      insert_id,
      point_id,
      nock_id,
      nock_color,
      cut_length: cut_length ?? 0,
      quantity,
      fletch_count,
      price_per_arrow: price.per_arrow,
    });

    // Create Stripe Checkout Session
    const stripeKey = env.STRIPE_SECRET_KEY;
    if (!stripeKey) return serverError("Payment system not configured.");

    const origin = new URL(request.url).origin;
    const shaftLabel = `${(shaft as any).brand} ${(shaft as any).model} ${(shaft as any).spine} spine`;
    const session = await createStripeCheckoutSession({
      secretKey: stripeKey,
      origin,
      orderId: order.id,
      customerEmail: email,
      amountCents: Math.round(discountedSubtotal * 100),
      quantity,
      shaftLabel,
    });

    return json(
      {
        ok: true,
        order_id: order.id,
        build_id: buildRow.id,
        status: order.status,
        price,
        checkout_url: session.url,
      },
      200,
      cors
    );
  } catch (e: any) {
    return serverError(e?.message || "Unhandled error");
  }
};
