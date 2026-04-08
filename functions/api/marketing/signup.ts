// Public endpoint — mailing list signup from the site footer.
// Saves to marketing_leads and sends a welcome email.
import { sendWelcomeEmail } from "../../_utils/email";

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
  try { body = await request.json(); } catch {
    return json({ ok: false, message: "Invalid request." }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  const name  = String(body.name  || "").trim() || null;

  if (!email || !email.includes("@") || !email.includes(".")) {
    return json({ ok: false, message: "Please enter a valid email address." }, 400);
  }

  const DB  = env.DB;
  const now = new Date().toISOString();

  try {
    const existing = await DB.prepare(
      `SELECT id FROM marketing_leads WHERE email = ? LIMIT 1`
    ).bind(email).first();

    if (existing) {
      // Already on the list — don't re-send welcome email, just silently succeed
      if (name) {
        await DB.prepare(
          `UPDATE marketing_leads SET name = COALESCE(?, name), updated_at = ? WHERE id = ?`
        ).bind(name, now, existing.id).run();
      }
      return json({ ok: true, already: true }, 200);
    }

    await DB.prepare(
      `INSERT INTO marketing_leads (email, name, created_at, updated_at) VALUES (?, ?, ?, ?)`
    ).bind(email, name, now, now).run();

    // Send welcome email — don't fail the signup if email errors
    try {
      await sendWelcomeEmail(env, { to: email, name: name || "" });
    } catch (emailErr) {
      console.error("Welcome email failed:", emailErr);
    }

    return json({ ok: true, already: false }, 200);
  } catch (err: any) {
    console.error("signup error:", err);
    return json({ ok: false, message: "Something went wrong. Please try again." }, 500);
  }
};

function json(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
