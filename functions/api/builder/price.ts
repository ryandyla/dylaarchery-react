import {
  badRequest,
  buildSummary,
  calculatePrice,
  corsHeaders,
  getInsert, 
  getNock,
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

// functions/api/builder/price.ts (or wherever this file lives)

    const body = await readJson(request);
    if (!body) return badRequest("Invalid JSON.", "body");

    const shaft_id = Number(body.shaft_id);
    const wrap_id = body.wrap_id == null ? null : Number(body.wrap_id);
    const vane_id = body.vane_id == null ? null : Number(body.vane_id);
    const insert_id = body.insert_id == null ? null : Number(body.insert_id);
    const point_id = body.point_id == null ? null : Number(body.point_id);
    const nock_id = body.nock_id == null ? null : Number(body.nock_id);

    // NEW:
    const cut_mode: "uncut" | "cut" = body.cut_mode === "cut" ? "cut" : "uncut";
    const cut_length = body.cut_length == null ? null : Number(body.cut_length);

    if (cut_mode === "cut" && (cut_length == null || !Number.isFinite(cut_length))) {
      return badRequest("cut_length is required when cut_mode is 'cut'.", "cut_length");
    }
    if (cut_mode === "uncut" && cut_length != null) {
      return badRequest("cut_length must be null when cut_mode is 'uncut'.", "cut_length");
    }

    const quantity = Number(body.quantity);

    // NEW: default fletch_count to 0 (since vanes are optional)
    const fletch_count = body.fletch_count == null ? 0 : Number(body.fletch_count);

    if (!Number.isInteger(shaft_id)) return badRequest("shaft_id must be an integer.", "shaft_id");
    if (wrap_id != null && !Number.isInteger(wrap_id)) return badRequest("wrap_id must be an integer.", "wrap_id");
    if (vane_id != null && !Number.isInteger(vane_id)) return badRequest("vane_id must be an integer.", "vane_id");
    if (insert_id != null && !Number.isInteger(insert_id)) return badRequest("insert_id must be an integer.", "insert_id");
    if (point_id != null && !Number.isInteger(point_id)) return badRequest("point_id must be an integer.", "point_id");
    if (nock_id != null && !Number.isInteger(nock_id)) return badRequest("nock_id must be an integer.", "nock_id");

    // Only validate cut_length as a number when cutting
    const mode: "uncut" | "cut" = cut_mode === "cut" ? "cut" : "uncut";
    const UN = args.uncut_sentinel ?? 99;

    if (cut_mode === "cut" && cut_length != null && !Number.isFinite(cut_length)) {
      return badRequest("cut_length must be a number.", "cut_length");
    }
    if (!Number.isFinite(quantity)) return badRequest("quantity must be a number.", "quantity");
    if (!Number.isFinite(fletch_count)) return badRequest("fletch_count must be a number.", "fletch_count");



const [shaft, wrap, vane, insert, point, nock] = await Promise.all([
  getShaft(DB, shaft_id),
  wrap_id != null ? getWrap(DB, wrap_id) : Promise.resolve(null),
  vane_id != null ? getVane(DB, vane_id) : Promise.resolve(null),
  insert_id != null ? getInsert(DB, insert_id) : Promise.resolve(null),
  point_id != null ? getPoint(DB, point_id) : Promise.resolve(null),
  nock_id != null ? getNock(DB, nock_id) : Promise.resolve(null),
]);


  if (!shaft) return badRequest("Selected shaft not found.", "shaft_id");
  if (wrap_id != null && !wrap) return badRequest("Selected wrap not found.", "wrap_id");
  if (vane_id != null && !vane) return badRequest("Selected vane not found.", "vane_id");
  if (insert_id != null && !insert) return badRequest("Selected insert not found.", "insert_id");
  if (point_id != null && !point) return badRequest("Selected point not found.", "point_id");
  if (nock_id != null && !nock) return badRequest("Selected nock not found.", "nock_id");

const v = validateBuild({ shaft, wrap, vane, insert, point, nock, cut_mode, cut_length, quantity, fletch_count });
if (!v.ok) return json(v, 400, cors);

const price = calculatePrice({ shaft, wrap, vane, insert, point, nock, fletch_count, quantity });
const summary = buildSummary({ shaft, wrap, vane, insert, point, nock, cut_mode, cut_length, quantity });

return json({ ok: true, price, build: summary }, 200, cors);


  } catch (e: any) {
    return serverError(e?.message || "Unhandled error");
  }
};
