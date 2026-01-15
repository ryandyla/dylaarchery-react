import {
  badRequest,
  calculatePrice,
  corsHeaders,
  createArrowBuild,
  createDraftOrder,
  getInsert,
  getNock,
  getPoint,
  getShaft,
  getVane,
  getWrap,
  json,
  readJson,
  serverError,
  upsertCustomer,
  validateBuild,
} from "../../_utils/db";

const UNCUT_SENTINEL = 99;

export const onRequest = async ({ request, env }: any) => {
  try {
    const cors = corsHeaders(request);

    if (request.method === "OPTIONS") return new Response("", { status: 204, headers: cors });
    if (request.method !== "POST") return new Response("Not found", { status: 404 });

    const DB = env.DB;
    if (!DB) return serverError("Missing D1 binding: env.DB");

    const body = await readJson(request);
    if (!body) return badRequest("Invalid JSON.", "body");

    const customer = body.customer || {};
    const build = body.build || {};

    const email = String(customer.email || "").trim();
    const name = String(customer.name || "").trim();

    if (!email) return badRequest("Email is required.", "customer.email");

    // ---- Build inputs (all optional except shaft + quantity) ----
    const shaft_id = Number(build.shaft_id);
    const wrap_id = build.wrap_id == null ? null : Number(build.wrap_id);

    const vane_id = build.vane_id == null ? null : Number(build.vane_id);
    const insert_id = build.insert_id == null ? null : Number(build.insert_id);
    const point_id = build.point_id == null ? null : Number(build.point_id);
    const nock_id = build.nock_id == null ? null : Number(build.nock_id);

    const quantity = Number(build.quantity);

    // Allow 0/3/4 (default 0 = no vanes)
    const fletch_count = build.fletch_count == null ? 0 : Number(build.fletch_count);

    // Cut handling: use cut_mode + sentinel 99 when uncut
    const cut_mode: "uncut" | "cut" = build.cut_mode === "cut" ? "cut" : "uncut";
    const cut_length = build.cut_length == null ? null : Number(build.cut_length);

    if (cut_mode === "cut" && (cut_length == null || !Number.isFinite(cut_length))) {
      return badRequest("cut_length is required when cut_mode is 'cut'.", "build.cut_length");
    }
    if (cut_mode === "uncut" && cut_length != null) {
      return badRequest("cut_length must be null when cut_mode is 'uncut'.", "build.cut_length");
    }

    // ---- Type checks ----
    if (!Number.isInteger(shaft_id)) return badRequest("shaft_id must be an integer.", "build.shaft_id");
    if (wrap_id != null && !Number.isInteger(wrap_id)) return badRequest("wrap_id must be an integer.", "build.wrap_id");
    if (vane_id != null && !Number.isInteger(vane_id)) return badRequest("vane_id must be an integer.", "build.vane_id");
    if (insert_id != null && !Number.isInteger(insert_id)) return badRequest("insert_id must be an integer.", "build.insert_id");
    if (point_id != null && !Number.isInteger(point_id)) return badRequest("point_id must be an integer.", "build.point_id");
    if (nock_id != null && !Number.isInteger(nock_id)) return badRequest("nock_id must be an integer.", "build.nock_id");

    if (!Number.isFinite(quantity)) return badRequest("quantity must be a number.", "build.quantity");
    if (!Number.isFinite(fletch_count)) return badRequest("fletch_count must be a number.", "build.fletch_count");

    // If cutting, cut_length must be a number
    if (cut_mode === "cut" && (cut_length == null || !Number.isFinite(cut_length))) {
      return badRequest("cut_length is required when cut_mode is 'cut'.", "build.cut_length");
    }

    // ---- Fetch referenced items ----
    const [shaft, wrap, vane, insert, point, nock] = await Promise.all([
      getShaft(DB, shaft_id),
      wrap_id != null ? getWrap(DB, wrap_id) : Promise.resolve(null),
      vane_id != null ? getVane(DB, vane_id) : Promise.resolve(null),
      insert_id != null ? getInsert(DB, insert_id) : Promise.resolve(null),
      point_id != null ? getPoint(DB, point_id) : Promise.resolve(null),
      nock_id != null ? getNock(DB, nock_id) : Promise.resolve(null),
    ]);

    if (!shaft) return badRequest("Selected shaft not found.", "build.shaft_id");
    if (wrap_id != null && !wrap) return badRequest("Selected wrap not found.", "build.wrap_id");
    if (vane_id != null && !vane) return badRequest("Selected vane not found.", "build.vane_id");
    if (insert_id != null && !insert) return badRequest("Selected insert not found.", "build.insert_id");
    if (point_id != null && !point) return badRequest("Selected point not found.", "build.point_id");
    if (nock_id != null && !nock) return badRequest("Selected nock not found.", "build.nock_id");

    // ---- Validate (backend is source of truth) ----
    const v = validateBuild({ shaft, wrap, vane, insert, point, nock, cut_mode, cut_length, quantity, fletch_count });

    if (!v.ok) return json(v, 400, cors);

    // ---- Price snapshot ----
    const price = calculatePrice({ shaft, wrap, vane, insert, point, nock, fletch_count, quantity });

    // ---- Write order data ----
    const cust = await upsertCustomer(DB, { email, name });
    if (!cust) return badRequest("Invalid email.", "customer.email");

    const order = await createDraftOrder(DB, { customer_id: cust.id, subtotal: price.subtotal });

    const buildRow = await createArrowBuild(DB, {
      order_id: order.id,
      shaft_id,
      wrap_id,
      vane_id,
      insert_id,
      point_id,
      nock_id,
      cut_length, 
      quantity,
      fletch_count,
      price_per_arrow: price.per_arrow,
    });

    return json(
      {
        ok: true,
        order_id: order.id,
        build_id: buildRow.id,
        status: order.status,
        price,
      },
      200,
      cors
    );
  } catch (e: any) {
    return serverError(e?.message || "Unhandled error");
  }
};
