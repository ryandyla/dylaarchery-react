// src/ArrowBuilderPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * READY-TO-PASTE ArrowBuilderPage.tsx
 *
 * Goals:
 * - Only SHAFT is required.
 * - Everything else optional: cut, wrap, vanes (0/3/4), insert, point.
 * - Quantity is ONLY 6 or 12 (no other qty allowed).
 * - Pricing calls the API with nullable component ids.
 *
 * Notes:
 * - This file expects your existing endpoints:
 *   - GET  /api/builder/catalog
 *   - POST /api/builder/price
 *   - POST /api/builder/draft
 * - If your backend still REQUIRES vane/point/cut_length, it will return errors.
 *   This UI is now correctly “all optional”.
 */

// ---------------------- Types ----------------------

type Shaft = {
  id: number;
  brand: string;
  model: string;
  spine: number;
  gpi: number;
  inner_diameter: number;
  outer_diameter: number;
  max_length: number;
  straightness?: string | null;
  price_per_shaft: number;
};

type Wrap = {
  id: number;
  name: string;
  length: number;
  min_outer_diameter: number;
  max_outer_diameter: number;
  weight_grains: number;      // ✅ NEW
  price_per_arrow: number;
};

type Vane = {
  id: number;
  brand: string;
  model: string;
  length?: number;
  height?: number;
  weight_grains?: number;
  profile?: string | null;
  compatible_micro: number; // 0/1
  price_per_arrow: number;
};

type Point = {
  id: number;
  type: "field" | "broadhead";
  brand?: string | null;
  model?: string | null;
  weight_grains: number;
  thread?: string | null;
  price: number;
};

type Insert = {
  id: number;
  brand: string;
  model: string;
  system: string;
  type: string;
  weight_grains: number;
  price_per_arrow: number;
  requires_collar: number; // 0/1
  collar_weight_grains: number | null;
  collar_price_per_arrow: number | null;
};

type Nock = {
  id: number;
  brand: string;
  model: string;
  system: string;
  style: string;
  weight_grains: number;      
  price_per_arrow: number;
};

type ProductType = "shaft" | "wrap" | "vane" | "point" | "insert" | "nock";

type ProductImage = {
  id: number;
  product_type: ProductType;
  product_id: number;
  url: string;
  alt?: string | null;
  sort: number;              // your column name
  is_primary?: number;       // 0/1 if you have it; optional
};

type CatalogResponse = {
  ok: true;
  shafts: Shaft[];
  wraps: Wrap[];
  vanes: Vane[];
  points: Point[];
  inserts: Insert[];
  nocks: Nock[];
  product_images: ProductImage[];   // ✅ add this
};

type PriceResponse =
  | {
      ok: true;
      price: { per_arrow: number; subtotal: number };
      build: Record<string, any>;
    }
  | { ok: false; field?: string; message: string };

type DraftResponse =
  | { ok: true; order_id: number; build_id: number; status: string; price: { per_arrow: number; subtotal: number } }
  | { ok: false; field?: string; message: string };

// ---------------------- Builder state ----------------------

type BuilderState = {
  shaft_id?: number;

  cut_mode: "uncut" | "cut";
  cut_length: number | null;

  nock_id: number | null;
  wrap_id: number | null;

  vane_id: number | null;
  fletch_count: 0 | 3 | 4;
  vane_primary_color?: VaneColor | null;
  vane_secondary_color?: VaneColor | null;

  insert_id: number | null;
  point_id: number | null;

  quantity: 6 | 12;
};

const DEFAULT_STATE: BuilderState = {
  cut_mode: "uncut",
  cut_length: null,

  nock_id: null,
  wrap_id: null,

  vane_id: null,
  fletch_count: 0,
  vane_primary_color: null,
  vane_secondary_color: null,

  insert_id: null,
  point_id: null,

  quantity: 6,
};

const API = {
  catalog: "/api/builder/catalog",
  price: "/api/builder/price",
  draft: "/api/builder/draft",
};

// UX constants
const CUT_STEP = 0.25;

const VANE_COLORS = [
  "White",
  "Blue",
  "Teal",
  "Green (Fluorescent)",
  "Pink (Fluorescent)",
  "Orange (Fluorescent)",
  "Yellow (Fluorescent)",
  "Red (Fluorescent)",
  "Purple",
  "Black",
] as const;

type VaneColor = (typeof VANE_COLORS)[number];


// ---------------------- Helpers ----------------------

function formatMoney(n?: number) {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: any;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function groupShafts(shafts: Shaft[]) {
  const map = new Map<string, Shaft[]>();
  for (const s of shafts) {
    const key = `${s.brand} ${s.model}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    key,
    items: items.slice().sort((a, b) => a.spine - b.spine),
  }));
}

// ---------------------- Page ----------------------

export default function ArrowBuilderPage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [state, setState] = useState<BuilderState>({ ...DEFAULT_STATE });

  const [pricing, setPricing] = useState<{ per_arrow?: number; subtotal?: number }>({});
  const [serverErr, setServerErr] = useState<{ field?: string; message: string } | null>(null);
  const [pricingBusy, setPricingBusy] = useState(false);

  const [customer, setCustomer] = useState<{ email: string; name: string }>({ email: "", name: "" });
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftResult, setDraftResult] = useState<{ order_id: number } | null>(null);

  const [openStep, setOpenStep] = useState<number>(1);

  const [modal, setModal] = useState<null | { type: ProductType; id: number; title: string }>(null);

  // Fetch catalog on mount
  useEffect(() => {
    (async () => {
      setLoadingCatalog(true);
      setCatalogError(null);
      try {
        const res = await fetch(API.catalog);
        const data = (await res.json()) as any;
        if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed to load catalog.");
        setCatalog(data as CatalogResponse);
      } catch (e: any) {
        setCatalogError(e?.message || "Failed to load catalog.");
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, []);

  const shafts = catalog?.shafts ?? [];
  const wraps = catalog?.wraps ?? [];
  const vanes = catalog?.vanes ?? [];
  const inserts = catalog?.inserts ?? [];
  const points = catalog?.points ?? [];
  const nocks = catalog?.nocks ?? [];
  const productImages = catalog?.product_images ?? [];

const imagesByKey = useMemo(() => {
  const m = new Map<string, ProductImage[]>();
  for (const img of productImages) {
    const key = `${img.product_type}:${img.product_id}`;
    if (!m.has(key)) m.set(key, []);
    m.get(key)!.push(img);
  }
  // sort by `sort` then id, just in case
  for (const [k, arr] of m.entries()) {
    arr.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id - b.id);
    m.set(k, arr);
  }
  return m;
}, [productImages]);

function imagesFor(type: ProductType, id?: number | null) {
  if (!id) return [];
  return imagesByKey.get(`${type}:${id}`) ?? [];
}

  const selectedShaft = useMemo(
    () => shafts.find((s) => s.id === state.shaft_id) ?? null,
    [shafts, state.shaft_id]
  );
  const selectedWrap = useMemo(
    () => (state.wrap_id ? wraps.find((w) => w.id === state.wrap_id) ?? null : null),
    [wraps, state.wrap_id]
  );
  const selectedVane = useMemo(
    () => (state.vane_id ? vanes.find((v) => v.id === state.vane_id) ?? null : null),
    [vanes, state.vane_id]
  );
  const selectedInsert = useMemo(
    () => (state.insert_id ? inserts.find((i) => i.id === state.insert_id) ?? null : null),
    [inserts, state.insert_id]
  );
  const selectedPoint = useMemo(
    () => (state.point_id ? points.find((p) => p.id === state.point_id) ?? null : null),
    [points, state.point_id]
  );
  const selectedNock = useMemo(
    () => (state.nock_id ? nocks.find((n) => n.id === state.nock_id) : null),
    [nocks, state.nock_id]
  );

  // Filter wraps by shaft OD
  const compatibleWraps = useMemo(() => {
    if (!selectedShaft) return [];
    const od = selectedShaft.outer_diameter;
    return wraps.filter((w) => od >= w.min_outer_diameter && od <= w.max_outer_diameter);
  }, [wraps, selectedShaft]);

  // Filter vanes by micro compatibility
  const compatibleVanes = useMemo(() => {
    if (!selectedShaft) return vanes;
    const isMicro = selectedShaft.outer_diameter <= 0.265;
    return vanes.filter((v) => (isMicro ? v.compatible_micro === 1 : true));
  }, [vanes, selectedShaft]);

  // Points grouped
  const fieldPoints = useMemo(() => points.filter((p) => p.type === "field"), [points]);
  const broadheads = useMemo(() => points.filter((p) => p.type === "broadhead"), [points]);

  // Estimated total arrow weight and FOC calculator (only meaningful if cut length is known)
 const VANE_CENTER_FROM_NOCK_IN = 1.75; // tweak 1.5–2.0 to your preference

  const estimated = useMemo(() => {
    // Need a length to compute weight/FOC.
    // If "uncut", we can either show null or use shaft.max_length as an estimate.
    if (!selectedShaft) return { taw: null as number | null, foc: null as number | null };

    const L =
      state.cut_mode === "cut" && typeof state.cut_length === "number"
        ? Number(state.cut_length)
        : null;

    if (!L || !Number.isFinite(L) || L <= 0) {
      // Uncut or missing length → no FOC/TAW
      return { taw: null, foc: null };
    }

    // --- weights (grains) ---
    const shaftGr = Number(selectedShaft.gpi) * L;

    const wrapGr = selectedWrap ? Number(selectedWrap.weight_grains || 0) : 0;

    const vaneEach = selectedVane?.weight_grains ? Number(selectedVane.weight_grains) : 0;
    const vaneGr =
      state.fletch_count === 0 ? 0 : vaneEach * Number(state.fletch_count || 0);

    const nockGr = selectedNock ? Number(selectedNock.weight_grains || 0) : 0;

    const insertGr =
      selectedInsert
        ? Number(selectedInsert.weight_grains) +
          (selectedInsert.requires_collar ? Number(selectedInsert.collar_weight_grains ?? 0) : 0)
        : 0;

    const pointGr = selectedPoint ? Number(selectedPoint.weight_grains || 0) : 0;

    const totalGr = shaftGr + wrapGr + vaneGr + nockGr + insertGr + pointGr;
    const taw = Number.isFinite(totalGr) ? Math.round(totalGr) : null;

    if (!taw || taw <= 0) return { taw: null, foc: null };

    // --- positions (inches from nock throat) ---
    // Shaft is distributed: COG at L/2
    const shaftX = L / 2;

    // Wrap is distributed from 0..wrapLen => COG at wrapLen/2
    const wrapLen = selectedWrap ? Number(selectedWrap.length || 0) : 0;
    const wrapX = wrapLen > 0 ? wrapLen / 2 : 0;

    // Vanes: assume their mass is centered around a fixed distance from nock
    const vaneX = VANE_CENTER_FROM_NOCK_IN;

    // Nock at 0
    const nockX = 0;

    // Insert + point near the front (very good approximation)
    const frontX = L;

    // Weighted average for balance point (COG)
    const sumWX =
      shaftGr * shaftX +
      wrapGr * wrapX +
      vaneGr * vaneX +
      nockGr * nockX +
      insertGr * frontX +
      pointGr * frontX;

    const balance = sumWX / totalGr;

    const foc = ((balance - L / 2) / L) * 100;
    const focRounded = Number.isFinite(foc) ? Math.round(foc * 10) / 10 : null;

    return { taw, foc: focRounded };
  }, [
    selectedShaft,
    selectedWrap,
    selectedVane,
    selectedNock,
    selectedInsert,
    selectedPoint,
    state.cut_mode,
    state.cut_length,
    state.fletch_count,
  ]);

  // Step completion logic (only Shaft required; Cut can be uncut)
  const stepDone = useMemo(() => {
    const hasShaft = !!state.shaft_id;
    const cutOk =
      state.cut_mode === "uncut" || (state.cut_mode === "cut" && typeof state.cut_length === "number");

    // Steps are “done” when the user can proceed; optional steps are considered done once unlocked
    return {
      1: hasShaft,
      2: hasShaft && cutOk,
      3: hasShaft, // nock optional
      4: hasShaft, // wrap optional
      5: hasShaft, // vanes optional
      6: hasShaft, // insert optional
      7: hasShaft, // point optional
      8: hasShaft && cutOk, // review requires shaft + valid cut selection
    } as Record<number, boolean>;
  }, [state.shaft_id, state.cut_mode, state.cut_length]);

  // When shaft changes, clear incompatible selections
  useEffect(() => {
    setState((prev) => {
      if (!prev.shaft_id) return prev;
      const next: BuilderState = { ...prev };

      // Wrap compatibility
      if (next.wrap_id && selectedShaft) {
        const w = wraps.find((x) => x.id === next.wrap_id);
        const ok = !!w && selectedShaft.outer_diameter >= w.min_outer_diameter && selectedShaft.outer_diameter <= w.max_outer_diameter;
        if (!ok) next.wrap_id = null;
      }

      // Vane compatibility
      if (next.vane_id && selectedShaft) {
        const v = vanes.find((x) => x.id === next.vane_id);
        const isMicro = selectedShaft.outer_diameter <= 0.265;
        if (!v || (isMicro && v.compatible_micro !== 1)) {
          next.vane_id = null;
          next.fletch_count = 0;
        }
      }

      // Cut length must be <= new shaft max
      if (next.cut_mode === "cut" && typeof next.cut_length === "number" && selectedShaft) {
        if (next.cut_length > selectedShaft.max_length) next.cut_length = null;
      }

      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.shaft_id]);

  // Pricing conditions
  const canPrice = useMemo(() => {
    const hasShaft = !!state.shaft_id;
    const cutOk =
      state.cut_mode === "uncut" || (state.cut_mode === "cut" && typeof state.cut_length === "number");
    const qtyOk = state.quantity === 6 || state.quantity === 12;
    return hasShaft && cutOk && qtyOk;
  }, [state.shaft_id, state.cut_mode, state.cut_length, state.quantity]);

  // Debounced pricing call
  const debouncedPrice = useRef(
    debounce(async (payload: any) => {
      setPricingBusy(true);
      setServerErr(null);
      try {
        const res = await fetch(API.price, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as PriceResponse;
        if (!res.ok || !data.ok) {
          const err = (data as any)?.message || "Unable to price this build.";
          setPricing({});
          setServerErr({ field: (data as any)?.field, message: err });
          return;
        }
        setPricing({ per_arrow: data.price.per_arrow, subtotal: data.price.subtotal });
      } catch (e: any) {
        setPricing({});
        setServerErr({ message: e?.message || "Pricing request failed." });
      } finally {
        setPricingBusy(false);
      }
    }, 300)
  ).current;

  // Trigger pricing whenever build becomes priceable
  useEffect(() => {
    setDraftResult(null);

    if (!canPrice) {
      setPricing({});
      setServerErr(null);
      return;
    }

    debouncedPrice({
      shaft_id: state.shaft_id,

      cut_mode: state.cut_mode,
      cut_length: state.cut_mode === "cut" ? state.cut_length : null,

      nock_id: state.nock_id ?? null,
      wrap_id: state.wrap_id ?? null,

      // If no vanes, force vane_id null
      vane_id: state.fletch_count === 0 ? null : (state.vane_id ?? null),
      fletch_count: state.fletch_count,

      insert_id: state.insert_id ?? null,
      point_id: state.point_id ?? null,

      quantity: state.quantity,
    });
  }, [state, canPrice, debouncedPrice]);

  const fieldError = (fieldName: string) => (serverErr?.field === fieldName ? serverErr.message : null);

  // UI actions
  function selectShaft(id: number) {
    setState((s) => ({
      ...DEFAULT_STATE,
      shaft_id: id,
      // keep qty if already 12
      quantity: s.quantity === 12 ? 12 : 6,
    }));
    setOpenStep(2);
  }

  function setCutMode(mode: "uncut" | "cut") {
    setState((s) => ({
      ...s,
      cut_mode: mode,
      cut_length: mode === "uncut" ? null : s.cut_length,
    }));
  }

  function setCutLength(v: string) {
    const n = Number(v);
    setState((s) => ({ ...s, cut_length: Number.isFinite(n) ? n : null }));
  }

  function setQty(q: 6 | 12) {
    setState((s) => ({ ...s, quantity: q }));
  }

  function setFletchCount(n: 0 | 3 | 4) {
    setState((s) => {
      // If switching to none, clear vane_id
      if (n === 0) return { ...s, fletch_count: 0, vane_id: null };
      // If switching on fletching but no vane selected yet, keep vane_id null and user will pick
      return { ...s, fletch_count: n };
    });
  }

  async function createDraft() {
    setDraftBusy(true);
    setServerErr(null);
    setDraftResult(null);

    try {
      const res = await fetch(API.draft, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: {
            email: customer.email.trim(),
            name: customer.name.trim(),
          },
          build: {
            shaft_id: state.shaft_id,

            cut_mode: state.cut_mode,
            cut_length: state.cut_mode === "cut" ? state.cut_length : null,

            nock_id: state.nock_id ?? null,
            wrap_id: state.wrap_id ?? null,

            vane_id: state.fletch_count === 0 ? null : (state.vane_id ?? null),
            fletch_count: state.fletch_count,

            insert_id: state.insert_id ?? null,
            point_id: state.point_id ?? null,

            quantity: state.quantity,
          },
        }),
      });

      const data = (await res.json()) as DraftResponse;

      if (!res.ok || !data.ok) {
        setServerErr({
          field: (data as any)?.field,
          message: (data as any)?.message || "Unable to create draft order.",
        });
        return;
      }

      setDraftResult({ order_id: data.order_id });
    } catch (e: any) {
      setServerErr({ message: e?.message || "Draft request failed." });
    } finally {
      setDraftBusy(false);
    }
  }

  const canProceedToDraft =
    canPrice &&
    customer.email.trim().length > 3 &&
    !pricingBusy &&
    !!pricing.per_arrow &&
    !serverErr &&
    // If fletching is enabled, require a vane selected
    (state.fletch_count === 0 || !!state.vane_id);

  // ---------------------- Render ----------------------

  if (loadingCatalog) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <Header />
          <div style={styles.card}>Loading catalog…</div>
        </div>
      </div>
    );
  }

  if (catalogError || !catalog) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <Header />
          <div style={styles.card}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Couldn’t load products</div>
            <div style={{ color: "rgba(255,255,255,.75)" }}>{catalogError || "Unknown error"}</div>
            <div style={{ marginTop: 12, fontSize: 12, color: "rgba(255,255,255,.6)" }}>
              Confirm your Worker endpoint <code>/api/builder/catalog</code> is reachable.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Header />

        <div style={styles.grid}>
          {/* LEFT: steps */}
          <div style={styles.left}>
            {/* 1) Shaft */}
            <Step
              n={1}
              title="Shaft"
              subtitle="Choose brand/model/spine"
              open={openStep === 1}
              done={stepDone[1]}
              onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)}
            >
              <div style={styles.cardInner}>
                <div style={styles.cardHint}>Pick a shaft first — everything else is optional.</div>
                <div style={styles.cards}>
                  {groupShafts(shafts).map(({ key, items }) => (
                    <div key={key} style={{ marginBottom: 14 }}>
                      <div style={styles.groupTitle}>{key}</div>
                      <div style={styles.cards}>
                        {items.map((s) => {
                          const selected = s.id === state.shaft_id;
                          return (
                            <button
                                  key={s.id}
                                  onClick={() => {
                                    selectShaft(s.id);
                                    setModal({ type: "shaft", id: s.id, title: `${s.brand} ${s.model} • Spine ${s.spine}` });
                                  }}
                                  style={cardButtonStyle(selected)}
                                >
                              <div style={styles.cardTop}>
                                <div style={styles.cardTitle}>
                                  {s.brand} {s.model}
                                </div>
                                <div style={styles.badge}>Spine {s.spine}</div>
                              </div>
                              <div style={styles.cardMeta}>
                                <span>{s.gpi} GPI</span>
                                <span>•</span>
                                <span>{s.straightness || "—"}</span>
                                <span>•</span>
                                <span>Max {s.max_length}"</span>
                              </div>
                              <div style={styles.cardPrice}>Shaft {formatMoney(s.price_per_shaft)}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                {fieldError("shaft_id") && <FieldError msg={fieldError("shaft_id")!} />}
              </div>
            </Step>

            {/* 2) Cut */}
            <Step
              n={2}
              title="Length"
              subtitle="Uncut or cut to length"
              open={openStep === 2}
              done={stepDone[2]}
              disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)}
            >
              <div style={styles.cardInner}>
                <div style={styles.row}>
                  <button
                    onClick={() => setCutMode("uncut")}
                    style={pillStyle(state.cut_mode === "uncut")}
                  >
                    Uncut (full length)
                  </button>
                  <button
                    onClick={() => setCutMode("cut")}
                    style={pillStyle(state.cut_mode === "cut")}
                  >
                    Cut to length
                  </button>
                </div>

                {state.cut_mode === "cut" && (
                  <div style={{ marginTop: 12 }}>
                    <div style={styles.row}>
                      <div style={{ flex: 1, minWidth: 240 }}>
                        <label style={styles.label}>Cut length (inches)</label>
                        <input
                          style={inputStyle(!!fieldError("cut_length"))}
                          type="number"
                          step={CUT_STEP}
                          min={0}
                          placeholder="28.75"
                          value={state.cut_length ?? ""}
                          onChange={(e) => setCutLength(e.target.value)}
                        />
                        <div style={styles.help}>
                          Must be ≤ {selectedShaft ? `${selectedShaft.max_length}"` : "shaft max"} and in ¼″ increments.
                        </div>
                        {fieldError("cut_length") && <FieldError msg={fieldError("cut_length")!} />}
                      </div>

                      <div style={styles.sideBox}>
                        <div style={styles.sideTitle}>Shaft details</div>
                        {selectedShaft ? (
                          <div style={styles.sideText}>
                            <div>
                              <b>
                                {selectedShaft.brand} {selectedShaft.model}
                              </b>{" "}
                              (Spine {selectedShaft.spine})
                            </div>
                            <div style={{ marginTop: 6, opacity: 0.85 }}>
                              OD {selectedShaft.outer_diameter} • Max {selectedShaft.max_length}"
                            </div>
                          </div>
                        ) : (
                          <div style={styles.sideText}>Select a shaft first.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <button style={primaryButtonStyle(true)} onClick={() => setOpenStep(3)}>
                    Continue
                  </button>
                </div>
              </div>
            </Step>

            {/* 3) Nock (optional) */}
            <Step
              n={3}
              title="Nock"
              subtitle="Optional upgrade / pin system"
              open={openStep === 3}
              done={stepDone[3]}
              disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)}
            >
              <div style={styles.cardInner}>
                {nocks.length === 0 ? (
                  <div style={styles.help}>
                    Nocks aren’t in the catalog response yet. (UI is ready—add <code>nocks</code> to /catalog and wire pricing later.)
                  </div>
                ) : (
                  <div style={styles.row}>
                    <button onClick={() => setState((s) => ({ ...s, nock_id: null }))} style={pillStyle(state.nock_id == null)}>
                      Default / None
                    </button>
                    {nocks.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => setState((s) => ({ ...s, nock_id: n.id }))}
                        style={pillStyle(state.nock_id === n.id)}
                      >
                        {n.brand} {n.model}{" "}
                        <span style={{ opacity: 0.8 }}>• +{formatMoney(n.price_per_arrow)}/arrow</span>
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 12 }}>
                  <button style={primaryButtonStyle(true)} onClick={() => setOpenStep(4)}>
                    Continue
                  </button>
                </div>
              </div>
            </Step>

            {/* 4) Wrap (optional) */}
            <Step
              n={4}
              title="Wrap"
              subtitle="Optional (filtered by shaft diameter)"
              open={openStep === 4}
              done={stepDone[4]}
              disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 4 ? 0 : 4)}
            >
              <div style={styles.cardInner}>
                <div style={styles.row}>
                  <button onClick={() => setState((s) => ({ ...s, wrap_id: null }))} style={pillStyle(state.wrap_id == null)}>
                    No wrap
                  </button>
                    {compatibleWraps.map((w) => {
                      const active = state.wrap_id === w.id;

                      return (
                        <div key={w.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <button
                            onClick={() => {
                                setState((s) => ({ ...s, wrap_id: w.id }));
                                setModal({ type: "wrap", id: w.id, title: `${w.name} • ${w.length}"` });
                              }}
                            style={pillStyle(active)}
                          >
                            {w.name} <span style={{ opacity: 0.8 }}>• +{formatMoney(w.price_per_arrow)}/arrow</span>
                          </button>

                          <button
                            onClick={() =>
                              setModal({
                                type: "wrap",
                                id: w.id,
                                title: `${w.name} • ${w.length}"`,
                              })
                            }
                            style={{
                              ...miniBtnStyle(),
                              width: 44,
                            }}
                            aria-label={`View ${w.name} images`}
                            title="View images"
                          >
                            📷
                          </button>
                        </div>
                      );
                    })}


                </div>
                <div style={styles.help}>Wraps auto-filter to your selected shaft OD.</div>

                <div style={{ marginTop: 12 }}>
                  <button style={primaryButtonStyle(true)} onClick={() => setOpenStep(5)}>
                    Continue
                  </button>
                </div>
              </div>
            </Step>

            {/* 5) Vanes (optional; 0/3/4) */}
            <Step
              n={5}
              title="Vanes"
              subtitle="None, 3-fletch, or 4-fletch"
              open={openStep === 5}
              done={stepDone[5]}
              disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 5 ? 0 : 5)}
            >
              <div style={styles.cardInner}>
                <div style={styles.row}>
                  <button onClick={() => setFletchCount(0)} style={pillStyle(state.fletch_count === 0)}>
                    None
                  </button>
                  <button onClick={() => setFletchCount(3)} style={pillStyle(state.fletch_count === 3)}>
                    3-fletch
                  </button>
                  <button onClick={() => setFletchCount(4)} style={pillStyle(state.fletch_count === 4)}>
                    4-fletch
                  </button>
                </div>

                {state.fletch_count > 0 && (
                  <>
                    <div style={{ marginTop: 10, ...styles.help }}>
                      Select a vane (filtered for micro shafts when needed).
                    </div>

                    <div style={{ marginTop: 10 }} />
                    <div style={styles.cards}>
                      {compatibleVanes.map((v) => {
                        const selected = v.id === state.vane_id;
                        return (
                          <button
                            key={v.id}
                            onClick={() => {
                                setState((s) => ({ ...s, vane_id: v.id }));
                                setModal({ type: "vane", id: v.id, title: `${v.brand} ${v.model}` });
                              }}
                            style={cardButtonStyle(selected)}
                          >
                            <div style={styles.cardTop}>
                              <div style={styles.cardTitle}>
                                {v.brand} {v.model}
                              </div>
                              <div style={styles.badge}>{state.fletch_count}-fletch</div>
                            </div>
                            <div style={styles.cardMeta}>
                              <span>{v.profile || "profile"}</span>
                              <span>•</span>
                              <span>Micro {v.compatible_micro ? "OK" : "No"}</span>
                            </div>
                            <div style={styles.cardPrice}>
                              +{formatMoney(v.price_per_arrow * state.fletch_count)} / arrow
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {state.fletch_count > 0 && !state.vane_id && (
                      <FieldError msg="Pick a vane (or switch to None)." />
                    )}
                  </>
                )}

                <div style={{ marginTop: 12 }}>
                  <button style={primaryButtonStyle(true)} onClick={() => setOpenStep(6)}>
                    Continue
                  </button>
                </div>
              </div>
            </Step>

            {/* 6) Insert (optional) */}
            <Step
              n={6}
              title="Insert"
              subtitle="Optional (adds weight)"
              open={openStep === 6}
              done={stepDone[6]}
              disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 6 ? 0 : 6)}
            >
              <div style={styles.cardInner}>
                <div style={styles.row}>
                  <button onClick={() => setState((s) => ({ ...s, insert_id: null }))} style={pillStyle(state.insert_id == null)}>
                    No insert
                  </button>

                  {inserts.map((ins) => (
                    <button
                      key={ins.id}

                        onClick={() => {
                         setState((s) => ({ ...s, insert_id: ins.id }));
                         setModal({ type: "insert", id: ins.id, title: `${ins.brand} ${ins.model}` });
                              }}
                      style={pillStyle(state.insert_id === ins.id)}
                    >
                      {ins.brand} {ins.model}
                      <span style={{ opacity: 0.8 }}>
                        {" "}
                        • {ins.weight_grains}gr • +{formatMoney(ins.price_per_arrow)}/arrow
                        {ins.requires_collar ? ` • collar +${ins.collar_weight_grains ?? 0}gr` : ""}
                      </span>
                    </button>
                  ))}
                </div>

                <div style={{ marginTop: 12 }}>
                  <button style={primaryButtonStyle(true)} onClick={() => setOpenStep(7)}>
                    Continue
                  </button>
                </div>
              </div>
            </Step>

            {/* 7) Point (optional) */}
            <Step
              n={7}
              title="Point"
              subtitle="None, field points, or broadheads"
              open={openStep === 7}
              done={stepDone[7]}
              disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 7 ? 0 : 7)}
            >
              <div style={styles.cardInner}>
                <div style={styles.row}>
                  <button onClick={() => setState((s) => ({ ...s, point_id: null }))} style={pillStyle(state.point_id == null)}>
                    None
                  </button>
                </div>

                <div style={{ marginTop: 10 }} />
                <PointPicker
                  fieldPoints={fieldPoints}
                  broadheads={broadheads}
                  selectedId={state.point_id ?? undefined}
                  onSelect={(id) => setState((s) => ({ ...s, point_id: id }))}
                />

                <div style={{ marginTop: 12 }}>
                  <button style={primaryButtonStyle(true)} onClick={() => setOpenStep(8)}>
                    Continue
                  </button>
                </div>
              </div>
            </Step>

            {/* 8) Review */}
            <Step
              n={8}
              title="Review"
              subtitle="Choose pack size + create a draft order"
              open={openStep === 8}
              done={false}
              disabled={!stepDone[2]}
              onToggle={() => setOpenStep(openStep === 8 ? 0 : 8)}
            >
              <div style={styles.cardInner}>
                <div style={styles.reviewGrid}>
                  <div>
                    <div style={styles.label}>Pack size</div>
                    <div style={styles.row}>
                      <button onClick={() => setQty(6)} style={pillStyle(state.quantity === 6)}>
                        6 pack
                      </button>
                      <button onClick={() => setQty(12)} style={pillStyle(state.quantity === 12)}>
                        12 pack
                      </button>
                    </div>

                    <div style={{ marginTop: 10, ...styles.help }}>
                      You’ll only stock shafts in boxes of 12—customers can order 6 or 12.
                    </div>
                  </div>

                  <div style={styles.sideBox}>
                    <div style={styles.sideTitle}>Contact</div>
                    <label style={styles.label}>Email</label>
                    <input
                      style={inputStyle(serverErr?.field === "customer.email")}
                      placeholder="you@example.com"
                      value={customer.email}
                      onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                    />
                    <label style={{ ...styles.label, marginTop: 10 }}>Name (optional)</label>
                    <input
                      style={inputStyle(false)}
                      placeholder="Your name"
                      value={customer.name}
                      onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                    />
                    {serverErr?.field === "customer.email" && <FieldError msg={serverErr.message} />}
                  </div>
                </div>

                <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    style={primaryCTAStyle(canProceedToDraft)}
                    onClick={createDraft}
                    disabled={!canProceedToDraft || draftBusy}
                  >
                    {draftBusy ? "Creating draft…" : "Add to cart (draft)"}
                  </button>
                  <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>
                    Shafts-only orders are allowed (uncut or cut). Components optional.
                  </div>
                </div>

                {serverErr && !serverErr.field && (
                  <div style={{ marginTop: 10 }}>
                    <FieldError msg={serverErr.message} />
                  </div>
                )}

                {draftResult && (
                  <div style={styles.successBox}>Draft created. Order #{draftResult.order_id}.</div>
                )}
              </div>
            </Step>
          </div>

          {/* RIGHT: sticky summary */}
          <div style={styles.right}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryTitle}>Build summary</div>

              <div style={styles.summaryPriceRow}>
                <div>
                  <div style={styles.bigPrice}>
                    {formatMoney(pricing.per_arrow)} <span style={{ fontSize: 12, opacity: 0.7 }}>/ arrow</span>
                  </div>
                  <div style={styles.summarySub}>{state.cut_mode === "uncut" ? "Uncut" : "Cut"} • Live pricing</div>
                </div>
                <div style={styles.smallBadge}>{pricingBusy ? "Pricing…" : "Live price"}</div>
              </div>

              <div style={styles.summaryList}>
                <SummaryLine
                  label="Shaft"
                  value={selectedShaft ? `${selectedShaft.brand} ${selectedShaft.model} ${selectedShaft.spine}` : "—"}
                />
                <SummaryLine
                  label="Length"
                  value={
                    state.cut_mode === "uncut"
                      ? "Uncut"
                      : typeof state.cut_length === "number"
                      ? `${state.cut_length}"`
                      : "—"
                  }
                />
                <SummaryLine label="Nock" value={selectedNock ? `${selectedNock.brand} ${selectedNock.model}` : "Default / None"} />
                <SummaryLine label="Wrap" value={selectedWrap ? selectedWrap.name : "None"} />
                <SummaryLine
                  label="Vanes"
                  value={
                    state.fletch_count === 0
                      ? "None"
                      : selectedVane
                      ? `${selectedVane.brand} ${selectedVane.model} (${state.fletch_count}-fletch)`
                      : `${state.fletch_count}-fletch (pick vane)`
                  }
                />
                <SummaryLine
                  label="Insert"
                  value={
                    selectedInsert
                      ? `${selectedInsert.brand} ${selectedInsert.model}${selectedInsert.requires_collar ? " (+collar)" : ""}`
                      : "None"
                  }
                />
                <SummaryLine
                  label="Point"
                  value={
                    selectedPoint
                      ? (`${selectedPoint.brand || ""} ${selectedPoint.model || ""}`.trim() ||
                        `${selectedPoint.type} ${selectedPoint.weight_grains}gr`)
                      : "None"
                  }
                />
                <SummaryLine label="Est. TAW" value={estimated.taw != null ? `${estimated.taw} gr` : "—"} />
                <SummaryLine label="Est. FOC" value={estimated.foc != null ? `${estimated.foc}%` : "—"} />
                <SummaryLine label="Quantity" value={`${state.quantity}`} />
              </div>

              <div style={styles.hr} />

              <div style={styles.totalRow}>
                <div style={{ fontWeight: 800 }}>Subtotal</div>
                <div style={{ fontWeight: 900 }}>{formatMoney(pricing.subtotal)}</div>
              </div>

              {serverErr && serverErr.field && (
                <div style={styles.warnBox}>
                  <div style={{ fontWeight: 900, marginBottom: 4 }}>Needs attention</div>
                  <div style={{ opacity: 0.9 }}>{serverErr.message}</div>
                </div>
              )}

              <div style={styles.includedBox}>
                <div style={{ fontWeight: 900, marginBottom: 6 }}>What’s included</div>
                <ul style={styles.ul}>
                  <li>Shafts packed safely</li>
                  <li>Cut-to-length when selected</li>
                  <li>Component install (when selected)</li>
                  <li>QC + packing</li>
                </ul>
                <div style={styles.microNote}>Hardcore-spec builds: correct spine, FOC-minded setups, and broadhead-true tuning.</div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.65)" }}>
                Tip: shafts-only is a great way to start—add components later.
              </div>
            </div>

            <div style={styles.brandNote}>
              <div style={{ fontWeight: 900 }}>Dyla Archery</div>
              <div style={{ opacity: 0.75, marginTop: 4 }}>Premium custom builds. Tight specs. Zero guesswork.</div>
            </div>
          </div>
        </div>
      </div>
            {modal && (
                <ProductModal title={modal.title} onClose={() => setModal(null)}>
                  <ImageCarousel images={imagesFor(modal.type, modal.id)} height={280} />
                  <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
                    Images are tied to <b>{modal.type}</b> #{modal.id}.
                  </div>
                </ProductModal>
              )}

    </div>

    
  );
}

// ---------------------- Components ----------------------

function Header() {
  return (
    <div style={styles.header}>
      <div style={styles.logoBox}>
        <div style={styles.logoMark}>D</div>
      </div>
      <div>
        <div style={styles.hTitle}>Build Your Arrows</div>
        <div style={styles.hSub}>Shaft → length → nock → wrap → vanes → insert → point → review</div>
      </div>
      <div style={{ marginLeft: "auto" }}>
        <span style={styles.topPill}>Black • Yellow • Orange • Hardcore Spec</span>
      </div>
    </div>
  );
}

function Step(props: {
  n: number;
  title: string;
  subtitle: string;
  open: boolean;
  done: boolean;
  disabled?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { n, title, subtitle, open, done, disabled, onToggle, children } = props;

  return (
    <div style={styles.step}>
      <button
        onClick={onToggle}
        disabled={disabled}
        style={classNamesButton(disabled ? "disabled" : "", open ? "open" : "")}
      >
        <div style={styles.stepLeft}>
          <div style={styles.stepNum}>{n}</div>
          <div>
            <div style={styles.stepTitleRow}>
              <div style={styles.stepTitle}>{title}</div>
              {done && <span style={styles.doneBadge}>✓</span>}
            </div>
            <div style={styles.stepSub}>{subtitle}</div>
          </div>
        </div>
        <div style={styles.chev}>{open ? "▾" : "▸"}</div>
      </button>

      {open && !disabled && <div style={styles.stepBody}>{children}</div>}
      {disabled && <div style={styles.stepDisabled}>Complete the previous step to unlock this.</div>}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <div style={styles.fieldErr}>
      <span style={{ fontWeight: 900 }}>⚠</span>
      <span>{msg}</span>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.sumLine}>
      <div style={{ opacity: 0.72 }}>{label}</div>
      <div style={{ fontWeight: 750, textAlign: "right" }}>{value}</div>
    </div>
  );
}

function PointPicker(props: {
  fieldPoints: Point[];
  broadheads: Point[];
  selectedId?: number;
  onSelect: (id: number) => void;
}) {
  const { fieldPoints, broadheads, selectedId, onSelect } = props;
  const [tab, setTab] = useState<"field" | "broadhead">("broadhead");

  const items = tab === "field" ? fieldPoints : broadheads;

  return (
    <div>
      <div style={styles.tabRow}>
        <button style={tabStyle(tab === "field")} onClick={() => setTab("field")}>
          Field points
        </button>
        <button style={tabStyle(tab === "broadhead")} onClick={() => setTab("broadhead")}>
          Broadheads
        </button>
      </div>

      <div style={styles.cards}>
        {items.map((p) => {
          const selected = p.id === selectedId;
          const label =
            `${p.brand || ""} ${p.model || ""}`.trim() ||
            (p.type === "field" ? "Field point" : "Broadhead");
          return (
            <button key={p.id} onClick={() => onSelect(p.id)} style={cardButtonStyle(selected)}>
              <div style={styles.cardTop}>
                <div style={styles.cardTitle}>{label}</div>
                <div style={styles.badge}>{p.weight_grains}gr</div>
              </div>
              <div style={styles.cardMeta}>
                <span>{p.type === "field" ? "Field" : "Broadhead"}</span>
                <span>•</span>
                <span>{p.thread || "8-32"}</span>
              </div>
              <div style={styles.cardPrice}>+{formatMoney(p.price)} / arrow</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProductModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        display: "grid",
        placeItems: "center",
        padding: 18,
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(860px, 100%)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,.14)",
          background: "rgba(10,10,14,.98)",
          boxShadow: "0 30px 120px rgba(0,0,0,.70)",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 14px", borderBottom: "1px solid rgba(255,255,255,.10)" }}>
          <div style={{ fontWeight: 950 }}>{title}</div>
          <button onClick={onClose} style={{ marginLeft: "auto", ...miniBtnStyle() }}>✕</button>
        </div>

        <div style={{ padding: 14 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function ImageCarousel({ images, height = 220 }: { images: ProductImage[]; height?: number }) {
  const [i, setI] = useState(0);

  if (!images?.length) {
    return (
      <div style={{ height, borderRadius: 14, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.18)", display: "grid", placeItems: "center", fontSize: 12, opacity: 0.7 }}>
        No images yet
      </div>
    );
  }

  const cur = images[Math.min(i, images.length - 1)];

  return (
    <div>
      <div style={{ height, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.18)" }}>
        <img
          src={cur.url}
          alt={cur.alt ?? ""}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          loading="lazy"
        />
      </div>

      {images.length > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
          <button style={miniBtnStyle()} onClick={() => setI((v) => (v - 1 + images.length) % images.length)}>‹</button>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            {i + 1} / {images.length}
          </div>
          <button style={miniBtnStyle()} onClick={() => setI((v) => (v + 1) % images.length)}>›</button>

          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            {images.slice(0, 8).map((x, idx) => (
              <button
                key={x.id}
                onClick={() => setI(idx)}
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.20)",
                  background: idx === i ? "rgba(255,212,0,.85)" : "rgba(255,255,255,.10)",
                  cursor: "pointer",
                }}
                aria-label={`Go to image ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function miniBtnStyle(): React.CSSProperties {
  return {
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(0,0,0,.18)",
    color: "rgba(255,255,255,.92)",
    width: 36,
    height: 32,
    cursor: "pointer",
    fontSize: 16,
    lineHeight: "32px",
  };
}

// ---------------------- Styles ----------------------

function cardButtonStyle(selected: boolean): React.CSSProperties {
  return {
    ...styles.cardBtn,
    borderColor: selected ? "rgba(255,212,0,.65)" : "rgba(255,255,255,.14)",
    boxShadow: selected ? "0 0 0 4px rgba(255,212,0,.10)" : "none",
    background: selected ? "rgba(255,212,0,.08)" : "rgba(255,255,255,.04)",
  };
}

function inputStyle(error: boolean): React.CSSProperties {
  return {
    ...styles.input,
    borderColor: error ? "rgba(255,120,120,.55)" : "rgba(255,255,255,.16)",
    boxShadow: error ? "0 0 0 4px rgba(255,80,80,.08)" : "none",
  };
}

function primaryButtonStyle(enabled: boolean): React.CSSProperties {
  return {
    ...styles.primaryBtn,
    opacity: enabled ? 1 : 0.6,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

function primaryCTAStyle(enabled: boolean): React.CSSProperties {
  return {
    ...styles.primaryCTA,
    opacity: enabled ? 1 : 0.6,
    cursor: enabled ? "pointer" : "not-allowed",
  };
}

function pillStyle(active: boolean): React.CSSProperties {
  return {
    ...styles.pill,
    borderColor: active ? "rgba(255,212,0,.65)" : "rgba(255,255,255,.16)",
    background: active ? "rgba(255,212,0,.10)" : "rgba(0,0,0,.15)",
  };
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    ...styles.tab,
    borderColor: active ? "rgba(255,212,0,.65)" : "rgba(255,255,255,.16)",
    background: active ? "rgba(255,212,0,.12)" : "rgba(255,255,255,.04)",
  };
}

function classNamesButton(...flags: string[]) {
  const disabled = flags.includes("disabled");
  const open = flags.includes("open");
  return {
    ...styles.stepHead,
    opacity: disabled ? 0.65 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
    background: open ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.15)",
  } as React.CSSProperties;
}

// Minimal card style used in loading/error
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(900px 500px at 15% 10%, rgba(255,212,0,.10), transparent 60%)," +
      "radial-gradient(900px 520px at 85% 18%, rgba(255,106,0,.10), transparent 58%)," +
      "radial-gradient(900px 520px at 35% 90%, rgba(60,160,255,.08), transparent 60%)," +
      "linear-gradient(180deg, #050506, #0b0b10 40%, #07070a)",
    color: "rgba(255,255,255,.92)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  },
  container: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "28px 18px 60px",
  },
  card: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.04)",
    boxShadow: "0 18px 70px rgba(0,0,0,.45)",
    padding: 14,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 14px",
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.04)",
    boxShadow: "0 18px 70px rgba(0,0,0,.55)",
    marginBottom: 18,
  },
  logoBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.14)",
    background: "linear-gradient(135deg, rgba(255,212,0,.18), rgba(255,106,0,.10))",
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  },
  logoMark: {
    fontWeight: 950,
    fontSize: 18,
    color: "#0b0b10",
    background: "linear-gradient(90deg, rgba(255,212,0,1), rgba(255,106,0,1))",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  hTitle: { fontSize: 18, fontWeight: 950, letterSpacing: -0.3 },
  hSub: { fontSize: 12, color: "rgba(255,255,255,.7)", marginTop: 3 },
  topPill: {
    display: "inline-flex",
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(0,0,0,.18)",
    fontSize: 12,
    color: "rgba(255,255,255,.75)",
    whiteSpace: "nowrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.35fr .65fr",
    gap: 16,
    alignItems: "start",
  },
  left: {},
  right: {
    position: "sticky",
    top: 14,
    alignSelf: "start",
  },
  step: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.04)",
    boxShadow: "0 18px 70px rgba(0,0,0,.45)",
    marginBottom: 12,
    overflow: "hidden",
  },
  stepHead: {
    width: "100%",
    border: "none",
    padding: "14px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "rgba(255,255,255,.92)",
  },
  stepLeft: { display: "flex", gap: 12, alignItems: "center" },
  stepNum: {
    width: 30,
    height: 30,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 950,
    background: "rgba(255,255,255,.05)",
    border: "1px solid rgba(255,255,255,.12)",
  },
  stepTitleRow: { display: "flex", gap: 8, alignItems: "center" },
  stepTitle: { fontWeight: 950, fontSize: 14 },
  stepSub: { fontSize: 12, opacity: 0.72, marginTop: 2 },
  doneBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid rgba(255,212,0,.35)",
    background: "rgba(255,212,0,.12)",
    color: "rgba(255,245,210,.95)",
    fontSize: 12,
    fontWeight: 900,
  },
  chev: { opacity: 0.8, fontSize: 16 },
  stepBody: { padding: "14px 14px 16px" },
  stepDisabled: {
    padding: "10px 14px",
    fontSize: 12,
    color: "rgba(255,255,255,.65)",
    borderTop: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.14)",
  },
  cardInner: {},
  cardHint: {
    fontSize: 12,
    color: "rgba(255,255,255,.7)",
    marginBottom: 10,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 10,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 0.2,
    color: "rgba(255,255,255,.82)",
    marginBottom: 8,
  },
  cardBtn: {
    textAlign: "left",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(255,255,255,.04)",
    padding: 12,
    color: "rgba(255,255,255,.92)",
    cursor: "pointer",
  },
  cardTop: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" },
  cardTitle: { fontWeight: 950, fontSize: 13, letterSpacing: -0.2 },
  badge: {
    borderRadius: 999,
    padding: "4px 8px",
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(0,0,0,.18)",
    fontSize: 11,
    opacity: 0.9,
    whiteSpace: "nowrap",
  },
  cardMeta: { display: "flex", gap: 8, fontSize: 12, opacity: 0.75, marginTop: 8, flexWrap: "wrap" },
  cardPrice: { marginTop: 10, fontSize: 12, fontWeight: 850, color: "rgba(255,245,210,.92)" },

  row: { display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  label: { display: "block", fontSize: 12, opacity: 0.78, marginBottom: 6 },
  help: { fontSize: 12, opacity: 0.65, marginTop: 8 },

  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.16)",
    background: "rgba(255,255,255,.06)",
    color: "rgba(255,255,255,.92)",
    outline: "none",
    fontSize: 14,
  },

  sideBox: {
    flex: "0 0 260px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.18)",
    padding: 12,
  },
  sideTitle: { fontWeight: 950, fontSize: 12, marginBottom: 6, opacity: 0.9 },
  sideText: { fontSize: 12, opacity: 0.75, lineHeight: 1.4 },

  primaryBtn: {
    border: "none",
    borderRadius: 14,
    padding: "12px 14px",
    fontWeight: 950,
    letterSpacing: 0.2,
    background: "linear-gradient(90deg, rgba(255,212,0,1), rgba(255,106,0,1))",
    color: "#0b0b10",
  },
  primaryCTA: {
    border: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 950,
    letterSpacing: 0.2,
    background: "linear-gradient(90deg, rgba(255,212,0,1), rgba(255,106,0,1))",
    color: "#0b0b10",
    minWidth: 220,
  },

  pill: {
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.16)",
    background: "rgba(0,0,0,.15)",
    padding: "10px 12px",
    fontSize: 12,
    color: "rgba(255,255,255,.88)",
    cursor: "pointer",
    display: "inline-flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },

  tabRow: { display: "flex", gap: 10, marginBottom: 10 },
  tab: {
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.16)",
    background: "rgba(255,255,255,.04)",
    padding: "10px 12px",
    fontSize: 12,
    fontWeight: 900,
    color: "rgba(255,255,255,.88)",
    cursor: "pointer",
  },

  fieldErr: {
    marginTop: 10,
    padding: "10px 10px",
    borderRadius: 14,
    border: "1px solid rgba(255,120,120,.35)",
    background: "rgba(255,80,80,.06)",
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 12,
    color: "rgba(255,220,220,.95)",
  },

  reviewGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },

  successBox: {
    marginTop: 12,
    padding: "10px 10px",
    borderRadius: 14,
    border: "1px solid rgba(255,212,0,.35)",
    background: "rgba(255,212,0,.08)",
    color: "rgba(255,245,210,.95)",
    fontSize: 12,
    fontWeight: 850,
  },

  summaryCard: {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.04)",
    boxShadow: "0 18px 70px rgba(0,0,0,.55)",
    padding: 14,
  },
  summaryTitle: { fontWeight: 950, fontSize: 14, marginBottom: 10 },
  summaryPriceRow: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" },
  bigPrice: { fontSize: 22, fontWeight: 980, letterSpacing: -0.4 },
  summarySub: { fontSize: 12, opacity: 0.7, marginTop: 2 },
  smallBadge: {
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,.14)",
    background: "rgba(0,0,0,.16)",
    fontSize: 12,
    opacity: 0.85,
    whiteSpace: "nowrap",
  },
  summaryList: { marginTop: 12, display: "flex", flexDirection: "column", gap: 10 },
  sumLine: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 },
  hr: { height: 1, background: "rgba(255,255,255,.10)", margin: "12px 0" },
  totalRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },

  warnBox: {
    marginTop: 10,
    padding: "10px 10px",
    borderRadius: 14,
    border: "1px solid rgba(255,120,120,.35)",
    background: "rgba(255,80,80,.06)",
    fontSize: 12,
  },

  includedBox: {
    marginTop: 12,
    padding: "12px 12px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.18)",
    fontSize: 12,
  },
  ul: { margin: "8px 0 0 16px", padding: 0, opacity: 0.9, lineHeight: 1.6 },
  microNote: { marginTop: 10, opacity: 0.72, lineHeight: 1.5 },

  brandNote: {
    marginTop: 10,
    padding: 14,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.16)",
    fontSize: 12,
  },
};
