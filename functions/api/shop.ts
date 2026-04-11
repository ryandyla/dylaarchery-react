// GET /api/shop — public catalog with pack pricing for storefront

import { allRows } from "../_utils/db";

const round2 = (n: number) => Math.round(n * 100) / 100;

function primaryImage(images: any[], type: string, id: number): string | null {
  const matches = images.filter((i) => i.product_type === type && i.product_id === id);
  if (!matches.length) return null;
  const primary = matches.find((i) => i.is_primary) ?? matches[0];
  return primary.url;
}

function isLightedNock(model: string): boolean {
  return /lighted/i.test(model);
}

// Group an array of rows by a key function, preserving insertion order.
function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(row);
  }
  return map;
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
      `SELECT product_type, product_id, url, is_primary FROM product_images WHERE active = 1 ORDER BY sort ASC, id ASC`
    )),
  ]);

  const SHAFT_PACK = 12;
  const NOCK_PACK_STD = 12;
  const NOCK_PACK_LIGHTED = 3;
  const VANE_PACK = 36;   // price_per_arrow covers 3 vanes → ×12 arrows = 36 vanes
  const WRAP_PACK = 13;
  const FIELD_POINT_PACK = 12;
  const BROADHEAD_PACK = 3;

  // ── Shaft groups (brand+model, variant = spine) ───────────────────────────
  const shaftGroupMap = groupBy(shafts as any[], (s) => `${s.brand}||${s.model}`);
  const shaft_groups = Array.from(shaftGroupMap.values()).map((rows) => {
    const first = rows[0];
    let image_url: string | null = null;
    const variants = rows.map((s) => {
      const img = primaryImage(images, "shaft", s.id);
      if (!image_url && img) image_url = img;
      return {
        id: s.id,
        label: String(s.spine),
        sublabel: [s.gpi ? `${s.gpi} GPI` : null, s.outer_diameter ? `OD ${s.outer_diameter}"` : null, s.max_length ? `Max ${s.max_length}"` : null].filter(Boolean).join(" · "),
        pack_price: round2(Number(s.price_per_shaft) * SHAFT_PACK),
        unit_price: Number(s.price_per_shaft),
      };
    });
    return { brand: first.brand, name: `${first.brand} ${first.model}`, pack_qty: SHAFT_PACK, image_url, variants };
  });

  // ── Vane groups (brand+model, variant = length) ───────────────────────────
  const vaneGroupMap = groupBy(vanes as any[], (v) => `${v.brand}||${v.model}`);
  const vane_groups = Array.from(vaneGroupMap.values()).map((rows) => {
    const first = rows[0];
    let image_url: string | null = null;
    const variants = rows.map((v) => {
      const img = primaryImage(images, "vane", v.id);
      if (!image_url && img) image_url = img;
      return {
        id: v.id,
        label: `${v.length}"`,
        sublabel: [v.height ? `H ${v.height}"` : null, v.weight_grains ? `${v.weight_grains} gr` : null].filter(Boolean).join(" · "),
        pack_price: round2(Number(v.price_per_arrow) * 12), // ×12 = 36 vanes
        unit_price: Number(v.price_per_arrow),
      };
    });
    return { brand: first.brand, name: `${first.brand} ${first.model}`, pack_qty: VANE_PACK, image_url, variants };
  });

  // ── Field point groups (brand+model, variant = weight) ───────────────────
  const fieldPointMap = groupBy(
    (points as any[]).filter((p) => p.type === "field"),
    (p) => `${p.brand || ""}||${p.model || ""}`
  );
  const field_point_groups = Array.from(fieldPointMap.values()).map((rows) => {
    const first = rows[0];
    let image_url: string | null = null;
    const variants = rows.map((p) => {
      const img = primaryImage(images, "point", p.id);
      if (!image_url && img) image_url = img;
      return {
        id: p.id,
        label: p.weight_grains ? `${p.weight_grains} gr` : "?",
        sublabel: p.thread ? `${p.thread} thread` : "",
        pack_price: round2(Number(p.price) * FIELD_POINT_PACK),
        unit_price: Number(p.price),
      };
    });
    const displayName = (`${first.brand || ""} ${first.model || ""}`).trim() || "Field Point";
    return { brand: first.brand || "Field Point", name: displayName, pack_qty: FIELD_POINT_PACK, image_url, variants };
  });

  // ── Broadhead groups (brand+model, variant = weight) ─────────────────────
  const broadheadMap = groupBy(
    (points as any[]).filter((p) => p.type === "broadhead"),
    (p) => `${p.brand || ""}||${p.model || ""}`
  );
  const broadhead_groups = Array.from(broadheadMap.values()).map((rows) => {
    const first = rows[0];
    let image_url: string | null = null;
    const variants = rows.map((p) => {
      const img = primaryImage(images, "point", p.id);
      if (!image_url && img) image_url = img;
      return {
        id: p.id,
        label: p.weight_grains ? `${p.weight_grains} gr` : "?",
        sublabel: p.thread ? `${p.thread} thread` : "",
        pack_price: round2(Number(p.price) * BROADHEAD_PACK),
        unit_price: Number(p.price),
      };
    });
    const displayName = (`${first.brand || ""} ${first.model || ""}`).trim() || "Broadhead";
    return { brand: first.brand || "Broadhead", name: displayName, pack_qty: BROADHEAD_PACK, image_url, variants };
  });

  // ── Flat products (nocks, wraps) ─────────────────────────────────────────
  const nock_products = (nocks as any[]).map((s) => {
    const lighted = isLightedNock(s.model);
    const pack_qty = lighted ? NOCK_PACK_LIGHTED : NOCK_PACK_STD;
    return {
      id: s.id, brand: s.brand,
      name: `${s.brand} ${s.model}`,
      meta: [s.system, s.style, s.weight_grains ? `${s.weight_grains} gr` : null].filter(Boolean).join(" · "),
      pack_qty, pack_price: round2(Number(s.price_per_arrow) * pack_qty),
      unit_price: Number(s.price_per_arrow), lighted,
      image_url: primaryImage(images, "nock", s.id),
    };
  });

  const wrap_products = (wraps as any[]).map((s) => ({
    id: s.id, brand: "Wrap",
    name: s.name,
    meta: [s.length ? `${s.length}"` : null, s.min_outer_diameter && s.max_outer_diameter ? `OD ${s.min_outer_diameter}–${s.max_outer_diameter}"` : null].filter(Boolean).join(" · "),
    pack_qty: WRAP_PACK, pack_price: round2(Number(s.price_per_arrow) * WRAP_PACK),
    unit_price: Number(s.price_per_arrow),
    image_url: primaryImage(images, "wrap", s.id),
  }));

  return new Response(
    JSON.stringify({
      ok: true,
      shaft_groups,
      vane_groups,
      field_point_groups,
      broadhead_groups,
      nocks: nock_products,
      wraps: wrap_products,
    }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
};
