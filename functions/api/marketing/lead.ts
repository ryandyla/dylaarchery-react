// Public endpoint — no auth required.
// Called from the builder when the user enters their email + has a valid build.
// Upserts a marketing_leads row so we can follow up on abandoned carts.

export const onRequest = async ({ request, env }: any) => {
  if (request.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST,OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  if (request.method !== "POST") return new Response("Not found", { status: 404 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }

  const email = String(body.email || "").trim().toLowerCase();
  const name = String(body.name || "").trim() || null;
  const cartSnapshot = body.cart ? JSON.stringify(body.cart) : null;

  if (!email || !email.includes("@")) {
    return new Response(JSON.stringify({ ok: false }), { status: 400 });
  }

  const DB = env.DB;
  const now = new Date().toISOString();

  try {
    const existing = await DB.prepare(
      `SELECT id, converted FROM marketing_leads WHERE email = ? ORDER BY id DESC LIMIT 1`
    )
      .bind(email)
      .first();

    if (existing) {
      // Don't overwrite a converted lead's snapshot — just update timestamp
      if (!existing.converted && cartSnapshot) {
        await DB.prepare(
          `UPDATE marketing_leads SET name = COALESCE(?, name), cart_snapshot = ?, updated_at = ? WHERE id = ?`
        )
          .bind(name, cartSnapshot, now, existing.id)
          .run();
      }
    } else {
      await DB.prepare(
        `INSERT INTO marketing_leads (email, name, cart_snapshot, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`
      )
        .bind(email, name, cartSnapshot, now, now)
        .run();
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (err: any) {
    console.error("marketing/lead error:", err);
    return new Response(JSON.stringify({ ok: false }), { status: 500 });
  }
};
