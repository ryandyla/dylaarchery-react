import { corsHeaders, json } from "../../_utils/db";
import { requireAccess } from "../../_utils/access";

export const onRequest = async ({ request, env }: any) => {
  const cors = corsHeaders(request);
  if (request.method === "OPTIONS") return new Response("", { status: 204, headers: cors });

  const deny = await requireAccess(request);
  if (deny) return deny;
    if (!env.PRODUCT_IMAGES) return json({ ok: false, message: "Missing R2 binding: env.PRODUCT_IMAGES" }, 500, cors);
        const listed = await env.PRODUCT_IMAGES.list({ limit: 1 });

    return json({ ok: true, r2_ok: true, sample_keys: listed.objects.map(o => o.key) }, 200, cors);
};
