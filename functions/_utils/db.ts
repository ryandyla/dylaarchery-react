type D1Database = any;
type D1PreparedStatement = any;

export const BUILD_LABOR_PER_ARROW = 4.5;
export const MIN_CUT_LENGTH = 20.0;
export const CUT_INCREMENT = 0.25;
export const MICRO_OD_MAX = 0.265;
export const ALLOWED_QTYS = [6, 12] as const;

export function json(obj: any, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export function badRequest(message: string, field?: string) {
  return json({ ok: false, field, message }, 400);
}

export function serverError(message = "Server error") {
  return json({ ok: false, message }, 500);
}

export function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "*";
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    "vary": "origin",
  };
}

export function isNumber(x: any) {
  return typeof x === "number" && Number.isFinite(x);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function isIncrement(n: number, inc: number) {
  const scaled = n / inc;
  return Math.abs(scaled - Math.round(scaled)) < 0.000001;
}

export async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function firstRow(stmt: D1PreparedStatement) {
  const r = await stmt.first();
  return r || null;
}

export async function allRows(stmt: D1PreparedStatement) {
  const r = await stmt.all();
  return r?.results || [];
}

// ---- DB fetchers ----
export async function getCatalog(DB: D1Database) {
  const [shafts, wraps, vanes, points, inserts, nocks] = await Promise.all([
    // shafts
    allRows(
      DB.prepare(
        `SELECT id, brand, model, spine, gpi, inner_diameter, outer_diameter, max_length, straightness, price_per_shaft
         FROM shafts WHERE active = 1
         ORDER BY brand, model, spine`
      )
    ),
    // wraps
    allRows(
      DB.prepare(
        `SELECT id, name, length, min_outer_diameter, max_outer_diameter, weight_grains, price_per_arrow
        FROM wraps WHERE active = 1
        ORDER BY name`
      )
    ),
    // vanes
    allRows(
      DB.prepare(
        `SELECT id, brand, model, length, height, weight_grains, profile, compatible_micro, price_per_arrow
         FROM vanes WHERE active = 1
         ORDER BY brand, model`
      )
    ),
    // points
    allRows(
      DB.prepare(
        `SELECT id, type, brand, model, weight_grains, thread, price
         FROM points WHERE active = 1
         ORDER BY type, brand, model, weight_grains`
      )
    ),
    // inserts
    allRows(
      DB.prepare(
        `SELECT id, brand, model, system, type, weight_grains, price_per_arrow, requires_collar,
                collar_weight_grains, collar_price_per_arrow
         FROM inserts WHERE active = 1
         ORDER BY brand, model`
      )
    ),
    // nocks
    allRows(
      DB.prepare(
        `SELECT id, brand, model, system, style, weight_grains, price_per_arrow, active
        FROM nocks WHERE active = 1
        ORDER BY brand, model`
      )
    ),
  ]);

  return { shafts, wraps, vanes, inserts, points, nocks };
}

export async function getShaft(DB: D1Database, id: number) {
  return firstRow(
    DB.prepare(
      `SELECT id, brand, model, spine, gpi, inner_diameter, outer_diameter, max_length, straightness, price_per_shaft, active
       FROM shafts WHERE id = ?1`
    ).bind(id)
  );
}

export async function getWrap(DB: D1Database, id: number) {
  return firstRow(
    DB.prepare(
      `SELECT id, name, length, min_outer_diameter, max_outer_diameter, price_per_arrow, active
       FROM wraps WHERE id = ?1`
    ).bind(id)
  );
}

export async function getVane(DB: D1Database, id: number) {
  return firstRow(
    DB.prepare(
      `SELECT id, brand, model, length, height, weight_grains, profile, compatible_micro, price_per_arrow, active
       FROM vanes WHERE id = ?1`
    ).bind(id)
  );
}

export async function getInsert(DB: D1Database, id: number) {
  return (await DB.prepare(
    `SELECT id, brand, model, system, type, weight_grains, price_per_arrow, requires_collar,
            collar_weight_grains, collar_price_per_arrow, active
     FROM inserts WHERE id = ?1`
  ).bind(id).first()) || null;
}

export async function listInsertsForSystem(DB: D1Database, system: string) {
  const r = await DB.prepare(
    `SELECT id, brand, model, system, type, weight_grains, price_per_arrow, requires_collar,
            collar_weight_grains, collar_price_per_arrow
     FROM inserts
     WHERE active = 1 AND system = ?1
     ORDER BY brand, model`
  ).bind(system).all();
  return r.results || [];
}

export async function getNock(DB: D1Database, id: number) {
  return firstRow(
    DB.prepare(
      `SELECT id, brand, model, system, style, price_per_arrow, active
       FROM nocks WHERE id = ?1`
    ).bind(id)
  );
}

export async function listNocksForSystem(DB: D1Database, system: string) {
  const r = await DB.prepare(
    `SELECT id, brand, model, system, style, price_per_arrow
     FROM nocks
     WHERE active = 1 AND system = ?1
     ORDER BY brand, model`
  ).bind(system).all();
  return r.results || [];
}

export async function getPoint(DB: D1Database, id: number) {
  return firstRow(
    DB.prepare(
      `SELECT id, type, brand, model, weight_grains, thread, price, active
       FROM points WHERE id = ?1`
    ).bind(id)
  );
}

// ---- Validation + pricing ----
export function validateBuild(args: any) {
  const { shaft, wrap, vane, point, insert, nock, cut_mode, cut_length, quantity, fletch_count } = args;

  if (!shaft) return { ok: false, field: "shaft_id", message: "Shaft selection is required." };
  if (!isNumber(quantity)) return { ok: false, field: "quantity", message: "Quantity is required." };

  const mode: "uncut" | "cut" = cut_mode === "cut" ? "cut" : "uncut";

  if (mode === "cut") {
    if (!isNumber(cut_length)) return { ok: false, field: "cut_length", message: "Cut length is required." };
    if (cut_length > shaft.max_length) return { ok: false, field: "cut_length", message: "Cut length exceeds raw shaft length." };
    if (cut_length < MIN_CUT_LENGTH) return { ok: false, field: "cut_length", message: `Minimum cut length is ${MIN_CUT_LENGTH}".` };
    if (!isIncrement(cut_length, CUT_INCREMENT)) return { ok: false, field: "cut_length", message: `Cut length must be in ${CUT_INCREMENT}" increments.` };
  } else {
    // uncut
    if (cut_length != null) {
      return { ok: false, field: "cut_length", message: "For uncut builds, cut_length must be null." };
    }
  }

  // qty must be exactly 6 or 12
  if (quantity !== 6 && quantity !== 12) return { ok: false, field: "quantity", message: "Quantity must be 6 or 12." };

  // fletch_count: allow 0/3/4
  if (![0, 3, 4].includes(Number(fletch_count))) {
    return { ok: false, field: "fletch_count", message: "Fletching count must be 0, 3, or 4." };
  }
  // if fletching requested, vane required; if not, vane must be null
  if (Number(fletch_count) === 0) {
    if (vane) return { ok: false, field: "vane_id", message: "If fletch_count is 0, vane must be empty." };
  } else {
    if (!vane) return { ok: false, field: "vane_id", message: "Vane selection is required when fletching is enabled." };
  }

  // Wrap compatibility only if chosen
  if (wrap && mode === "cut") {
    if (shaft.outer_diameter < wrap.min_outer_diameter || shaft.outer_diameter > wrap.max_outer_diameter) {
      return { ok: false, field: "wrap_id", message: "Wrap is not compatible with selected shaft." };
    }
    if (isNumber(cut_length) && wrap.length >= cut_length) {
      return { ok: false, field: "wrap_id", message: "Wrap length exceeds arrow length." };
    }
  }

  // Vane micro compatibility only if chosen
  if (vane) {
    if (shaft.outer_diameter <= MICRO_OD_MAX && !vane.compatible_micro) {
      return { ok: false, field: "vane_id", message: "Selected vane is not compatible with micro-diameter shafts." };
    }
  }

  // Point thread check only if chosen
  if (point) {
    if (point.thread && point.thread !== "8-32") {
      return { ok: false, field: "point_id", message: "Point thread type is not supported." };
    }
  }

  return { ok: true };
}

export function calculatePrice(args: any) {
  const { shaft, wrap, vane, insert, point, nock, fletch_count, quantity } = args;

  const per_arrow =
    Number(shaft.price_per_shaft) +
    (wrap ? Number(wrap.price_per_arrow) : 0) +
    (vane ? Number(vane.price_per_arrow) * fletch_count : 0) +
    (insert ? Number(insert.price_per_arrow) + (insert.requires_collar ? Number(insert.collar_price_per_arrow ?? 0) : 0) : 0) +
    (point ? Number(point.price) : 0) +
    (nock ? Number(nock.price_per_arrow) : 0) +
    BUILD_LABOR_PER_ARROW;

  const per = round2(per_arrow);
  const subtotal = round2(per * quantity);
  return { per_arrow: per, subtotal };
}


export function buildSummary(args: any) {
  const { shaft, wrap, vane, point, insert, nock, cut_mode, cut_length, quantity, fletch_count } = args;

  const shaftLabel = `${shaft.brand} ${shaft.model} ${shaft.spine}`;
  const wrapLabel = wrap ? wrap.name : "None";
  const vaneLabel =
    fletch_count === 0
      ? "None"
      : vane
      ? `${vane.brand} ${vane.model} (${fletch_count}-fletch)`
      : "None";

  const insertLabel = insert ? `${insert.brand} ${insert.model}${insert.requires_collar ? " (+collar)" : ""}` : "None";
  const pointLabel = point ? (`${point.brand || ""} ${point.model || ""}`.trim() || `${point.type} ${point.weight_grains}gr`) : "None";
  const nockLabel = nock ? `${nock.brand} ${nock.model}` : "None";

  const mode: "uncut" | "cut" = cut_mode === "cut" ? "cut" : "uncut";

  return {
    shaft: shaftLabel,
    cut_mode: mode,
    cut_length: mode === "cut" ? cut_length : null,
    wrap: wrapLabel,
    vane: vaneLabel,
    insert: insertLabel,
    point: pointLabel,
    nock: nockLabel,
    quantity,
  };
}

// ---------------------- Orders helpers ----------------------
export async function upsertCustomer(DB: any, { email, name }: { email: string; name?: string }) {
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;

  const existing = await firstRow(DB.prepare(`SELECT id, email, name FROM customers WHERE email = ?1`).bind(e));
  if (existing) {
    const nm = String(name || "").trim();
    if (nm && nm !== (existing.name || "")) {
      await DB.prepare(`UPDATE customers SET name = ?1 WHERE id = ?2`).bind(nm, existing.id).run();
      existing.name = nm;
    }
    return existing;
  }

  const nm = String(name || "").trim() || null;
  const res = await DB.prepare(`INSERT INTO customers (email, name) VALUES (?1, ?2)`).bind(e, nm).run();
  return { id: res.meta.last_row_id, email: e, name: nm };
}

export async function createDraftOrder(DB: any, { customer_id, subtotal }: { customer_id: number; subtotal: number }) {
  const shipping = 0;
  const tax = 0;
  const total = round2(subtotal + shipping + tax);

  const res = await DB.prepare(
    `INSERT INTO orders (customer_id, status, subtotal, shipping, tax, total)
     VALUES (?1, 'draft', ?2, ?3, ?4, ?5)`
  )
    .bind(customer_id, subtotal, shipping, tax, total)
    .run();

  return { id: res.meta.last_row_id, status: "draft", subtotal, shipping, tax, total };
}

export async function createArrowBuild(
  DB: any,
  args: {
    order_id: number;
    shaft_id: number;
    wrap_id: number | null;
    vane_id: number | null;
    insert_id: number | null;
    point_id: number | null;
    nock_id: number | null;
    cut_length: number;
    quantity: number;
    fletch_count: number;
    price_per_arrow: number;
  }
) 
 {
  const res = await DB.prepare(
    `INSERT INTO arrow_builds
      (order_id, shaft_id, wrap_id, vane_id, insert_id, point_id, nock_id, cut_length, quantity, fletch_count, price_per_arrow)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
  )
    .bind(
      args.order_id,
      args.shaft_id,
      args.wrap_id ?? null,
      args.vane_id ?? null,
      args.insert_id ?? null,
      args.point_id ?? null,
      args.nock_id ?? null,
      args.cut_length,
      args.quantity,
      args.fletch_count,
      args.price_per_arrow
    )
    .run();

  return { id: res.meta.last_row_id };
}
