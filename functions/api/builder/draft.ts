import {
  badRequest,
  calculatePrice,
  corsHeaders,
  createArrowBuild,
  createDraftOrder,
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

    const shaft_id = Number(build.shaft_id);
    const wrap_id = build.wrap_id == null ? null : Number(build.wrap_id);
    const vane_id = Number(build.vane_id);
    const point_id = Number(build.point_id);
    const cut_length = Number(build.cut_length);
    const quantity = Number(build.quantity);
    const fletch_count = build.fletch_count == null ? 3 : Number(build.fletch_count);

    if (!Number.isInteger(shaft_id)) return badRequest("shaft_id must be an integer.", "build.shaft_id");
    if (wrap_id != null && !Number.isInteger(wrap_id)) return badRequest("wrap_id must be an integer.", "build.wrap_id");
    if (!Number.isInteger(vane_id)) return badRequest("vane_id must be an integer.", "build.vane_id");
    if (!Number.isInteger(point_id)) return badRequest("point_id must be an integer.", "build.point_id");

    // Fetch referenced items
    const [shaft, wrap, vane, point] = await Promise.all([
      getShaft(DB, shaft_id),
      wrap_id != null ? getWrap(DB, wrap_id) : Promise.resolve(null),
      getVane(DB, vane_id),
      getPoint(DB, point_id),
    ]);

    if (!shaft) return badRequest("Selected shaft not found.", "build.shaft_id");
    if (wrap_id != null && !wrap) return badRequest("Selected wrap not found.", "build.wrap_id");
    if (!vane) return badRequest("Selected vane not found.", "build.vane_id");
    if (!point) return badRequest("Selected point not found.", "build.point_id");

    // Validate
    const v = validateBuild({ shaft, wrap, vane, point, cut_length, quantity, fletch_count });
    if (!v.ok) return json(v, 400, cors);

    // Price snapshot
    const price = calculatePrice({ shaft, wrap, vane, point, fletch_count, quantity });

    // Write order data
    const cust = await upsertCustomer(DB, { email, name });
    if (!cust) return badRequest("Invalid email.", "customer.email");

    const order = await createDraftOrder(DB, { customer_id: cust.id, subtotal: price.subtotal });

    const buildRow = await createArrowBuild(DB, {
      order_id: order.id,
      shaft_id,
      wrap_id,
      vane_id,
      point_id,
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
