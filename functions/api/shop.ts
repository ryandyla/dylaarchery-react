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

export const onRequestGet = async ({ env }: any) => {
  const DB = env.DB;

  const [shafts, nocks, vanes, wraps, points, images] = await Promise.all([
    allRows(DB.prepare(
      `SELECT id, brand, model, spine, gpi, outer_diameter, max_length, price_per_shaft
       FROM shafts WHERE active = 1 ORDER BY brand, model, spine`
    )),
    allRows(DB.prepare(
      `SELECT id, brand, model, system, style, price_per_arrow, weight_grains
       FROM nocks WHERE active = 1 ORDER BY brand, model`
    )),
    allRows(DB.prepare(
      `SELECT id, brand, model, length, height, weight_grains, price_per_arrow
       FROM vanes WHERE active = 1 ORDER BY brand, model`
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
  const VANE_PACK = 36; // price_per_arrow covers 3 vanes → ×12 = 36 vanes
  const WRAP_PACK = 13;
  const FIELD_POINT_PACK = 12;
  const BROADHEAD_PACK = 3;

  // ── Group shafts by brand+model ──────────────────────────────────────────────
  const shaftGroupMap = new Map<string, any>();
  for (const s of shafts as any[]) {
    const key = `${s.brand}||${s.model}`;
    if (!shaftGroupMap.has(key)) {
      shaftGroupMap.set(key, {
        brand: s.brand,
        model: s.model,
        pack_qty: SHAFT_PACK,
        image_url: null as string | null,
        variants: [] as any[],
      });
    }
    const group = shaftGroupMap.get(key);
    const img = primaryImage(images, "shaft", s.id);
    if (!group.image_url && img) group.image_url = img;
    group.variants.push({
      id: s.id,
      spine: s.spine,
      gpi: s.gpi,
      outer_diameter: s.outer_diameter,
      max_length: s.max_length,
      unit_price: Number(s.price_per_shaft),
      pack_price: round2(Number(s.price_per_shaft) * SHAFT_PACK),
    });
  }
  const shaft_groups = Array.from(shaftGroupMap.values());

  // ── Individual items ─────────────────────────────────────────────────────────
  const nockProducts = (nocks as any[]).map((s) => {
    const lighted = isLightedNock(s.model);
    const pack_qty = lighted ? NOCK_PACK_LIGHTED : NOCK_PACK_STD;
    return {
      ...s,
      lighted,
      pack_qty,
      pack_price: round2(Number(s.price_per_arrow) * pack_qty),
      image_url: primaryImage(images, "nock", s.id),
    };
  });

  const vaneProducts = (vanes as any[]).map((s) => ({
    ...s,
    pack_qty: VANE_PACK,
    pack_price: round2(Number(s.price_per_arrow) * 12), // 3 vanes/arrow × 12 arrows = 36
    image_url: primaryImage(images, "vane", s.id),
  }));

  const wrapProducts = (wraps as any[]).map((s) => ({
    ...s,
    pack_qty: WRAP_PACK,
    pack_price: round2(Number(s.price_per_arrow) * WRAP_PACK),
    image_url: primaryImage(images, "wrap", s.id),
  }));

  const fieldPoints = (points as any[])
    .filter((p) => p.type === "field")
    .map((p) => ({
      ...p,
      pack_qty: FIELD_POINT_PACK,
      pack_price: round2(Number(p.price) * FIELD_POINT_PACK),
      image_url: primaryImage(images, "point", p.id),
    }));

  const broadheads = (points as any[])
    .filter((p) => p.type === "broadhead")
    .map((p) => ({
      ...p,
      pack_qty: BROADHEAD_PACK,
      pack_price: round2(Number(p.price) * BROADHEAD_PACK),
      image_url: primaryImage(images, "point", p.id),
    }));

  return new Response(
    JSON.stringify({
      ok: true,
      shaft_groups,
      nocks: nockProducts,
      vanes: vaneProducts,
      wraps: wrapProducts,
      field_points: fieldPoints,
      broadheads,
    }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
};
