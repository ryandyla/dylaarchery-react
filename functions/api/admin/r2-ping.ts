import { json, corsHeaders, serverError } from "../../_utils/db";
import { requireAccessEmail } from "../../_utils/auth";

export const onRequest = async ({ request, env }: any) => {
  try {
    const cors = corsHeaders(request);
    if (request.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
    if (request.method !== "GET") return new Response("Not found", { status: 404 });

    const auth = requireAccessEmail(request);
    if (!auth.ok) return json({ ok: false, message: auth.message }, auth.status, cors);

    if (!env.PRODUCT_IMAGES) return json({ ok: false, message: "Missing R2 binding: env.PRODUCT_IMAGES" }, 500, cors);

    // light touch: list up to 1 object
    const listed = await env.PRODUCT_IMAGES.list({ limit: 1 });
    return json({ ok: true, admin: auth.email, r2_ok: true, sample_keys: listed.objects.map(o => o.key) }, 200, cors);
  } catch (e: any) {
    return serverError(e?.message || "Unhandled error");
  }
};

