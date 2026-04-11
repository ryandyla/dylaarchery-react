// GET /api/member/recommend?bow_id=X
// Returns arrow recommendations based on bow specs and member interests.

import { getMember, json, unauthorized } from "../../_utils/member-auth";

// ── Spine selection ───────────────────────────────────────────────────────────
// AMO/ATA-based: lower spine number = stiffer = for heavier draw weights.
// Adjustments: +2 lbs per inch of arrow length over 28", lighter point = weaker spine ok.

function idealSpine(drawWeight: number, arrowLength: number, pointGrains = 100): number {
  const lengthAdj = (arrowLength - 28) * 2;      // longer arrow needs stiffer
  const pointAdj  = (pointGrains - 100) / 25 * 3; // heavier point needs stiffer
  const adjusted  = drawWeight + lengthAdj + pointAdj;

  if (adjusted <= 35)  return 700;
  if (adjusted <= 42)  return 600;
  if (adjusted <= 50)  return 500;
  if (adjusted <= 55)  return 450;
  if (adjusted <= 60)  return 400;
  if (adjusted <= 65)  return 350;
  if (adjusted <= 70)  return 300;
  if (adjusted <= 75)  return 250;
  if (adjusted <= 82)  return 200;
  return 150;
}

// Return the spine groups the member's setup could work with (ideal ± one group)
const SPINE_LADDER = [150, 175, 200, 250, 300, 340, 350, 400, 450, 500, 550, 600, 700, 800, 900, 1000, 1200, 1400];

function spineRange(ideal: number): { min: number; max: number } {
  const idx = SPINE_LADDER.reduce((best, s, i) =>
    Math.abs(s - ideal) < Math.abs(SPINE_LADDER[best] - ideal) ? i : best, 0);
  const lo = SPINE_LADDER[Math.max(0, idx - 1)];
  const hi = SPINE_LADDER[Math.min(SPINE_LADDER.length - 1, idx + 1)];
  return { min: lo, max: hi };
}

// ── Purpose config ────────────────────────────────────────────────────────────

type Purpose = "hunting" | "target" | "3d" | "tac";

const PURPOSE_CONFIG: Record<Purpose, {
  label: string;
  gpp: { min: number; max: number };    // grains per pound of draw weight
  foc: string;                           // target FOC range description
  keMin: number;                         // minimum useful KE (ft-lbs)
  note: string;
}> = {
  hunting: {
    label: "Hunting",
    gpp: { min: 6, max: 9 },
    foc: "10–15%",
    keMin: 40,
    note: "Heavier arrows carry more kinetic energy and momentum for ethical penetration.",
  },
  target: {
    label: "Target",
    gpp: { min: 5, max: 6.5 },
    foc: "7–10%",
    keMin: 0,
    note: "Lighter arrows fly flatter and faster, maximizing precision at distance.",
  },
  "3d": {
    label: "3D",
    gpp: { min: 5.5, max: 7 },
    foc: "8–12%",
    keMin: 0,
    note: "Balanced weight for accuracy across varied distances with realistic trajectory.",
  },
  tac: {
    label: "TAC",
    gpp: { min: 7, max: 10 },
    foc: "12–18%",
    keMin: 50,
    note: "Maximum weight for stability and downrange energy at extreme distances.",
  },
};

// ── Physics ───────────────────────────────────────────────────────────────────

// IBO standard: 70 lb, 30" draw, 350gr arrow
function estimatedFps(ibo: number, drawWeight: number, drawLength: number, arrowGrains: number): number {
  return ibo
    + (drawWeight - 70) * 2.5   // ±2.5fps per lb
    + (drawLength - 30) * 3     // ±3fps per inch
    - (arrowGrains - 350) / 3;  // -1fps per 3gr over 350
}

function kineticEnergy(grains: number, fps: number): number {
  return (grains * fps * fps) / 450240;
}

function momentum(grains: number, fps: number): number {
  return (grains * fps) / 225400; // slug·ft/s
}

// ── Handler ───────────────────────────────────────────────────────────────────

export const onRequestGet = async ({ request, env }: any) => {
  const auth = await getMember(request, env);
  if (!auth) return unauthorized();

  const url = new URL(request.url);
  const bowId = parseInt(url.searchParams.get("bow_id") ?? "");
  if (!bowId) return json({ ok: false, error: "bow_id required" }, { status: 400 });

  // Load bow (verify ownership)
  const bow = await env.DB.prepare(
    `SELECT * FROM bows WHERE id = ? AND member_id = ?`
  ).bind(bowId, auth.member.id).first() as any;
  if (!bow) return json({ ok: false, error: "Bow not found" }, { status: 404 });

  const drawWeight: number = bow.draw_weight ?? 70;
  const drawLength: number = bow.draw_length ?? 29;
  const ibo: number = bow.ibo_speed ?? 0;

  // Arrow length = draw length + 0.5" (shaft extends just past rest)
  const arrowLength = drawLength + 0.5;

  // Spine selection
  const ideal   = idealSpine(drawWeight, arrowLength);
  const { min: spineMin, max: spineMax } = spineRange(ideal);

  // Pull matching shafts from catalog
  const shaftRows = await env.DB.prepare(
    `SELECT id, brand, model, spine, gpi, inner_diameter, outer_diameter, max_length, price_per_shaft
     FROM shafts
     WHERE spine >= ? AND spine <= ? AND active = 1
     ORDER BY spine ASC, brand ASC, model ASC`
  ).bind(spineMin, spineMax).all();
  const shafts = shaftRows.results as any[];

  // Member interests
  const interests: Purpose[] = auth.member.interests
    ? (JSON.parse(auth.member.interests) as string[]).filter((i): i is Purpose => i in PURPOSE_CONFIG)
    : [];
  const activePurposes = interests.length > 0 ? interests : (["hunting"] as Purpose[]);

  // Per-purpose calculations
  const byPurpose: Record<string, any> = {};
  for (const purpose of activePurposes) {
    const cfg = PURPOSE_CONFIG[purpose];
    const minWeight = Math.round(cfg.gpp.min * drawWeight);
    const maxWeight = Math.round(cfg.gpp.max * drawWeight);
    const midWeight = Math.round((minWeight + maxWeight) / 2);

    const fpsMin = ibo > 0 ? Math.round(estimatedFps(ibo, drawWeight, drawLength, maxWeight)) : null;
    const fpsMax = ibo > 0 ? Math.round(estimatedFps(ibo, drawWeight, drawLength, minWeight)) : null;
    const fpsMid = ibo > 0 ? Math.round(estimatedFps(ibo, drawWeight, drawLength, midWeight)) : null;

    const keMin = fpsMin != null ? Math.round(kineticEnergy(maxWeight, fpsMin) * 10) / 10 : null;
    const keMax = fpsMax != null ? Math.round(kineticEnergy(minWeight, fpsMax) * 10) / 10 : null;
    const momMid = fpsMid != null ? Math.round(momentum(midWeight, fpsMid) * 1000) / 1000 : null;

    byPurpose[purpose] = {
      label: cfg.label,
      arrow_weight: { min: minWeight, max: maxWeight },
      gpp: cfg.gpp,
      foc_target: cfg.foc,
      fps: fpsMin != null ? { min: fpsMin, max: fpsMax } : null,
      ke: keMin != null ? { min: Math.min(keMin, keMax!), max: Math.max(keMin, keMax!) } : null,
      ke_adequate: keMin != null ? keMin >= cfg.keMin : null,
      momentum: momMid,
      note: cfg.note,
    };
  }

  // Tag each shaft with fit quality
  const taggedShafts = shafts.map((s) => ({
    ...s,
    fit: s.spine === ideal ? "ideal" : "compatible",
  }));

  return json({
    ok: true,
    bow: {
      id: bow.id,
      nickname: bow.nickname,
      brand: bow.brand,
      model: bow.model,
      bow_type: bow.bow_type,
      draw_weight: drawWeight,
      draw_length: drawLength,
      ibo_speed: bow.ibo_speed,
    },
    inputs: {
      arrow_length: arrowLength,
      ideal_spine: ideal,
      spine_range: { min: spineMin, max: spineMax },
    },
    by_purpose: byPurpose,
    shafts: taggedShafts,
  });
};
