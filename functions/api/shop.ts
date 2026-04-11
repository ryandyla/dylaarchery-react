// GET /api/shop — public catalog with pack pricing for storefront

import { allRows } from "../_utils/db";

const round2 = (n: number) => Math.round(n * 100) / 100;

function primaryImage(images: any[], type: string, id: number): string | null {
  const matches = images.filter((i) => i.product_type === type && i.product_id === id);
  if (!matches.length) return null;
  const primary = matches.find((i) => i.is_primary) ?? matches[0];
  return primary.url;
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

  // Pack sizes
  const SHAFT_PACK = 12;
  const NOCK_PACK = 12;
  const VANE_PACK = 36; // price_per_arrow covers 3 vanes, so ×12 arrows = 36 vanes
  const WRAP_PACK = 13;
  const FIELD_POINT_PACK = 12;
  const BROADHEAD_PACK = 3;

  const shaftProducts = shafts.map((s: any) => ({
    ...s,
    pack_qty: SHAFT_PACK,
    pack_price: round2(Number(s.price_per_shaft) * SHAFT_PACK),
    image_url: primaryImage(images, "shaft", s.id),
  }));

  const nockProducts = nocks.map((s: any) => ({
    ...s,
    pack_qty: NOCK_PACK,
    pack_price: round2(Number(s.price_per_arrow) * NOCK_PACK),
    image_url: primaryImage(images, "nock", s.id),
  }));

  const vaneProducts = vanes.map((s: any) => ({
    ...s,
    pack_qty: VANE_PACK,
    // price_per_arrow = cost of 3 vanes on one arrow → ×12 = 36 vanes
    pack_price: round2(Number(s.price_per_arrow) * 12),
    image_url: primaryImage(images, "vane", s.id),
  }));

  const wrapProducts = wraps.map((s: any) => ({
    ...s,
    pack_qty: WRAP_PACK,
    pack_price: round2(Number(s.price_per_arrow) * WRAP_PACK),
    image_url: primaryImage(images, "wrap", s.id),
  }));

  const fieldPoints = points
    .filter((p: any) => p.type === "field")
    .map((p: any) => ({
      ...p,
      pack_qty: FIELD_POINT_PACK,
      pack_price: round2(Number(p.price) * FIELD_POINT_PACK),
      image_url: primaryImage(images, "point", p.id),
    }));

  const broadheads = points
    .filter((p: any) => p.type === "broadhead")
    .map((p: any) => ({
      ...p,
      pack_qty: BROADHEAD_PACK,
      pack_price: round2(Number(p.price) * BROADHEAD_PACK),
      image_url: primaryImage(images, "point", p.id),
    }));

  return new Response(
    JSON.stringify({
      ok: true,
      shafts: shaftProducts,
      nocks: nockProducts,
      vanes: vaneProducts,
      wraps: wrapProducts,
      field_points: fieldPoints,
      broadheads,
    }),
    { headers: { "content-type": "application/json", "cache-control": "no-store" } }
  );
};
