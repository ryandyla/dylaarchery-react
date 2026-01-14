// worker.js — Dyla Archery: landing page + Arrow Builder API (D1)

// ---------------------- Config ----------------------
const BUILD_LABOR_PER_ARROW = 4.50;
const MIN_CUT_LENGTH = 24.0;
const CUT_INCREMENT = 0.25;
const MICRO_OD_MAX = 0.265;
const MIN_QTY = 6;

const API_BASE = "/api/builder";

// ---------------------- Helpers ----------------------
function json(obj, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

function badRequest(message, field) {
  return json({ ok: false, field, message }, 400);
}

function serverError(message = "Server error") {
  return json({ ok: false, message }, 500);
}

function isNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function isIncrement(n, inc) {
  // Avoid float issues: allow tiny tolerance
  const scaled = n / inc;
  return Math.abs(scaled - Math.round(scaled)) < 0.000001;
}

async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

async function firstRow(stmt) {
  const r = await stmt.first();
  return r || null;
}

async function allRows(stmt) {
  const r = await stmt.all();
  return r?.results || [];
}

// ---------------------- DB fetchers ----------------------
async function getCatalog(DB) {
  const [shafts, wraps, vanes, points] = await Promise.all([
    allRows(DB.prepare(
      `SELECT id, brand, model, spine, gpi, inner_diameter, outer_diameter, max_length, straightness, price_per_shaft
       FROM shafts WHERE active = 1
       ORDER BY brand, model, spine`
    )),
    allRows(DB.prepare(
      `SELECT id, name, length, min_outer_diameter, max_outer_diameter, price_per_arrow
       FROM wraps WHERE active = 1
       ORDER BY name`
    )),
    allRows(DB.prepare(
      `SELECT id, brand, model, length, height, weight_grains, profile, compatible_micro, price_per_arrow
       FROM vanes WHERE active = 1
       ORDER BY brand, model`
    )),
    allRows(DB.prepare(
      `SELECT id, type, brand, model, weight_grains, thread, price
       FROM points WHERE active = 1
       ORDER BY type, brand, model, weight_grains`
    )),
  ]);

  return { shafts, wraps, vanes, points };
}

async function getShaft(DB, id) {
  return firstRow(DB.prepare(
    `SELECT id, brand, model, spine, gpi, inner_diameter, outer_diameter, max_length, straightness, price_per_shaft, active
     FROM shafts WHERE id = ?1`
  ).bind(id));
}

async function getWrap(DB, id) {
  return firstRow(DB.prepare(
    `SELECT id, name, length, min_outer_diameter, max_outer_diameter, price_per_arrow, active
     FROM wraps WHERE id = ?1`
  ).bind(id));
}

async function getVane(DB, id) {
  return firstRow(DB.prepare(
    `SELECT id, brand, model, length, height, weight_grains, profile, compatible_micro, price_per_arrow, active
     FROM vanes WHERE id = ?1`
  ).bind(id));
}

async function getPoint(DB, id) {
  return firstRow(DB.prepare(
    `SELECT id, type, brand, model, weight_grains, thread, price, active
     FROM points WHERE id = ?1`
  ).bind(id));
}

// ---------------------- Validation + Pricing ----------------------
function validateBuild({ shaft, wrap, vane, point, cut_length, quantity, fletch_count }) {
  // Required selections
  if (!shaft) return { ok: false, field: "shaft_id", message: "Shaft selection is required." };
  if (!vane) return { ok: false, field: "vane_id", message: "Vane selection is required." };
  if (!point) return { ok: false, field: "point_id", message: "Point selection is required." };

  if (!isNumber(cut_length)) return { ok: false, field: "cut_length", message: "Cut length is required." };
  if (!isNumber(quantity)) return { ok: false, field: "quantity", message: "Quantity is required." };

  // Active checks
  if (shaft.active !== 1) return { ok: false, field: "shaft_id", message: "Selected shaft is not available." };
  if (wrap && wrap.active !== 1) return { ok: false, field: "wrap_id", message: "Selected wrap is not available." };
  if (vane.active !== 1) return { ok: false, field: "vane_id", message: "Selected vane is not available." };
  if (point.active !== 1) return { ok: false, field: "point_id", message: "Selected point is not available." };

  // Cut length rules
  if (cut_length > shaft.max_length) {
    return { ok: false, field: "cut_length", message: "Cut length exceeds raw shaft length." };
  }
  if (cut_length < MIN_CUT_LENGTH) {
    return { ok: false, field: "cut_length", message: `Minimum cut length is ${MIN_CUT_LENGTH}".` };
  }
  if (!isIncrement(cut_length, CUT_INCREMENT)) {
    return { ok: false, field: "cut_length", message: `Cut length must be in ${CUT_INCREMENT}" increments.` };
  }

  // Quantity rules
  if (quantity < MIN_QTY) {
    return { ok: false, field: "quantity", message: `Minimum order is ${MIN_QTY} arrows.` };
  }
  if (quantity % 2 !== 0) {
    return { ok: false, field: "quantity", message: "Quantity must be an even number." };
  }

  // Fletch count sanity (v1 fixed at 3, but validate anyway)
  if (!isNumber(fletch_count) || fletch_count !== 3) {
    return { ok: false, field: "fletch_count", message: "Fletching count must be 3 for now." };
  }

  // Wrap compatibility
  if (wrap) {
    if (shaft.outer_diameter < wrap.min_outer_diameter || shaft.outer_diameter > wrap.max_outer_diameter) {
      return { ok: false, field: "wrap_id", message: "Wrap is not compatible with selected shaft." };
    }
    if (wrap.length >= cut_length) {
      return { ok: false, field: "wrap_id", message: "Wrap length exceeds arrow length." };
    }
  }

  // Vane compatibility (micro)
  if (shaft.outer_diameter <= MICRO_OD_MAX && !vane.compatible_micro) {
    return { ok: false, field: "vane_id", message: "Selected vane is not compatible with micro-diameter shafts." };
  }

  // Point thread (keep tight for now)
  if (point.thread && point.thread !== "8-32") {
    return { ok: false, field: "point_id", message: "Point thread type is not supported." };
  }

  return { ok: true };
}

function calculatePrice({ shaft, wrap, vane, point, fletch_count, quantity }) {
  const per_arrow =
    Number(shaft.price_per_shaft) +
    (wrap ? Number(wrap.price_per_arrow) : 0) +
    (Number(vane.price_per_arrow) * fletch_count) +
    Number(point.price) +
    BUILD_LABOR_PER_ARROW;

  const per = round2(per_arrow);
  const subtotal = round2(per * quantity);

  return { per_arrow: per, subtotal };
}

function buildSummary({ shaft, wrap, vane, point, cut_length, quantity }) {
  const shaftLabel = `${shaft.brand} ${shaft.model} ${shaft.spine}`;
  const wrapLabel = wrap ? wrap.name : "No wrap";
  const vaneLabel = `${vane.brand} ${vane.model}`;
  const pointLabel = `${point.brand || ""} ${point.model || ""}`.trim() || `${point.type} ${point.weight_grains}gr`;

  return {
    shaft: shaftLabel,
    cut_length,
    wrap: wrapLabel,
    vane: vaneLabel,
    point: pointLabel,
    quantity,
  };
}

// ---------------------- Orders ----------------------
async function upsertCustomer(DB, { email, name }) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;

  // Try find
  const existing = await firstRow(DB.prepare(`SELECT id, email, name FROM customers WHERE email = ?1`).bind(e));
  if (existing) {
    // Optionally update name if provided and different
    const nm = String(name || "").trim();
    if (nm && nm !== (existing.name || "")) {
      await DB.prepare(`UPDATE customers SET name = ?1 WHERE id = ?2`).bind(nm, existing.id).run();
      existing.name = nm;
    }
    return existing;
  }

  const nm = String(name || "").trim() || null;
  const res = await DB.prepare(
    `INSERT INTO customers (email, name) VALUES (?1, ?2)`
  ).bind(e, nm).run();

  return { id: res.meta.last_row_id, email: e, name: nm };
}

async function createDraftOrder(DB, { customer_id, subtotal }) {
  const shipping = 0;
  const tax = 0;
  const total = round2(subtotal + shipping + tax);

  const res = await DB.prepare(
    `INSERT INTO orders (customer_id, status, subtotal, shipping, tax, total)
     VALUES (?1, 'draft', ?2, ?3, ?4, ?5)`
  ).bind(customer_id, subtotal, shipping, tax, total).run();

  return { id: res.meta.last_row_id, status: "draft", subtotal, shipping, tax, total };
}

async function createArrowBuild(DB, { order_id, shaft_id, wrap_id, vane_id, point_id, cut_length, quantity, fletch_count, price_per_arrow }) {
  const res = await DB.prepare(
    `INSERT INTO arrow_builds
      (order_id, shaft_id, wrap_id, vane_id, point_id, cut_length, quantity, fletch_count, price_per_arrow)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
  ).bind(
    order_id,
    shaft_id,
    wrap_id ?? null,
    vane_id,
    point_id,
    cut_length,
    quantity,
    fletch_count,
    price_per_arrow
  ).run();

  return { id: res.meta.last_row_id };
}

// ---------------------- Landing page (optional placeholder) ----------------------
function landingHtml() {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Dyla Archery</title></head><body style="font-family:system-ui;padding:40px;background:#07070a;color:#fff;">
  <h1>Dyla Archery</h1><p>API is live. Builder endpoints are under <code>${API_BASE}</code>.</p></body></html>`;
}

// ---------------------- Router ----------------------
export default {
  async fetch(req, env, ctx) {
    try {
      const url = new URL(req.url);

      // Basic CORS for local dev UI (adjust later)
      const corsHeaders = {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,OPTIONS",
        "access-control-allow-headers": "content-type",
      };
      if (req.method === "OPTIONS") return new Response("", { status: 204, headers: corsHeaders });

      // Landing page
      if (req.method === "GET" && url.pathname === "/") {
        return new Response(landingHtml(), {
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      }

      // Ensure DB binding
      const DB = env.DB;
      if (!DB) {
        return serverError("Missing D1 binding: env.DB");
      }

      // -------- /api/builder/catalog --------
      if (req.method === "GET" && url.pathname === `${API_BASE}/catalog`) {
        const catalog = await getCatalog(DB);
        return json({ ok: true, ...catalog }, 200, corsHeaders);
      }

      // -------- /api/builder/price --------
      if (req.method === "POST" && url.pathname === `${API_BASE}/price`) {
        const body = await readJson(req);
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

        // Fetch referenced items
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

        // Validate
        const v = validateBuild({ shaft, wrap, vane, point, cut_length, quantity, fletch_count });
        if (!v.ok) return json(v, 400, corsHeaders);

        // Price
        const price = calculatePrice({ shaft, wrap, vane, point, fletch_count, quantity });
        const summary = buildSummary({ shaft, wrap, vane, point, cut_length, quantity });

        return json({ ok: true, price, build: summary }, 200, corsHeaders);
      }

      // -------- /api/builder/draft --------
      if (req.method === "POST" && url.pathname === `${API_BASE}/draft`) {
        const body = await readJson(req);
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
        if (!v.ok) return json(v, 400);

        // Price snapshot
        const price = calculatePrice({ shaft, wrap, vane, point, fletch_count, quantity });

        // Transaction (best effort): D1 supports batch; keep it simple
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

        return json({
          ok: true,
          order_id: order.id,
          build_id: buildRow.id,
          status: order.status,
          price,
        }, 200);
      }

      return new Response("Not found", { status: 404 });
    } catch (e) {
      return serverError((e && e.message) ? e.message : "Unhandled error");
    }
  },
};
