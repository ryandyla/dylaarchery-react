import {
  badRequest,
  buildSummary,
  calculatePrice,
  corsHeaders,
  getPoint,
  getShaft,
  getVane,
  getWrap,
  json,
  readJson,
  serverError,
  validateBuild,
} from "../../_utils/db";

export const onRequest = async ({ request, env }: any) => {
  try {
    const cors = corsHeaders(request);
    if (request.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
    if (request.method !== "POST") return new Response("Not found", { status: 404 });

    const DB = env.DB;
    if (!DB) return serverError("Missing D1 binding: env.DB");

    const body = await readJson(request);
    if (!body) return badRequest("Invalid JSON.", "body");

    const shaft_id = Number(body.shaft_id);
    const wrap_id = body.wrap_id == null ? null : Number(body.wrap_id);
    const vane_id = Number(body.vane_id);
    const point_id = Number(body.point_id);
    const cut_length = Number(body.cut_length);
    const quantity = Number(body.quantity);
    const fletch_count = body.fletch_count == null ? 3 : Number(body.fletch_count);

    if (!Number.isInteger(shaft_id)) return badRequest("shaft_id must be an integer.", "shaft_id");
    if (wrap_id != null && !Number.isInteger(wrap_id)) return badRequest("wrap_id must be an integer.", "wrap_id");
    if (!Number.isInteger(vane_id)) return badRequest("vane_id must be an integer.", "vane_id");
    if (!Number.isInteger(point_id)) return badRequest("point_id must be an integer.", "point_id");

    const [shaft, wrap, vane, point] = await Promise.all([
      getShaft(DB, shaft_id),
      wrap_id != null ? getWrap(DB, wrap_id) : Promise.resolve(null),
      getVane(DB, vane_id),
      getPoint(DB, point_id),
    ]);

    if (!shaft) return badRequest("Selected shaft not found.", "shaft_id");
    if (wrap_id != null && !wrap) return badRequest("Selected wrap not found.", "wrap_id");
    if (!vane) return badRequest("Selected vane not found.", "vane_id");
    if (!point) return badRequest("Selected point not found.", "point_id");

    const v = validateBuild({ shaft, wrap, vane, point, cut_length, quantity, fletch_count });
    if (!v.ok) return json(v, 400, cors);

    const price = calculatePrice({ shaft, wrap, vane, point, fletch_count, quantity });
    const summary = buildSummary({ shaft, wrap, vane, point, cut_length, quantity });

    return json({ ok: true, price, build: summary }, 200, cors);
  } catch (e: any) {
    return serverError(e?.message || "Unhandled error");
  }
};
