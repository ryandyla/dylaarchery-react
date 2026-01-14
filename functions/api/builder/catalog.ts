import { corsHeaders, getCatalog, json, serverError } from "../../_utils/db";

export const onRequest = async ({ request, env }: any) => {
  try {
    if (request.method === "OPTIONS") return new Response("", { status: 204, headers: corsHeaders(request) });
    if (request.method !== "GET") return new Response("Not found", { status: 404 });

    const DB = env.DB;
    if (!DB) return serverError("Missing D1 binding: env.DB");

    const catalog = await getCatalog(DB);
    return json({ ok: true, ...catalog }, 200, corsHeaders(request));
  } catch (e: any) {
    return serverError(e?.message || "Unhandled error");
  }
};
