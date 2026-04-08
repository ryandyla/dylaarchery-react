// Public endpoint — validates a coupon code before checkout.
// GET /api/builder/coupon?code=SAVE10-XXXXXXXX
// Returns { ok: true, discount_amount: 10 } or { ok: false, message: "..." }

export const onRequest = async ({ request, env }: any) => {
  if (request.method !== "GET") return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim().toUpperCase();

  if (!code) {
    return json({ ok: false, message: "No coupon code provided." }, 400);
  }

  const DB = env.DB;
  const row = await DB.prepare(
    `SELECT id, discount_amount, used, expires_at FROM coupons WHERE code = ?`
  )
    .bind(code)
    .first();

  if (!row) return json({ ok: false, message: "Invalid coupon code." }, 200);
  if (row.used) return json({ ok: false, message: "This coupon has already been used." }, 200);

  if (row.expires_at) {
    const expired = new Date(row.expires_at) < new Date();
    if (expired) return json({ ok: false, message: "This coupon has expired." }, 200);
  }

  return json({ ok: true, discount_amount: row.discount_amount }, 200);
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
