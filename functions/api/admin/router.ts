import { requireAccess } from "./auth";

function json(data: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json; charset=utf-8", ...(init.headers || {}) },
  });
}

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return crypto.randomUUID();
}

export async function handleAdmin(req: Request, env: any, ctx: ExecutionContext) {
  // Require Access for ALL admin API calls
  const gate = await requireAccess(req, env);
  if (!gate.ok) return gate.res;

  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api\/admin/, "") || "/";

  // GET /products?category=&q=
  if (req.method === "GET" && path === "/products") {
    const category = url.searchParams.get("category");
    const q = url.searchParams.get("q");

    let sql = `SELECT * FROM products WHERE 1=1`;
    const args: any[] = [];

    if (category) {
      sql += ` AND category = ?`;
      args.push(category);
    }
    if (q) {
      sql += ` AND (name LIKE ? OR brand LIKE ? OR sku LIKE ?)`;
      const like = `%${q}%`;
      args.push(like, like, like);
    }
    sql += ` ORDER BY updated_at DESC LIMIT 200`;

    const rows = await env.DB.prepare(sql).bind(...args).all();
    return json({ ok: true, items: rows.results });
  }

  // POST /products
  if (req.method === "POST" && path === "/products") {
    const body = await req.json();
    const id = uid();
    const created_at = nowIso();

    const category = String(body.category || "");
    const brand = String(body.brand || "");
    const name = String(body.name || "");
    const sku = body.sku ? String(body.sku) : null;
    const price_cents = Number(body.price_cents || 0);
    const is_active = body.is_active === false ? 0 : 1;
    const specs_json = JSON.stringify(body.specs || {});

    if (!category || !brand || !name) {
      return json({ ok: false, error: "category, brand, and name are required" }, { status: 400 });
    }

    await env.DB.prepare(
      `INSERT INTO products (id, category, brand, name, sku, price_cents, is_active, specs_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, category, brand, name, sku, price_cents, is_active, specs_json, created_at, created_at)
      .run();

    return json({ ok: true, id });
  }

  // PATCH /products/:id
  const patchMatch = path.match(/^\/products\/([^/]+)$/);
  if (req.method === "PATCH" && patchMatch) {
    const id = patchMatch[1];
    const body = await req.json();

    // Simple patch set
    const fields: string[] = [];
    const args: any[] = [];

    const allow = ["category", "brand", "name", "sku", "price_cents", "is_active", "specs_json"];
    for (const k of allow) {
      if (body[k] === undefined) continue;
      fields.push(`${k} = ?`);
      if (k === "specs_json") args.push(String(body[k]));
      else args.push(body[k]);
    }

    // Support specs object too
    if (body.specs && body.specs_json === undefined) {
      fields.push(`specs_json = ?`);
      args.push(JSON.stringify(body.specs));
    }

    fields.push(`updated_at = ?`);
    args.push(nowIso());
    args.push(id);

    if (fields.length === 1) {
      return json({ ok: false, error: "No fields to update" }, { status: 400 });
    }

    await env.DB.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).bind(...args).run();
    return json({ ok: true });
  }

  // DELETE /products/:id
  const delMatch = path.match(/^\/products\/([^/]+)$/);
  if (req.method === "DELETE" && delMatch) {
    const id = delMatch[1];
    await env.DB.prepare(`DELETE FROM product_images WHERE product_id = ?`).bind(id).run();
    await env.DB.prepare(`DELETE FROM products WHERE id = ?`).bind(id).run();
    return json({ ok: true });
  }

  // POST /products/:id/images  (multipart form-data: file)
  const imgMatch = path.match(/^\/products\/([^/]+)\/images$/);
  if (req.method === "POST" && imgMatch) {
    const productId = imgMatch[1];
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return json({ ok: false, error: "Expected file field named 'file'" }, { status: 400 });
    }

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const key = `products/${productId}/${uid()}.${ext}`;

    // Store in R2
    await env.PRODUCT_IMAGES.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    const imgId = uid();
    await env.DB.prepare(
      `INSERT INTO product_images (id, product_id, r2_key, alt, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(imgId, productId, key, file.name, 0, nowIso())
      .run();

    return json({
      ok: true,
      image: {
        id: imgId,
        r2_key: key,
        // If you serve images via /api/images/:key, return that:
        url: `/api/images/${encodeURIComponent(key)}`,
      },
    });
  }

  return json({ ok: false, error: "Not found" }, { status: 404 });
}
