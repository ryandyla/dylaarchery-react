import { badRequest, corsHeaders, json, readJson, serverError } from "../_utils/db";

export const onRequest = async ({ request, env }: any) => {
  try {
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
    if (request.method !== "POST") return new Response("Not found", { status: 404 });

    const DB = env.DB;
    if (!DB) return serverError("Missing D1 binding: env.DB");

    const body = await readJson(request);
    if (!body) return badRequest("Invalid JSON.", "body");

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const message = String(body.message || "").trim();

    if (!name) return badRequest("Name is required.", "name");
    if (!email || !email.includes("@")) return badRequest("Valid email is required.", "email");
    if (!message || message.length < 10) return badRequest("Message is too short.", "message");
    if (message.length > 5000) return badRequest("Message is too long.", "message");

    const res = await DB.prepare(
      `INSERT INTO contact_messages (name, email, message) VALUES (?1, ?2, ?3)`
    ).bind(name, email, message).run();

    return json({ ok: true, id: res.meta.last_row_id }, 200, cors);
  } catch (e: any) {
    return serverError(e?.message || "Unhandled error");
  }
};
