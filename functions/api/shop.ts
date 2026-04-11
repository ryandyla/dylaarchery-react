// GET /api/shop — public catalog with pack pricing for storefront

import { allRows } from "../_utils/db";

const round2 = (n: number) => Math.round(n * 100) / 100;

function isLightedNock(model: string): boolean {
  return /lighted/i.test(model);
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(row);
  }
  return map;
}

// Returns all image URLs for the given product IDs (deduped by URL, primary first).
function collectImages(images: any[], type: string, ids: number[]): string[] {
  const idSet = new Set(ids);
  const seen = new Set<string>();
  const collected: { url: string; is_primary: number; sort: number }[] = [];
  for (const img of images) {
    if (img.product_type !== type || !idSet.has(img.product_id) || seen.has(img.url)) continue;
    seen.add(img.url);
    collected.push({ url: img.url, is_primary: img.is_primary ?? 0, sort: img.sort ?? 0 });
  }
  collected.sort((a, b) => (b.is_primary - a.is_primary) || (a.sort - b.sort));
  return collected.map((c) => c.url);
}

export const onRequestGet = async ({ env }: any) => {
  const DB = env.DB;

  const [shafts, nocks, vanes, wraps, points, images] = await Promise.all([
    allRows(DB.prepare(
      `SELECT id, brand, model, spine, gpi, outer_diameter, inner_diameter, max_length, price_per_shaft
       FROM shafts WHERE active = 1 ORDER BY brand, model, spine`
    )),
    allRows(DB.prepare(
      `SELECT id, brand, model, system, style, price_per_arrow, weight_grains
       FROM nocks WHERE active = 1 ORDER BY brand, model`
    )),
    allRows(DB.prepare(
      `SELECT id, brand, model, length, height, weight_grains, price_per_arrow
       FROM vanes WHERE active = 1 ORDER BY brand, model, length`
    )),
    allRows(DB.prepare(
      `SELECT id, name, length, min_outer_diameter, max_outer_diameter, price_per_arrow, weight_grains
       FROM wraps WHERE active = 1 ORDER BY name`
    )),
    allRows(DB.prepare(
      `SELECT id, type, brand, model, weight_grains, thread, price
       FROM points WHERE active = 1 ORDER BY type, brand, model, weight_grains`
    )),
    allRows(DB.prepare(
      `SELECT product_type, product_id, url, is_primary, sort
       FROM product_images WHERE active = 1 ORDER BY is_primary DESC, sort ASC, id ASC`
    )),
  ]);

  const SHAFT_PACK = 12;
  const NOCK_PACK_STD = 12;
  const NOCK_PACK_LIGHTED = 3;
  const VANE_PACK = 36;
  const WRAP_PACK = 13;
  const FIELD_POINT_PACK = 12;
  const BROADHEAD_PACK = 3;

  // ── Shaft groups ──────────────────────────────────────────────────────────
  const shaft_groups = Array.from(
    groupBy(shafts as any[], (s) => `${s.brand}||${s.model}`).values()
  ).map((rows) => {
    const first = rows[0];
    const ids = rows.map((r) => r.id);
    return {
      brand: first.brand,
      name: `${first.brand} ${first.model}`,
      pack_qty: SHAFT_PACK,
      image_urls: collectImages(images, "shaft", ids),
      variants: rows.map((s) => ({
        id: s.id,
        label: String(s.spine),
        sublabel: [s.gpi ? `${s.gpi} GPI` : null, s.outer_diameter ? `OD ${s.outer_diameter}"` : null, s.max_length ? `Max ${s.max_length}"` : null].filter(Boolean).join(" · "),
        pack_price: round2(Number(s.price_per_shaft) * SHAFT_PACK),
        unit_price: Number(s.price_per_shaft),
      })),
    };
  });

  // ── Vane groups ───────────────────────────────────────────────────────────
  const vane_groups = Array.from(
    groupBy(vanes as any[], (v) => `${v.brand}||${v.model}`).values()
  ).map((rows) => {
    const first = rows[0];
    const ids = rows.map((r) => r.id);
    return {
      brand: first.brand,
      name: `${first.brand} ${first.model}`,
      pack_qty: VANE_PACK,
      image_urls: collectImages(images, "vane", ids),
      variants: rows.map((v) => ({
        id: v.id,
        label: `${v.length}"`,
        sublabel: [v.height ? `H ${v.height}"` : null, v.weight_grains ? `${v.weight_grains} gr` : null].filter(Boolean).join(" · "),
        pack_price: round2(Number(v.price_per_arrow) * 12),
        unit_price: Number(v.price_per_arrow),
      })),
    };
  });

  // ── Field point groups ────────────────────────────────────────────────────
  const field_point_groups = Array.from(
    groupBy((points as any[]).filter((p) => p.type === "field"), (p) => `${p.brand || ""}||${p.model || ""}`).values()
  ).map((rows) => {
    const first = rows[0];
    const ids = rows.map((r) => r.id);
    return {
      brand: first.brand || "Field Point",
      name: (`${first.brand || ""} ${first.model || ""}`).trim() || "Field Point",
      pack_qty: FIELD_POINT_PACK,
      image_urls: collectImages(images, "point", ids),
      variants: rows.map((p) => ({
        id: p.id,
        label: p.weight_grains ? `${p.weight_grains} gr` : "?",
        sublabel: p.thread ? `${p.thread} thread` : "",
        pack_price: round2(Number(p.price) * FIELD_POINT_PACK),
        unit_price: Number(p.price),
      })),
    };
  });

  // ── Broadhead groups ──────────────────────────────────────────────────────
  const broadhead_groups = Array.from(
    groupBy((points as any[]).filter((p) => p.type === "broadhead"), (p) => `${p.brand || ""}||${p.model || ""}`).values()
  ).map((rows) => {
    const first = rows[0];
    const ids = rows.map((r) => r.id);
    return {
      brand: first.brand || "Broadhead",
      name: (`${first.brand || ""} ${first.model || ""}`).trim() || "Broadhead",
      pack_qty: BROADHEAD_PACK,
      image_urls: collectImages(images, "point", ids),
      variants: rows.map((p) => ({
        id: p.id,
        label: p.weight_grains ? `${p.weight_grains} gr` : "?",
        sublabel: p.thread ? `${p.thread} thread` : "",
        pack_price: round2(Number(p.price) * BROADHEAD_PACK),
        unit_price: Number(p.price),
      })),
    };
  });

  // ── Flat products ─────────────────────────────────────────────────────────
  const nock_products = (nocks as any[]).map((s) => {
    const lighted = isLightedNock(s.model);
    const pack_qty = lighted ? NOCK_PACK_LIGHTED : NOCK_PACK_STD;
    return {
      id: s.id, brand: s.brand,
      name: `${s.brand} ${s.model}`,
      meta: [s.system, s.style, s.weight_grains ? `${s.weight_grains} gr` : null].filter(Boolean).join(" · "),
      pack_qty, pack_price: round2(Number(s.price_per_arrow) * pack_qty),
      unit_price: Number(s.price_per_arrow), lighted,
      image_urls: collectImages(images, "nock", [s.id]),
    };
  });

  const wrap_products = (wraps as any[]).map((s) => ({
    id: s.id, brand: "Wrap", name: s.name,
    meta: [s.length ? `${s.length}"` : null, s.min_outer_diameter && s.max_outer_diameter ? `OD ${s.min_outer_diameter}–${s.max_outer_diameter}"` : null].filter(Boolean).join(" · "),
    pack_qty: WRAP_PACK, pack_price: round2(Number(s.price_per_arrow) * WRAP_PACK),
    unit_price: Number(s.price_per_arrow),
    image_urls: collectImages(images, "wrap", [s.id]),
  }));

  return new Response(
    JSON.stringify({ ok: true, shaft_groups, vane_groups, field_point_groups, broadhead_groups, nocks: nock_products, wraps: wrap_products }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
};
