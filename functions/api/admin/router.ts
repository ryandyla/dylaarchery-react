import { requireAccess } from "./auth";

type TypeKey = "shafts" | "nocks" | "vanes" | "wraps" | "inserts" | "points";

const TABLES: Record<TypeKey, string> = {
  shafts: "shafts",
  nocks: "nocks",
  vanes: "vanes",
  wraps: "wraps",
  inserts: "inserts",
  points: "points",
};

// product_images.product_type uses singular in your schema
const IMAGE_TYPE: Record<TypeKey, string> = {
  shafts: "shaft",
  nocks: "nock",
  vanes: "vane",
  wraps: "wrap",
  inserts: "insert",
  points: "point",
};

// Which columns exist per table for insert/update (safe whitelist)
const COLS: Record<TypeKey, string[]> = {
  shafts: [
    "brand",
    "model",
    "spine",
    "gpi",
    "inner_diameter",
    "outer_diameter",
    "max_length",
    "straightness",
    "price_per_shaft",
    "active",
    "system",
    "image_url",
  ],
  nocks: ["brand", "model", "system", "style", "price_per_arrow", "active", "image_url", "weight_grains"],
  wraps: ["name", "length", "min_outer_diameter", "max_outer_diameter", "price_per_arrow", "active", "weight_grains", "image_url"],
  vanes: ["brand", "model", "length", "height", "weight_grains", "profile", "compatible_micro", "price_per_arrow", "active", "image_url"],
  inserts: [
    "brand",
    "model",
    "system",
    "type",
    "weight_grains",
    "price_per_arrow",
    "requires_collar",
    "collar_weight_grains",
    "collar_price_per_arrow",
    "active",
    "image_url",
  ],
  points: ["type", "brand", "model", "weight_grains", "thread", "price", "active", "image_url"],
};

function json(data: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) },
  });
}

function uid() {
  return crypto.randomUUID();
}

function asInt(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : NaN;
}

function pickTypeAndId(pathname: string): { type?: TypeKey; id?: number; rest?: string } {
  // pathname looks like: /api/admin/<type>[/<id>[/images]]
  const parts = pathname.replace(/^\/api\/admin\/?/, "").split("/").filter(Boolean);
  const type = parts[0] as TypeKey | undefined;
  const id = parts[1] ? asInt(parts[1]) : undefined;
  const rest = parts.slice(2).join("/"); // "images" etc
  return { type, id: Number.isFinite(id) ? id : undefined, rest };
}

function getTable(type?: TypeKey) {
  if (!type) return null;
  return TABLES[type] ? type : null;
}

function buildSearchWhere(type: TypeKey, q: string | null): { where: string; args: any[] } {
  if (!q) return { where: "1=1", args: [] };
  const like = `%${q}%`;
  const args: any[] = [];

  // Different tables have different “searchable” columns
  const cols = new Set(COLS[type]);
  const searchCols: string[] = [];
  if (cols.has("name")) searchCols.push("name");
  if (cols.has("brand")) searchCols.push("brand");
  if (cols.has("model")) searchCols.push("model");
  if (cols.has("system")) searchCols.push("system");
  if (cols.has("style")) searchCols.push("style");
  if (cols.has("type")) searchCols.push("type");
  if (cols.has("thread")) searchCols.push("thread");

  if (searchCols.length === 0) return { where: "1=1", args: [] };

  const or = searchCols.map((c) => `${c} LIKE ?`).join(" OR ");
  for (let i = 0; i < searchCols.length; i++) args.push(like);
  return { where: `(${or})`, args };
}

function normalizePatchValue(key: string, val: any) {
  // Keep booleans/checkboxes safe for INTEGER columns
  if (key === "active" || key === "compatible_micro" || key === "requires_collar" || key === "is_primary") {
    if (val === true) return 1;
    if (val === false) return 0;
  }
  return val;
}

export async function handleAdmin(req: Request, env: any, ctx: ExecutionContext) {
  // Gate everything behind Cloudflare Access
  const gate = await requireAccess(req, env);
  if (!gate.ok) return gate.res;

  const url = new URL(req.url);
  const { type, id, rest } = pickTypeAndId(url.pathname);

  const t = getTable(type);
  if (!t) return json({ ok: false, error: "Invalid admin type" }, { status: 404 });

  const table = TABLES[t];

  // -----------------------
  // GET /api/admin/:type?q=
  // -----------------------
  if (req.method === "GET" && id === undefined) {
    const q = url.searchParams.get("q");
    const { where, args } = buildSearchWhere(t, q);

    // Basic order: show active first, then newest id
    const sql = `SELECT * FROM ${table} WHERE ${where} ORDER BY active DESC, id DESC LIMIT 250`;
    const rows = await env.DB.prepare(sql).bind(...args).all();

    return json({ ok: true, items: rows.results });
  }

  // -------------------------
  // POST /api/admin/:type
  // body = allowed columns
  // -------------------------
  if (req.method === "POST" && id === undefined) {
    const body = await req.json();
    const allowed = COLS[t];

    const cols: string[] = [];
    const qs: string[] = [];
    const args: any[] = [];

    for (const k of allowed) {
      if (body[k] === undefined) continue;
      cols.push(k);
      qs.push("?");
      args.push(normalizePatchValue(k, body[k]));
    }

    // sanity: require something meaningful
    if (cols.length === 0) {
      return json({ ok: false, error: "No fields provided" }, { status: 400 });
    }

    // lightweight required validation per table
    if (t === "wraps") {
      if (!body.name) return json({ ok: false, error: "name is required" }, { status: 400 });
    } else {
      if (COLS[t].includes("brand") && !body.brand) return json({ ok: false, error: "brand is required" }, { status: 400 });
      if (COLS[t].includes("model") && !body.model) return json({ ok: false, error: "model is required" }, { status: 400 });
    }

    const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${qs.join(", ")})`;
    const r = await env.DB.prepare(sql).bind(...args).run();

    // D1 returns last_row_id for AUTOINCREMENT tables
    const newId = r.meta?.last_row_id;
    return json({ ok: true, id: newId });
  }

  // ----------------------------
  // PATCH /api/admin/:type/:id
  // ----------------------------
  if (req.method === "PATCH" && typeof id === "number" && rest === "") {
    const body = await req.json();
    const allowed = new Set(COLS[t]);

    const sets: string[] = [];
    const args: any[] = [];

    for (const [k, v] of Object.entries(body || {})) {
      if (!allowed.has(k)) continue;
      sets.push(`${k} = ?`);
      args.push(normalizePatchValue(k, v));
    }

    if (sets.length === 0) return json({ ok: false, error: "No allowed fields to update" }, { status: 400 });

    args.push(id);
    const sql = `UPDATE ${table} SET ${sets.join(", ")} WHERE id = ?`;
    await env.DB.prepare(sql).bind(...args).run();

    return json({ ok: true });
  }

  // ----------------------------
  // DELETE /api/admin/:type/:id
  // ----------------------------
  if (req.method === "DELETE" && typeof id === "number" && rest === "") {
    // delete images first
    await env.DB.prepare(`DELETE FROM product_images WHERE product_type = ? AND product_id = ?`)
      .bind(IMAGE_TYPE[t], id)
      .run();

    await env.DB.prepare(`DELETE FROM ${table} WHERE id = ?`).bind(id).run();
    return json({ ok: true });
  }

  // -----------------------------------
  // POST /api/admin/:type/:id/images
  // multipart form-data with "file"
  // -----------------------------------
  if (req.method === "POST" && typeof id === "number" && rest === "images") {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return json({ ok: false, error: "Expected multipart field named 'file'" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const key = `products/${t}/${id}/${uid()}.${ext}`;

    // Put into R2
    await env.PRODUCT_IMAGES.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    // How your site serves images today:
    // you already use /api/images/<something>. If your images function expects a key,
    // store a URL that matches that.
    const servedUrl = `/api/images/${encodeURIComponent(key)}`;

    // Insert row
    const imgType = IMAGE_TYPE[t];
    const alt = file.name;
    await env.DB.prepare(
      `INSERT INTO product_images (product_type, product_id, url, alt, sort, is_primary, active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(imgType, id, servedUrl, alt, 0, 0, 1)
      .run();

    // Set as primary (simple policy: newest becomes primary)
    await env.DB.prepare(
      `UPDATE product_images SET is_primary = 0 WHERE product_type = ? AND product_id = ?`
    )
      .bind(imgType, id)
      .run();

    // mark the latest inserted as primary
    await env.DB.prepare(
      `UPDATE product_images
       SET is_primary = 1
       WHERE id = (SELECT id FROM product_images WHERE product_type = ? AND product_id = ? ORDER BY id DESC LIMIT 1)`
    )
      .bind(imgType, id)
      .run();

    // Also update the product table's image_url for easy rendering
    if (COLS[t].includes("image_url")) {
      await env.DB.prepare(`UPDATE ${table} SET image_url = ? WHERE id = ?`).bind(servedUrl, id).run();
    }

    return json({ ok: true, url: servedUrl, key });
  }

  return json({ ok: false, error: "Not found" }, { status: 404 });
}
