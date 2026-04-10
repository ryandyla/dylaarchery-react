// Public endpoint — no auth required.
// Called from the builder when landing from an abandoned-cart email link.
// Returns the cart snapshot for the given coupon code so we can restore state.

export const onRequestGet = async ({ request, env }: any) => {
  const url = new URL(request.url);
  const coupon = url.searchParams.get("coupon")?.toUpperCase();

  if (!coupon) {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }

  try {
    const row = await env.DB.prepare(
      `SELECT ml.cart_snapshot
       FROM coupons c
       JOIN marketing_leads ml ON ml.id = c.lead_id
       WHERE c.code = ?
       LIMIT 1`
    )
      .bind(coupon)
      .first();

    if (!row?.cart_snapshot) {
      return new Response(JSON.stringify({ ok: false }), { status: 404 });
    }

    const cart = JSON.parse(row.cart_snapshot);
    return new Response(JSON.stringify({ ok: true, cart }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("marketing/cart error:", err);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
};
