import { requireAccess } from "./auth";
import { sendOrderMessage, sendAbandonedCartEmail } from "../../_utils/email";

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
    "shaft_id_in",
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
  try {
    return await handleAdminInner(req, env, ctx);
  } catch (err: any) {
    console.error("Admin handler error:", err);
    return json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}

async function handleAdminInner(req: Request, env: any, ctx: ExecutionContext) {
  // Gate everything behind Cloudflare Access
  const gate = await requireAccess(req, env);
  if (!gate.ok) return gate.res;

  const url = new URL(req.url);
  const { type, id, rest } = pickTypeAndId(url.pathname);

  // ── Commerce routes (orders / customers / marketing) ──────────────────────
  if (type === "orders") return handleOrders(req, url, id, rest, env);
  if (type === "customers") return handleCustomers(req, url, id, rest, env);
  if (type === "marketing") return handleMarketing(req, url, id, rest, env);

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

    // Inject legacy NOT NULL columns that exist in the original schema but
    // aren't in the COLS whitelist. Without these, INSERT fails with a
    // constraint error on tables that predate the commerce migration.
    const legacyCols: string[] = [];
    const legacyQs: string[] = [];
    const legacyArgs: any[] = [];

    if (t === "points") {
      legacyCols.push("category", "product_type");
      legacyQs.push("?", "?");
      legacyArgs.push(
        body.type === "broadhead" ? "Broadhead" : "Field Point",
        body.type || "field"
      );
    } else if (t === "nocks") {
      legacyCols.push("nock_type");
      legacyQs.push("?");
      const nockType =
        body.style === "pin" ? "pin"
        : body.style === "large" ? "press_fit_large"
        : body.style === "glue_on" ? "glue_on"
        : body.style === "traditional" ? "traditional"
        : "press_fit";
      legacyArgs.push(nockType);
    } else if (t === "inserts") {
      legacyCols.push("product_type");
      legacyQs.push("?");
      legacyArgs.push(body.type || body.system || "standard");
    }

    const allCols = [...cols, ...legacyCols];
    const allQs = [...qs, ...legacyQs];
    const allArgs = [...args, ...legacyArgs];

    const sql = `INSERT INTO ${table} (${allCols.join(", ")}) VALUES (${allQs.join(", ")})`;
    const r = await env.DB.prepare(sql).bind(...allArgs).run();

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
  // GET /api/admin/:type/:id/images
  // -----------------------------------
  if (req.method === "GET" && typeof id === "number" && rest === "images") {
    const imgType = IMAGE_TYPE[t];
    const rows = await env.DB.prepare(
      `SELECT id, url, alt, sort, is_primary FROM product_images WHERE product_type = ? AND product_id = ? ORDER BY is_primary DESC, sort ASC, id ASC`
    ).bind(imgType, id).all();
    return json({ ok: true, images: rows.results });
  }

  // -------------------------------------------
  // DELETE /api/admin/:type/:id/images/:imageId
  // -------------------------------------------
  if (req.method === "DELETE" && typeof id === "number" && rest.startsWith("images/")) {
    const imageId = asInt(rest.split("/")[1]);
    if (!Number.isFinite(imageId)) return json({ ok: false, error: "Invalid image id" }, { status: 400 });

    const imgType = IMAGE_TYPE[t];
    const row = await env.DB.prepare(
      `SELECT url FROM product_images WHERE id = ? AND product_type = ? AND product_id = ?`
    ).bind(imageId, imgType, id).first() as { url: string } | null;

    if (!row) return json({ ok: false, error: "Image not found" }, { status: 404 });

    // Delete from R2 — extract key from relative or absolute URL
    const marker = "/api/images/";
    const markerIdx = row.url.indexOf(marker);
    if (markerIdx !== -1) {
      const r2Key = decodeURIComponent(row.url.slice(markerIdx + marker.length));
      await env.PRODUCT_IMAGES.delete(r2Key);
    }

    await env.DB.prepare(`DELETE FROM product_images WHERE id = ?`).bind(imageId).run();

    // Update product table's image_url to the next remaining image or null
    if (COLS[t].includes("image_url")) {
      const next = await env.DB.prepare(
        `SELECT url FROM product_images WHERE product_type = ? AND product_id = ? ORDER BY is_primary DESC, id DESC LIMIT 1`
      ).bind(imgType, id).first() as { url: string } | null;
      await env.DB.prepare(`UPDATE ${table} SET image_url = ? WHERE id = ?`)
        .bind(next?.url ?? null, id)
        .run();
    }

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

// ── Orders handler ──────────────────────────────────────────────────────────

const ORDER_STATUSES = ["draft", "paid", "processing", "built", "shipped", "delivered", "cancelled"];

async function handleOrders(req: Request, url: URL, id: number | undefined, rest: string, env: any) {
  const DB = env.DB;

  // GET /api/admin/orders?status=paid&limit=100
  if (req.method === "GET" && id === undefined) {
    const status = url.searchParams.get("status");
    const limit = Math.min(Number(url.searchParams.get("limit") || "100"), 500);
    const where = status && ORDER_STATUSES.includes(status) ? `WHERE o.status = '${status}'` : "";
    const rows = await DB.prepare(`
      SELECT o.id, o.status, o.subtotal, o.total, o.discount_amount, o.coupon_code,
             o.shipping_carrier, o.tracking_number, o.shipped_at, o.paid_at, o.notes,
             o.stripe_session_id,
             c.email as customer_email, c.name as customer_name
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      ${where}
      ORDER BY o.id DESC
      LIMIT ?
    `).bind(limit).all();
    return json({ ok: true, orders: rows.results });
  }

  // GET /api/admin/orders/:id
  if (req.method === "GET" && typeof id === "number" && rest === "") {
    const row = await DB.prepare(`
      SELECT
        o.id, o.customer_id, o.status, o.subtotal, o.shipping, o.tax, o.total,
        o.discount_amount, o.coupon_code, o.shipping_carrier, o.tracking_number,
        o.shipped_at, o.paid_at, o.notes, o.stripe_session_id,
        c.email as customer_email, c.name as customer_name,
        ab.id as build_id, ab.cut_length, ab.quantity, ab.fletch_count, ab.price_per_arrow,
        s.brand as shaft_brand, s.model as shaft_model, s.spine as shaft_spine,
        w.name as wrap_name,
        v.brand as vane_brand, v.model as vane_model,
        i.brand as insert_brand, i.model as insert_model,
        p.brand as point_brand, p.model as point_model, p.weight_grains as point_weight, p.type as point_type,
        n.brand as nock_brand, n.model as nock_model
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN arrow_builds ab ON ab.order_id = o.id
      LEFT JOIN shafts s ON s.id = ab.shaft_id
      LEFT JOIN wraps w ON w.id = ab.wrap_id
      LEFT JOIN vanes v ON v.id = ab.vane_id
      LEFT JOIN inserts i ON i.id = ab.insert_id
      LEFT JOIN points p ON p.id = ab.point_id
      LEFT JOIN nocks n ON n.id = ab.nock_id
      WHERE o.id = ?
    `).bind(id).first();

    if (!row) return json({ ok: false, error: "Order not found" }, { status: 404 });

    const messages = await DB.prepare(
      `SELECT id, subject, body, sent_at FROM order_messages WHERE order_id = ? ORDER BY sent_at ASC`
    ).bind(id).all();

    const history = await DB.prepare(
      `SELECT status, changed_at, changed_by FROM order_status_history WHERE order_id = ? ORDER BY changed_at ASC`
    ).bind(id).all();

    return json({ ok: true, order: row, messages: messages.results, history: history.results });
  }

  // PATCH /api/admin/orders/:id  — update status, shipping, notes
  if (req.method === "PATCH" && typeof id === "number" && rest === "") {
    const body: any = await req.json().catch(() => ({}));
    const allowed = ["status", "shipping_carrier", "tracking_number", "shipped_at", "notes"];
    const sets: string[] = [];
    const args: any[] = [];

    for (const key of allowed) {
      if (body[key] === undefined) continue;
      if (key === "status" && !ORDER_STATUSES.includes(body[key])) continue;
      sets.push(`${key} = ?`);
      args.push(body[key]);
    }

    if (sets.length === 0) return json({ ok: false, error: "Nothing to update" }, { status: 400 });

    args.push(id);
    await DB.prepare(`UPDATE orders SET ${sets.join(", ")} WHERE id = ?`).bind(...args).run();

    // Record status change in history
    if (body.status) {
      await DB.prepare(
        `INSERT INTO order_status_history (order_id, status, changed_at, changed_by) VALUES (?, ?, ?, 'admin')`
      ).bind(id, body.status, new Date().toISOString()).run();
    }

    return json({ ok: true });
  }

  // POST /api/admin/orders/:id/mark-paid  — manual pay (cash / Venmo)
  if (req.method === "POST" && typeof id === "number" && rest === "mark-paid") {
    const now = new Date().toISOString();
    const order = await DB.prepare(`SELECT status FROM orders WHERE id = ?`).bind(id).first();
    if (!order) return json({ ok: false, error: "Order not found" }, { status: 404 });
    if (order.status !== "draft") return json({ ok: false, error: "Order is not in draft status" }, { status: 400 });

    await DB.prepare(`UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ?`).bind(now, id).run();
    await DB.prepare(
      `INSERT INTO order_status_history (order_id, status, changed_at, changed_by) VALUES (?, 'paid', ?, 'admin')`
    ).bind(id, now).run();

    return json({ ok: true });
  }

  // POST /api/admin/orders/:id/messages  — send message email to customer
  if (req.method === "POST" && typeof id === "number" && rest === "messages") {
    const body: any = await req.json().catch(() => ({}));
    const subject = String(body.subject || "").trim();
    const msgBody = String(body.body || "").trim();
    if (!subject || !msgBody) return json({ ok: false, error: "subject and body are required" }, { status: 400 });

    const row = await DB.prepare(
      `SELECT c.email, c.name FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = ?`
    ).bind(id).first() as { email: string; name: string } | null;

    if (!row) return json({ ok: false, error: "Order not found" }, { status: 404 });

    // Save to DB first
    const now = new Date().toISOString();
    await DB.prepare(
      `INSERT INTO order_messages (order_id, subject, body, sent_at) VALUES (?, ?, ?, ?)`
    ).bind(id, subject, msgBody, now).run();

    // Send email
    await sendOrderMessage(env, {
      to: row.email,
      name: row.name || "",
      orderId: id,
      subject,
      body: msgBody,
    });

    return json({ ok: true });
  }

  return json({ ok: false, error: "Not found" }, { status: 404 });
}

// ── Customers handler ────────────────────────────────────────────────────────

async function handleCustomers(req: Request, url: URL, id: number | undefined, rest: string, env: any) {
  const DB = env.DB;

  // GET /api/admin/customers
  if (req.method === "GET" && id === undefined) {
    const q = url.searchParams.get("q") || "";
    const where = q ? `WHERE c.email LIKE ? OR c.name LIKE ?` : "";
    const args = q ? [`%${q}%`, `%${q}%`] : [];

    const rows = await DB.prepare(`
      SELECT
        c.id, c.email, c.name,
        COUNT(o.id) as order_count,
        SUM(CASE WHEN o.status NOT IN ('draft','cancelled') THEN o.total ELSE 0 END) as total_spent,
        MAX(o.id) as last_order_id,
        MAX(o.status) as last_order_status
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      ${where}
      GROUP BY c.id
      ORDER BY c.id DESC
      LIMIT 200
    `).bind(...args).all();

    return json({ ok: true, customers: rows.results });
  }

  // GET /api/admin/customers/:id
  if (req.method === "GET" && typeof id === "number" && rest === "") {
    const customer = await DB.prepare(
      `SELECT id, email, name FROM customers WHERE id = ?`
    ).bind(id).first();
    if (!customer) return json({ ok: false, error: "Customer not found" }, { status: 404 });

    const orders = await DB.prepare(`
      SELECT o.id, o.status, o.total, o.paid_at, o.shipping_carrier, o.tracking_number,
             ab.quantity, s.brand as shaft_brand, s.model as shaft_model, s.spine as shaft_spine
      FROM orders o
      LEFT JOIN arrow_builds ab ON ab.order_id = o.id
      LEFT JOIN shafts s ON s.id = ab.shaft_id
      WHERE o.customer_id = ?
      ORDER BY o.id DESC
    `).bind(id).all();

    return json({ ok: true, customer, orders: orders.results });
  }

  return json({ ok: false, error: "Not found" }, { status: 404 });
}

// ── Marketing handler ────────────────────────────────────────────────────────

async function handleMarketing(req: Request, url: URL, id: number | undefined, rest: string, env: any) {
  const DB = env.DB;

  // GET /api/admin/marketing?converted=0
  if (req.method === "GET" && id === undefined) {
    const convertedFilter = url.searchParams.get("converted");
    const where =
      convertedFilter === "0" ? "WHERE converted = 0"
      : convertedFilter === "1" ? "WHERE converted = 1"
      : "";
    const rows = await DB.prepare(`
      SELECT id, email, name, cart_snapshot, coupon_sent, converted, created_at, updated_at
      FROM marketing_leads
      ${where}
      ORDER BY id DESC
      LIMIT 200
    `).all();
    return json({ ok: true, leads: rows.results });
  }

  // POST /api/admin/marketing/:id/coupon — generate coupon + send abandoned cart email
  if (req.method === "POST" && typeof id === "number" && rest === "coupon") {
    const body: any = await req.json().catch(() => ({}));
    const discountAmount = Number(body.discount_amount) || 10;

    const lead = await DB.prepare(
      `SELECT id, email, name, cart_snapshot, coupon_sent FROM marketing_leads WHERE id = ?`
    ).bind(id).first() as any;

    if (!lead) return json({ ok: false, error: "Lead not found" }, { status: 404 });

    // Generate unique coupon code
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(5)))
      .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
      .join("")
      .slice(0, 8);
    const code = `SAVE${discountAmount.toFixed(0)}-${randomPart}`;

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Save coupon
    await DB.prepare(
      `INSERT INTO coupons (code, discount_amount, lead_id, created_at, expires_at) VALUES (?, ?, ?, ?, ?)`
    ).bind(code, discountAmount, id, now, expiresAt).run();

    // Mark lead as coupon_sent
    await DB.prepare(`UPDATE marketing_leads SET coupon_sent = 1, updated_at = ? WHERE id = ?`).bind(now, id).run();

    // Send email
    const cartSnapshot = lead.cart_snapshot ? JSON.parse(lead.cart_snapshot) : null;
    const origin = new URL(req.url).origin;

    await sendAbandonedCartEmail(env, {
      to: lead.email,
      name: lead.name || "",
      cartSnapshot,
      couponCode: code,
      discountAmount,
      siteOrigin: origin,
    });

    return json({ ok: true, code });
  }

  return json({ ok: false, error: "Not found" }, { status: 404 });
}
