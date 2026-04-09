// src/ArrowBuilderPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  weight_grains: number;
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
  compatible_micro: number;
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
  shaft_id_in: number | null;
  weight_grains: number;
  price_per_arrow: number;
  requires_collar: number;
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
  shaft_id_in: number | null;
};

type ProductType = "shaft" | "wrap" | "vane" | "point" | "insert" | "nock";

type ProductImage = {
  id: number;
  product_type: ProductType;
  product_id: number;
  url: string;
  alt?: string | null;
  sort: number;
  is_primary?: number;
};

type CatalogResponse = {
  ok: true;
  shafts: Shaft[];
  wraps: Wrap[];
  vanes: Vane[];
  points: Point[];
  inserts: Insert[];
  nocks: Nock[];
  product_images: ProductImage[];
};

type PriceResponse =
  | { ok: true; price: { per_arrow: number; subtotal: number }; build: Record<string, any> }
  | { ok: false; field?: string; message: string };

type DraftResponse =
  | { ok: true; order_id: number; build_id: number; status: string; price: { per_arrow: number; subtotal: number }; checkout_url?: string }
  | { ok: false; field?: string; message: string };

// ─── Builder state ────────────────────────────────────────────────────────────

type BuilderState = {
  shaft_id?: number;
  cut_mode: "uncut" | "cut";
  cut_length: number | null;
  nock_id: number | null;
  wrap_id: number | null;
  vane_id: number | null;
  fletch_count: 0 | 3 | 4;
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
  insert_id: null,
  point_id: null,
  quantity: 6,
};

const API = {
  catalog: "/api/builder/catalog",
  price: "/api/builder/price",
  draft: "/api/builder/draft",
};

const CUT_STEP = 0.25;
const VANE_CENTER_FROM_NOCK_IN = 1.75;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Diameter compatibility schools, keyed on inner_diameter (inches).
// Covers common label aliases: 4mm ≈ .157"–.166", 5mm ≈ .197"–.204", 6.5mm ≈ .256"
type DiameterSchool = "micro" | "small" | "standard";

function diameterSchool(id: number): DiameterSchool {
  if (id <= 0.175) return "micro";    // .166 / 4mm
  if (id <= 0.215) return "small";    // .204 / 5mm
  return "standard";                  // .244 / .246 / .247 / 6.5mm
}

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

function groupShaftsByBrandModel(shafts: Shaft[]) {
  const brands = new Map<string, Map<string, Shaft[]>>();
  for (const s of shafts) {
    if (!brands.has(s.brand)) brands.set(s.brand, new Map());
    const models = brands.get(s.brand)!;
    if (!models.has(s.model)) models.set(s.model, []);
    models.get(s.model)!.push(s);
  }
  const out = Array.from(brands.entries()).map(([brand, models]) => {
    const modelRows = Array.from(models.entries()).map(([model, items]) => {
      const spines = items.slice().sort((a, b) => a.spine - b.spine);
      return { brand, model, spines };
    });
    modelRows.sort((a, b) => a.model.localeCompare(b.model));
    return { brand, models: modelRows };
  });
  const preferred = ["Easton", "Victory", "Black Eagle", "Gold Tip"];
  out.sort((a, b) => {
    const ai = preferred.indexOf(a.brand);
    const bi = preferred.indexOf(b.brand);
    if (ai === -1 && bi === -1) return a.brand.localeCompare(b.brand);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return out;
}

// Gauge math — 0° = 12 o'clock, clockwise
function polarXY(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function gaugeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const s = polarXY(cx, cy, r, startDeg);
  const e = polarXY(cx, cy, r, endDeg);
  const start360 = ((startDeg % 360) + 360) % 360;
  const end360 = ((endDeg % 360) + 360) % 360;
  let sweep = end360 - start360;
  if (sweep <= 0) sweep += 360;
  const large = sweep > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ArrowBuilderPage() {
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const shafts = catalog?.shafts ?? [];
  const wraps = catalog?.wraps ?? [];
  const vanes = catalog?.vanes ?? [];
  const inserts = catalog?.inserts ?? [];
  const points = catalog?.points ?? [];
  const nocks = catalog?.nocks ?? [];
  const productImages = catalog?.product_images ?? [];

  const [state, setState] = useState<BuilderState>({ ...DEFAULT_STATE });
  const grouped = useMemo(() => groupShaftsByBrandModel(shafts), [shafts]);
  const [openBrand, setOpenBrand] = useState<string>("Easton");
  const [openVaneBrand, setOpenVaneBrand] = useState<string | null>(null);
  const [openNockBrand, setOpenNockBrand] = useState<string | null>(null);

  const selectedShaft = useMemo(
    () => shafts.find((s) => s.id === state.shaft_id) ?? null,
    [shafts, state.shaft_id]
  );

  const selectedBrand = selectedShaft?.brand ?? openBrand;
  const selectedModel = selectedShaft?.model ?? null;

  const selectedModelGroup = useMemo(() => {
    const b = grouped.find((x) => x.brand === selectedBrand);
    if (!b || !selectedModel) return null;
    return b.models.find((m) => m.model === selectedModel) ?? null;
  }, [grouped, selectedBrand, selectedModel]);

  const [pricing, setPricing] = useState<{ per_arrow?: number; subtotal?: number }>({});
  const [serverErr, setServerErr] = useState<{ field?: string; message: string } | null>(null);
  const [pricingBusy, setPricingBusy] = useState(false);
  const [customer, setCustomer] = useState<{ email: string; name: string }>({ email: "", name: "" });
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState<{ ok: boolean; discount_amount?: number; message?: string } | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [draftResult, setDraftResult] = useState<{ order_id: number } | null>(null);
  const [openStep, setOpenStep] = useState<number>(1);

  // Read coupon code from URL params (set by abandoned-cart email link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCoupon = params.get("coupon");
    if (urlCoupon) setCouponCode(urlCoupon.toUpperCase());
  }, []);

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

  const imagesByKey = useMemo(() => {
    const m = new Map<string, ProductImage[]>();
    for (const img of productImages) {
      const key = `${img.product_type}:${img.product_id}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(img);
    }
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

  const compatibleWraps = useMemo(() => {
    if (!selectedShaft) return [];
    const od = selectedShaft.outer_diameter;
    return wraps.filter((w) => od >= w.min_outer_diameter && od <= w.max_outer_diameter);
  }, [wraps, selectedShaft]);

  const compatibleVanes = useMemo(() => {
    if (!selectedShaft) return vanes;
    const school = diameterSchool(selectedShaft.inner_diameter);
    return vanes.filter((v) => school === "micro" ? v.compatible_micro === 1 : true);
  }, [vanes, selectedShaft]);

  const groupedVanes = useMemo(() => {
    const brands = new Map<string, Vane[]>();
    for (const v of compatibleVanes) {
      if (!brands.has(v.brand)) brands.set(v.brand, []);
      brands.get(v.brand)!.push(v);
    }
    return Array.from(brands.entries())
      .map(([brand, items]) => ({ brand, items }))
      .sort((a, b) => a.brand.localeCompare(b.brand));
  }, [compatibleVanes]);

  const activVaneBrand = openVaneBrand ?? groupedVanes[0]?.brand ?? null;

  const compatibleNocks = useMemo(() => {
    if (!selectedShaft?.inner_diameter) return nocks;
    const school = diameterSchool(selectedShaft.inner_diameter);
    const filtered = nocks.filter((n) => {
      if (n.system !== "press_fit") return true;
      if (n.shaft_id_in == null) return true;
      return diameterSchool(n.shaft_id_in) === school;
    });
    const brand = selectedShaft.brand.toLowerCase();
    return [...filtered].sort((a, b) => {
      const aM = a.brand.toLowerCase() === brand ? 0 : 1;
      const bM = b.brand.toLowerCase() === brand ? 0 : 1;
      return aM - bM;
    });
  }, [nocks, selectedShaft]);

  const groupedNocks = useMemo(() => {
    const brands = new Map<string, Nock[]>();
    for (const n of compatibleNocks) {
      if (!brands.has(n.brand)) brands.set(n.brand, []);
      brands.get(n.brand)!.push(n);
    }
    return Array.from(brands.entries())
      .map(([brand, items]) => ({ brand, items }))
      .sort((a, b) => {
        const preferred = selectedShaft?.brand ?? "";
        if (a.brand === preferred) return -1;
        if (b.brand === preferred) return 1;
        return a.brand.localeCompare(b.brand);
      });
  }, [compatibleNocks, selectedShaft]);

  const activNockBrand = openNockBrand ?? groupedNocks[0]?.brand ?? null;

  const compatibleInserts = useMemo(() => {
    if (!selectedShaft?.inner_diameter) return inserts;
    const school = diameterSchool(selectedShaft.inner_diameter);
    const filtered = inserts.filter((ins) => {
      if (ins.shaft_id_in == null) return true;
      return diameterSchool(ins.shaft_id_in) === school;
    });
    const brand = selectedShaft.brand.toLowerCase();
    return [...filtered].sort((a, b) => {
      const aM = a.brand.toLowerCase() === brand ? 0 : 1;
      const bM = b.brand.toLowerCase() === brand ? 0 : 1;
      return aM - bM;
    });
  }, [inserts, selectedShaft]);

  const fieldPoints = useMemo(() => points.filter((p) => p.type === "field"), [points]);
  const broadheads = useMemo(() => points.filter((p) => p.type === "broadhead"), [points]);

  const estimated = useMemo(() => {
    if (!selectedShaft) return { taw: null as number | null, foc: null as number | null };
    const L =
      state.cut_mode === "cut" && typeof state.cut_length === "number"
        ? Number(state.cut_length)
        : null;
    if (!L || !Number.isFinite(L) || L <= 0) return { taw: null, foc: null };
    const shaftGr = Number(selectedShaft.gpi) * L;
    const wrapGr = selectedWrap ? Number(selectedWrap.weight_grains || 0) : 0;
    const vaneEach = selectedVane?.weight_grains ? Number(selectedVane.weight_grains) : 0;
    const vaneGr = state.fletch_count === 0 ? 0 : vaneEach * Number(state.fletch_count || 0);
    const nockGr = selectedNock ? Number(selectedNock.weight_grains || 0) : 0;
    const insertGr = selectedInsert
      ? Number(selectedInsert.weight_grains) +
        (selectedInsert.requires_collar ? Number(selectedInsert.collar_weight_grains ?? 0) : 0)
      : 0;
    const pointGr = selectedPoint ? Number(selectedPoint.weight_grains || 0) : 0;
    const totalGr = shaftGr + wrapGr + vaneGr + nockGr + insertGr + pointGr;
    const taw = Number.isFinite(totalGr) ? Math.round(totalGr) : null;
    if (!taw || taw <= 0) return { taw: null, foc: null };
    const shaftX = L / 2;
    const wrapLen = selectedWrap ? Number(selectedWrap.length || 0) : 0;
    const wrapX = wrapLen > 0 ? wrapLen / 2 : 0;
    const vaneX = VANE_CENTER_FROM_NOCK_IN;
    const nockX = 0;
    const frontX = L;
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
    selectedShaft, selectedWrap, selectedVane, selectedNock,
    selectedInsert, selectedPoint, state.cut_mode, state.cut_length, state.fletch_count,
  ]);

  const stepDone = useMemo(() => {
    const hasShaft = !!state.shaft_id;
    const cutOk =
      state.cut_mode === "uncut" ||
      (state.cut_mode === "cut" && typeof state.cut_length === "number");
    return {
      1: hasShaft,
      2: hasShaft && cutOk,
      3: hasShaft,
      4: hasShaft,
      5: hasShaft,
      6: hasShaft,
      7: hasShaft,
      8: hasShaft && cutOk,
    } as Record<number, boolean>;
  }, [state.shaft_id, state.cut_mode, state.cut_length]);

  useEffect(() => {
    setState((prev) => {
      if (!prev.shaft_id) return prev;
      const next: BuilderState = { ...prev };
      if (next.wrap_id && selectedShaft) {
        const w = wraps.find((x) => x.id === next.wrap_id);
        const ok =
          !!w &&
          selectedShaft.outer_diameter >= w.min_outer_diameter &&
          selectedShaft.outer_diameter <= w.max_outer_diameter;
        if (!ok) next.wrap_id = null;
      }
      if (next.vane_id && selectedShaft) {
        const v = vanes.find((x) => x.id === next.vane_id);
        const isMicro = selectedShaft.outer_diameter <= 0.265;
        if (!v || (isMicro && v.compatible_micro !== 1)) {
          next.vane_id = null;
          next.fletch_count = 0;
        }
      }
      if (
        next.cut_mode === "cut" &&
        typeof next.cut_length === "number" &&
        selectedShaft
      ) {
        if (next.cut_length > selectedShaft.max_length) next.cut_length = null;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.shaft_id]);

  const canPrice = useMemo(() => {
    const hasShaft = !!state.shaft_id;
    const cutOk =
      state.cut_mode === "uncut" ||
      (state.cut_mode === "cut" && typeof state.cut_length === "number");
    const qtyOk = state.quantity === 6 || state.quantity === 12;
    return hasShaft && cutOk && qtyOk;
  }, [state.shaft_id, state.cut_mode, state.cut_length, state.quantity]);

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
          setPricing({});
          setServerErr({ field: (data as any)?.field, message: (data as any)?.message || "Unable to price." });
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

  useEffect(() => {
    setDraftResult(null);
    if (!canPrice) { setPricing({}); setServerErr(null); return; }
    debouncedPrice({
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
    });
  }, [state, canPrice, debouncedPrice]);

  const fieldError = (f: string) => (serverErr?.field === f ? serverErr.message : null);

  function setCutMode(mode: "uncut" | "cut") {
    setState((s) => ({ ...s, cut_mode: mode, cut_length: mode === "uncut" ? null : s.cut_length }));
  }
  function setCutLength(v: string) {
    const n = Number(v);
    setState((s) => ({ ...s, cut_length: Number.isFinite(n) ? n : null }));
  }
  function setQty(q: 6 | 12) { setState((s) => ({ ...s, quantity: q })); }
  function setFletchCount(n: 0 | 3 | 4) {
    setState((s) => n === 0 ? { ...s, fletch_count: 0, vane_id: null } : { ...s, fletch_count: n });
  }

  // Silently capture a marketing lead when we have enough info (fire-and-forget)
  function captureLead() {
    const email = customer.email.trim();
    if (!email || !email.includes("@") || !state.shaft_id) return;
    const shaft = catalog?.shafts?.find((s: any) => s.id === state.shaft_id);
    const cartSnapshot = {
      shaft: shaft ? `${shaft.brand} ${shaft.model} ${shaft.spine}` : null,
      quantity: state.quantity,
    };
    fetch("/api/marketing/lead", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name: customer.name.trim() || null, cart: cartSnapshot }),
    }).catch(() => {}); // ignore errors — this is best-effort
  }

  async function validateCoupon() {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponBusy(true);
    setCouponStatus(null);
    try {
      const res = await fetch(`/api/builder/coupon?code=${encodeURIComponent(code)}`);
      const data = await res.json() as any;
      setCouponStatus(data);
    } catch {
      setCouponStatus({ ok: false, message: "Could not validate coupon." });
    } finally {
      setCouponBusy(false);
    }
  }

  async function createDraft() {
    setDraftBusy(true);
    setServerErr(null);
    setDraftResult(null);
    captureLead();
    try {
      const res = await fetch(API.draft, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          customer: { email: customer.email.trim(), name: customer.name.trim() },
          coupon_code: couponStatus?.ok ? couponCode.trim().toUpperCase() : null,
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
        setServerErr({ field: (data as any)?.field, message: (data as any)?.message || "Unable to create draft." });
        return;
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        setDraftResult({ order_id: data.order_id });
      }
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
    (state.fletch_count === 0 || !!state.vane_id);

  // ─── Loading / Error ────────────────────────────────────────────────────────

  if (loadingCatalog) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "60px 0", color: "rgba(255,255,255,.55)", fontFamily: MONO, fontSize: 13, letterSpacing: "0.5px" }}>
            <span style={{ color: GOLD, marginRight: 4 }}>◈</span> LOADING CATALOG…
          </div>
        </div>
      </div>
    );
  }

  if (catalogError || !catalog) {
    return (
      <div style={S.page}>
        <div style={S.container}>
          <div style={{ ...S.panel, padding: 20 }}>
            <div style={{ fontFamily: MONO, fontSize: 11, color: GOLD, letterSpacing: "1px", marginBottom: 8 }}>CATALOG ERROR</div>
            <div style={{ color: "rgba(255,255,255,.75)" }}>{catalogError || "Unknown error"}</div>
            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.45)", fontFamily: MONO }}>
              Verify <code>/api/builder/catalog</code> is reachable.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const doneCount = [1,2,3,4,5,6,7].filter((n) => stepDone[n]).length;

  return (
    <div style={S.page}>
      <div style={S.container}>

        {/* Page header */}
        <div style={S.pageHeader}>
          <div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "1.5px", marginBottom: 4 }}>
              PRECISION BUILD CONFIGURATOR
            </div>
            <div style={{ fontSize: 22, fontWeight: 950, letterSpacing: -0.5, color: "rgba(255,255,255,.93)" }}>
              Build Your Arrows
            </div>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            {/* Progress bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
              <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "1px" }}>
                {doneCount} / 7 CONFIGURED
              </div>
              <div style={{ width: 120, height: 3, background: "rgba(255,255,255,.08)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(doneCount / 7) * 100}%`, background: `linear-gradient(90deg, ${GOLD}, #ff9800)`, borderRadius: 2, transition: "width 0.4s ease" }}/>
              </div>
            </div>
            <div style={S.specPill}>
              EASTON · VICTORY · HARDCORE SPEC
            </div>
          </div>
        </div>

        <div style={S.grid}>
          {/* ── Left: Steps ── */}
          <div>

            {/* Step 1 — Shaft */}
            <Step n={1} title="Shaft" sub="Select model and spine"
              open={openStep === 1} done={stepDone[1]}
              onToggle={() => setOpenStep(openStep === 1 ? 0 : 1)}>
              <div style={{ marginBottom: 10, fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "1px" }}>
                SELECT BRAND
              </div>
              {/* Brand tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                {grouped.map((b) => {
                  const isActive = openBrand === b.brand || selectedBrand === b.brand;
                  return (
                    <button key={b.brand}
                      onClick={() => {
                        setOpenBrand(b.brand);
                        if (selectedShaft?.brand !== b.brand) {
                          setState((s) => ({ ...DEFAULT_STATE, quantity: s.quantity }));
                        }
                      }}
                      style={brandBtnStyle(isActive)}>
                      <BrandLogo brand={b.brand} active={isActive} />
                    </button>
                  );
                })}
              </div>

              {/* Model cards */}
              {grouped.filter((b) => b.brand === (selectedBrand || openBrand)).map((b) => (
                <div key={b.brand} style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 14 }}>
                  {b.models.map((m) => {
                    const isSelected = selectedBrand === m.brand && selectedModel === m.model;
                    const odVal = m.spines[0].outer_diameter;
                    const gpiRange = m.spines.length > 1
                      ? `${Math.min(...m.spines.map((x) => x.gpi))}–${Math.max(...m.spines.map((x) => x.gpi))}`
                      : `${m.spines[0].gpi}`;
                    return (
                      <button key={m.model}
                        onClick={() => {
                          const mid = m.spines[Math.floor(m.spines.length / 2)];
                          setState((s) => ({ ...DEFAULT_STATE, shaft_id: mid.id, quantity: s.quantity }));
                          setOpenStep(1);
                        }}
                        style={modelCardStyle(isSelected)}>
                        <div style={{ fontWeight: 950, fontSize: 13, letterSpacing: -0.2, color: isSelected ? GOLD : "rgba(255,255,255,.92)" }}>
                          {m.model}
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 2, letterSpacing: "0.3px" }}>
                          {m.brand.toUpperCase()}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          <SpecChip label="OD" value={`${odVal}"`} accent={isSelected} />
                          <SpecChip label="GPI" value={gpiRange} accent={isSelected} />
                          <SpecChip label="MAX" value={`${m.spines[0].max_length}"`} accent={isSelected} />
                        </div>
                        <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "0.3px" }}>
                          {m.spines.length} spine{m.spines.length !== 1 ? "s" : ""} available
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Spine picker */}
              {selectedModelGroup && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "1px", marginBottom: 8 }}>
                    SELECT SPINE
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {selectedModelGroup.spines.map((s) => {
                      const active = state.shaft_id === s.id;
                      return (
                        <button key={s.id}
                          onClick={() => setState((st) => ({ ...st, shaft_id: s.id }))}
                          style={spinePillStyle(active)}>
                          <span style={{ fontWeight: 950, fontSize: 14 }}>{s.spine}</span>
                          <span style={{ fontFamily: MONO, fontSize: 10, opacity: 0.7, display: "block", marginTop: 1 }}>
                            {s.gpi} gpi
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: active ? GOLD : "rgba(255,255,255,.5)", display: "block" }}>
                            {formatMoney(s.price_per_shaft)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shaft image preview */}
              {state.shaft_id && imagesFor("shaft", state.shaft_id).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <ImageCarousel images={imagesFor("shaft", state.shaft_id)} height={160} />
                </div>
              )}

              {fieldError("shaft_id") && <FieldError msg={fieldError("shaft_id")!} />}
              <div style={{ marginTop: 12 }}>
                <button style={primaryBtn(!!state.shaft_id)} onClick={() => setOpenStep(2)} disabled={!state.shaft_id}>
                  Continue →
                </button>
              </div>
            </Step>

            {/* Step 2 — Length */}
            <Step n={2} title="Length" sub="Uncut or cut to specification"
              open={openStep === 2} done={stepDone[2]} disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 2 ? 0 : 2)}>
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <button onClick={() => setCutMode("uncut")} style={segmentStyle(state.cut_mode === "uncut")}>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.5px", display: "block", marginBottom: 2 }}>UNCUT</span>
                  Full shaft length
                </button>
                <button onClick={() => setCutMode("cut")} style={segmentStyle(state.cut_mode === "cut")}>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.5px", display: "block", marginBottom: 2 }}>CUT TO LENGTH</span>
                  Specify inches
                </button>
              </div>

              {state.cut_mode === "cut" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "start" }}>
                  <div>
                    <label style={S.fieldLabel}>CUT LENGTH (inches)</label>
                    <input
                      style={inputStyle(!!fieldError("cut_length"))}
                      type="number" step={CUT_STEP} min={0}
                      placeholder="28.75"
                      value={state.cut_length ?? ""}
                      onChange={(e) => setCutLength(e.target.value)}
                    />
                    <div style={S.helpText}>
                      ¼″ increments · max {selectedShaft ? `${selectedShaft.max_length}"` : "—"}
                    </div>
                    {fieldError("cut_length") && <FieldError msg={fieldError("cut_length")!} />}
                  </div>
                  {selectedShaft && (
                    <div style={S.infoBox}>
                      <div style={{ fontFamily: MONO, fontSize: 10, color: GOLD, letterSpacing: "0.8px", marginBottom: 6 }}>SHAFT SPEC</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, lineHeight: 1.8, color: "rgba(255,255,255,.75)" }}>
                        <div>{selectedShaft.brand} {selectedShaft.model}</div>
                        <div>SPINE {selectedShaft.spine} · {selectedShaft.gpi} GPI</div>
                        <div>MAX {selectedShaft.max_length}"</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <button style={primaryBtn(true)} onClick={() => setOpenStep(3)}>Continue →</button>
              </div>
            </Step>

            {/* Step 3 — Nock */}
            <Step n={3} title="Nock" sub="Press-fit, pin, or default"
              open={openStep === 3} done={stepDone[3]} disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 3 ? 0 : 3)}>
              {compatibleNocks.length === 0 ? (
                <div style={S.helpText}>No compatible nocks for this shaft diameter.</div>
              ) : (
                <>
                  {/* Nock brand tabs */}
                  {groupedNocks.length > 1 && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      {groupedNocks.map((g) => {
                        const isActive = activNockBrand === g.brand;
                        const hasSel = g.items.some((n) => n.id === state.nock_id);
                        return (
                          <button key={g.brand}
                            onClick={() => setOpenNockBrand(g.brand)}
                            style={brandBtnStyle(isActive || hasSel)}>
                            <BrandLogo brand={g.brand} active={isActive || hasSel} />
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <OptionPill label="Default / None" active={state.nock_id == null}
                      onClick={() => setState((s) => ({ ...s, nock_id: null }))} />
                    {(groupedNocks.find((g) => g.brand === activNockBrand)?.items ?? compatibleNocks).map((n) => (
                      <OptionPill key={n.id}
                        label={n.model}
                        sub={`${n.weight_grains}gr · +${formatMoney(n.price_per_arrow)}/ea`}
                        active={state.nock_id === n.id}
                        onClick={() => setState((s) => ({ ...s, nock_id: n.id }))} />
                    ))}
                  </div>
                </>
              )}
              <div style={{ marginTop: 12 }}>
                <button style={primaryBtn(true)} onClick={() => setOpenStep(4)}>Continue →</button>
              </div>
            </Step>

            {/* Step 4 — Wrap */}
            <Step n={4} title="Wrap" sub="Optional · filtered by shaft OD"
              open={openStep === 4} done={stepDone[4]} disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 4 ? 0 : 4)}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <OptionPill label="No wrap" active={state.wrap_id == null}
                  onClick={() => setState((s) => ({ ...s, wrap_id: null }))} />
                {compatibleWraps.map((w) => (
                  <OptionPill key={w.id}
                    label={w.name}
                    sub={`${w.weight_grains}gr · +${formatMoney(w.price_per_arrow)}/ea`}
                    active={state.wrap_id === w.id}
                    onClick={() => setState((s) => ({ ...s, wrap_id: w.id }))} />
                ))}
              </div>
              <div style={{ marginTop: 12 }}>
                <button style={primaryBtn(true)} onClick={() => setOpenStep(5)}>Continue →</button>
              </div>
            </Step>

            {/* Step 5 — Vanes */}
            <Step n={5} title="Vanes" sub="None · 3-fletch · 4-fletch"
              open={openStep === 5} done={stepDone[5]} disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 5 ? 0 : 5)}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                {([0, 3, 4] as const).map((n) => (
                  <button key={n} onClick={() => setFletchCount(n)} style={segmentStyle(state.fletch_count === n)}>
                    <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.5px", display: "block", marginBottom: 2 }}>
                      {n === 0 ? "BARE" : `${n}-FLETCH`}
                    </span>
                    {n === 0 ? "No fletching" : `${n} vanes`}
                  </button>
                ))}
              </div>

              {state.fletch_count > 0 && (
                <>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "1px", marginBottom: 10 }}>
                    SELECT VANE
                  </div>

                  {/* Vane brand tabs */}
                  {groupedVanes.length > 1 && (
                    <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      {groupedVanes.map((g) => {
                        const isActive = activVaneBrand === g.brand;
                        const hasSel = g.items.some((v) => v.id === state.vane_id);
                        return (
                          <button key={g.brand}
                            onClick={() => setOpenVaneBrand(g.brand)}
                            style={brandBtnStyle(isActive || hasSel)}>
                            <BrandLogo brand={g.brand} active={isActive || hasSel} />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                    {(groupedVanes.find((g) => g.brand === activVaneBrand)?.items ?? compatibleVanes).map((v) => {
                      const sel = v.id === state.vane_id;
                      const imgs = imagesFor("vane", v.id);
                      return (
                        <ComponentCard key={v.id} selected={sel}
                          onClick={() => setState((s) => ({ ...s, vane_id: v.id }))}
                          image={imgs[0]?.url}
                          title={v.model}
                          specs={[
                            v.length ? `${v.length}" L` : null,
                            v.weight_grains ? `${v.weight_grains}gr` : null,
                            v.profile || null,
                            v.compatible_micro ? "Micro ✓" : null,
                          ].filter(Boolean) as string[]}
                          price={`+${formatMoney(v.price_per_arrow * state.fletch_count)}/arrow`}
                          badge={`${state.fletch_count}×`}
                        />
                      );
                    })}
                  </div>
                  {state.fletch_count > 0 && !state.vane_id && (
                    <FieldError msg="Select a vane or switch to bare shaft." />
                  )}
                </>
              )}
              <div style={{ marginTop: 12 }}>
                <button style={primaryBtn(true)} onClick={() => setOpenStep(6)}>Continue →</button>
              </div>
            </Step>

            {/* Step 6 — Insert */}
            <Step n={6} title="Insert" sub="Optional · weight-forward option"
              open={openStep === 6} done={stepDone[6]} disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 6 ? 0 : 6)}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: compatibleInserts.length ? 12 : 0 }}>
                <OptionPill label="No insert" active={state.insert_id == null}
                  onClick={() => setState((s) => ({ ...s, insert_id: null }))} />
              </div>
              {compatibleInserts.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {compatibleInserts.map((ins) => {
                    const sel = state.insert_id === ins.id;
                    const imgs = imagesFor("insert", ins.id);
                    const totalGr = ins.weight_grains + (ins.requires_collar ? (ins.collar_weight_grains ?? 0) : 0);
                    return (
                      <ComponentCard key={ins.id} selected={sel}
                        onClick={() => setState((s) => ({ ...s, insert_id: ins.id }))}
                        image={imgs[0]?.url}
                        title={`${ins.brand} ${ins.model}`}
                        specs={[
                          `${totalGr}gr${ins.requires_collar ? " (+collar)" : ""}`,
                          ins.system,
                          ins.type,
                        ]}
                        price={`+${formatMoney(ins.price_per_arrow)}/arrow`}
                      />
                    );
                  })}
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <button style={primaryBtn(true)} onClick={() => setOpenStep(7)}>Continue →</button>
              </div>
            </Step>

            {/* Step 7 — Point */}
            <Step n={7} title="Point" sub="Field points or broadheads"
              open={openStep === 7} done={stepDone[7]} disabled={!stepDone[1]}
              onToggle={() => setOpenStep(openStep === 7 ? 0 : 7)}>
              <div style={{ marginBottom: 10 }}>
                <OptionPill label="None" active={state.point_id == null}
                  onClick={() => setState((s) => ({ ...s, point_id: null }))} />
              </div>
              <PointPicker
                fieldPoints={fieldPoints}
                broadheads={broadheads}
                selectedId={state.point_id ?? undefined}
                imagesFor={imagesFor}
                onSelect={(id) => setState((s) => ({ ...s, point_id: id }))}
              />
              {state.point_id && imagesFor("point", state.point_id).length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <ImageCarousel images={imagesFor("point", state.point_id)} height={200} />
                </div>
              )}
              <div style={{ marginTop: 12 }}>
                <button style={primaryBtn(true)} onClick={() => setOpenStep(8)}>Continue →</button>
              </div>
            </Step>

            {/* Step 8 — Review */}
            <Step n={8} title="Review" sub="Pack size · contact · submit draft"
              open={openStep === 8} done={false} disabled={!stepDone[2]}
              onToggle={() => setOpenStep(openStep === 8 ? 0 : 8)}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "1px", marginBottom: 10 }}>
                    PACK SIZE
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {([6, 12] as const).map((q) => (
                      <button key={q} onClick={() => setQty(q)} style={segmentStyle(state.quantity === q)}>
                        <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 950, display: "block", color: state.quantity === q ? GOLD : "rgba(255,255,255,.92)" }}>{q}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.3px", opacity: 0.6 }}>ARROWS</span>
                      </button>
                    ))}
                  </div>
                  <div style={{ ...S.helpText, marginTop: 8 }}>Orders available in 6 or 12-packs.</div>
                </div>

                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "1px", marginBottom: 10 }}>
                    CONTACT
                  </div>
                  <label style={S.fieldLabel}>EMAIL ADDRESS</label>
                  <input
                    style={inputStyle(serverErr?.field === "customer.email")}
                    placeholder="you@example.com"
                    value={customer.email}
                    onChange={(e) => setCustomer((c) => ({ ...c, email: e.target.value }))}
                  />
                  <label style={{ ...S.fieldLabel, marginTop: 10 }}>NAME (optional)</label>
                  <input
                    style={inputStyle(false)}
                    placeholder="Your name"
                    value={customer.name}
                    onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                  />
                  {serverErr?.field === "customer.email" && <FieldError msg={serverErr.message} />}

                  {/* Coupon code */}
                  <label style={{ ...S.fieldLabel, marginTop: 10 }}>COUPON CODE (optional)</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      style={{ ...inputStyle(false), flex: 1, textTransform: "uppercase", fontFamily: MONO, letterSpacing: "1px" }}
                      placeholder="SAVE10-XXXXXXXX"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value.toUpperCase());
                        setCouponStatus(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && validateCoupon()}
                    />
                    <button
                      type="button"
                      onClick={validateCoupon}
                      disabled={couponBusy || !couponCode.trim()}
                      style={{
                        padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)",
                        fontSize: 12, fontFamily: MONO, cursor: "pointer", whiteSpace: "nowrap",
                      }}
                    >
                      {couponBusy ? "…" : "Apply"}
                    </button>
                  </div>
                  {couponStatus?.ok && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#4ade80", fontFamily: MONO }}>
                      ✓ ${couponStatus.discount_amount?.toFixed(2)} discount applied
                    </div>
                  )}
                  {couponStatus && !couponStatus.ok && (
                    <div style={{ marginTop: 6, fontSize: 12, color: "#f87171", fontFamily: MONO }}>
                      {couponStatus.message}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  style={ctaBtn(canProceedToDraft)}
                  onClick={createDraft}
                  disabled={!canProceedToDraft || draftBusy}>
                  {draftBusy ? "Redirecting to checkout…" : "Proceed to Checkout →"}
                </button>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.45)", fontFamily: MONO, letterSpacing: "0.3px" }}>
                  SHAFTS-ONLY BUILDS ACCEPTED
                </div>
              </div>

              {serverErr && !serverErr.field && (
                <div style={{ marginTop: 10 }}><FieldError msg={serverErr.message} /></div>
              )}
              {draftResult && (
                <div style={S.successBox}>
                  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "1px", color: GOLD }}>DRAFT CREATED</span>
                  <div style={{ marginTop: 4, fontSize: 14, fontWeight: 800 }}>Order #{draftResult.order_id}</div>
                  <div style={{ marginTop: 4, fontSize: 12, opacity: 0.75 }}>We'll be in touch to confirm your build specs.</div>
                </div>
              )}
            </Step>
          </div>

          {/* ── Right: Sticky Panel ── */}
          <div style={S.stickyPanel}>

            {/* Arrow diagram */}
            <ArrowDiagram
              shaft={selectedShaft}
              nockId={state.nock_id}
              wrapId={state.wrap_id}
              fletchCount={state.fletch_count}
              vaneId={state.vane_id}
              insertId={state.insert_id}
              pointId={state.point_id}
              pointType={selectedPoint?.type ?? null}
              cutMode={state.cut_mode}
              cutLength={state.cut_length}
            />

            {/* Metrics row */}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <FocGauge foc={estimated.foc} />
              <TawDisplay taw={estimated.taw} />
            </div>

            {/* Summary card */}
            <div style={{ ...S.panel, marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "1px", marginBottom: 4 }}>
                    BUILD SUMMARY
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 980, fontFamily: MONO, letterSpacing: -0.5, color: "rgba(255,255,255,.95)" }}>
                    {formatMoney(pricing.per_arrow)}
                    <span style={{ fontSize: 12, fontWeight: 400, color: "rgba(255,255,255,.45)", marginLeft: 4 }}>/ arrow</span>
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
                    {state.cut_mode === "uncut" ? "UNCUT" : "CUT"} · {pricingBusy ? "PRICING…" : "LIVE PRICE"}
                  </div>
                </div>
                <div style={S.specPill}>{state.quantity}× PACK</div>
              </div>

              <div style={S.divider} />

              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 10 }}>
                <SummaryLine label="SHAFT" value={selectedShaft ? `${selectedShaft.brand} ${selectedShaft.model} / ${selectedShaft.spine}` : "—"} />
                <SummaryLine label="LENGTH" value={
                  state.cut_mode === "uncut" ? "Uncut" :
                  typeof state.cut_length === "number" ? `${state.cut_length}"` : "—"
                } />
                <SummaryLine label="NOCK" value={selectedNock ? `${selectedNock.brand} ${selectedNock.model}` : "Default"} />
                <SummaryLine label="WRAP" value={selectedWrap ? selectedWrap.name : "None"} />
                <SummaryLine label="VANES" value={
                  state.fletch_count === 0 ? "None" :
                  selectedVane ? `${selectedVane.brand} ${selectedVane.model} (${state.fletch_count}×)` :
                  `${state.fletch_count}× — select vane`
                } />
                <SummaryLine label="INSERT" value={
                  selectedInsert ? `${selectedInsert.brand} ${selectedInsert.model}${selectedInsert.requires_collar ? " +collar" : ""}` : "None"
                } />
                <SummaryLine label="POINT" value={
                  selectedPoint ? (`${selectedPoint.brand || ""} ${selectedPoint.model || ""}`.trim() || `${selectedPoint.type} ${selectedPoint.weight_grains}gr`) : "None"
                } />
              </div>

              <div style={S.divider} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, marginBottom: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.4)", letterSpacing: "1px" }}>SUBTOTAL</div>
                <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 900, color: "rgba(255,255,255,.93)" }}>
                  {formatMoney(pricing.subtotal)}
                </div>
              </div>

              {serverErr?.field && (
                <div style={S.warnBox}>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: "#f59e0b", letterSpacing: "0.8px", marginBottom: 4 }}>NEEDS ATTENTION</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>{serverErr.message}</div>
                </div>
              )}

              <div style={{ ...S.infoBox, marginTop: 10 }}>
                <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "1px", marginBottom: 8 }}>
                  WHAT'S INCLUDED
                </div>
                <ul style={{ margin: "0 0 0 14px", padding: 0, fontSize: 12, lineHeight: 1.8, color: "rgba(255,255,255,.7)" }}>
                  <li>Shafts packed safely</li>
                  <li>Cut-to-length when selected</li>
                  <li>Component assembly (when selected)</li>
                  <li>QC · straightness check · packing</li>
                </ul>
                <div style={{ marginTop: 8, fontSize: 11, color: "rgba(255,255,255,.45)", lineHeight: 1.55 }}>
                  Correct spine · FOC-minded builds · broadhead-true tuning.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Arrow Diagram ────────────────────────────────────────────────────────────

type DiagramProps = {
  shaft: Shaft | null;
  nockId: number | null;
  wrapId: number | null;
  fletchCount: 0 | 3 | 4;
  vaneId: number | null;
  insertId: number | null;
  pointId: number | null;
  pointType: "field" | "broadhead" | null;
  cutMode: "uncut" | "cut";
  cutLength: number | null;
};

function ArrowDiagram({ shaft, nockId, wrapId, fletchCount, vaneId, insertId, pointId, pointType, cutMode, cutLength }: DiagramProps) {
  const hasShaft = !!shaft;
  const hasNock   = nockId   != null;
  const hasWrap   = wrapId   != null;
  const hasVanes  = fletchCount > 0 && vaneId != null;
  const hasInsert = insertId != null;
  const hasPoint  = pointId  != null;
  const fletchOn  = fletchCount > 0;

  // ── Geometry ──────────────────────────────────────────────────────────────
  // viewBox 0 0 820 265
  // Shaft: x=52..700, center y=128, height=20 → y0=118, y1=138
  const SY = 128; const SH = 20;
  const SY0 = SY - SH / 2;   // 118
  const SY1 = SY + SH / 2;   // 138
  const SX0 = 52;  // shaft start (nock junction)
  const SX1 = 700; // shaft end (point junction)

  // Wrap band edges
  const WX0 = SX0 + 4;  // 56
  const WX1 = SX0 + 100; // 152

  // Vane attachment on shaft (starts a few px after nock, ends ~20px before wrap end)
  const VX0 = SX0 + 12;  // 64  – front attachment
  const VX1 = SX0 + 110; // 162 – rear attachment (near nock / wrap)

  // Insert collar zone (front of shaft before point)
  const IX0 = SX1 - 52;  // 648
  const IX1 = SX1;        // 700

  const cutX = (() => {
    if (cutMode !== "cut" || !cutLength || !shaft) return null;
    return SX0 + Math.min(cutLength / shaft.max_length, 1) * (SX1 - SX0);
  })();

  // ── Colors ────────────────────────────────────────────────────────────────
  const T       = "0.3s";
  const GOLD_C  = "rgba(255,212,0,.90)";
  const GOLD_D  = "rgba(255,212,0,.50)";
  const SHAFT_C = "rgba(200,212,222,.70)";
  const SHAFT_N = "rgba(255,255,255,.07)";
  const DIM     = "rgba(255,255,255,.09)";
  const CYAN    = "rgba(80,190,255,.75)";
  const CYAN_D  = "rgba(80,190,255,.16)";
  const MONO_FONT = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

  const lblFill  = (on: boolean, color = GOLD_C) => on ? color : "rgba(255,255,255,.26)";
  const connFill = (on: boolean) => on ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.05)";

  // ── Vane fill ─────────────────────────────────────────────────────────────
  const vaneFill = (primary: boolean) =>
    hasShaft && hasVanes  ? (primary ? GOLD_D : "rgba(255,212,0,.28)") :
    hasShaft && fletchOn  ? (primary ? "rgba(255,212,0,.18)" : "rgba(255,212,0,.10)") :
    DIM;

  // Vanes: flat (blunt) edge at VX0 (nock/back), taper forward to VX1 (point direction)
  // Primary: H=42px tall at back, curves down to shaft at front
  const topVane   = `M ${VX0} ${SY0} L ${VX0} ${SY0-42} Q ${VX0+44} ${SY0-44} ${VX1} ${SY0} Z`;
  const botVane   = `M ${VX0} ${SY1} L ${VX0} ${SY1+42} Q ${VX0+44} ${SY1+44} ${VX1} ${SY1} Z`;

  // 3rd vane (120° offset — shorter, dimmer)
  const top3rd    = `M ${VX0} ${SY0} L ${VX0} ${SY0-26} Q ${VX0+42} ${SY0-28} ${VX1-4} ${SY0} Z`;
  const bot3rd    = `M ${VX0} ${SY1} L ${VX0} ${SY1+26} Q ${VX0+42} ${SY1+28} ${VX1-4} ${SY1} Z`;

  // 4th vane (side vane, narrowest)
  const top4th    = `M ${VX0} ${SY0} L ${VX0} ${SY0-15} Q ${VX0+42} ${SY0-16} ${VX1-6} ${SY0} Z`;
  const bot4th    = `M ${VX0} ${SY1} L ${VX0} ${SY1+15} Q ${VX0+42} ${SY1+16} ${VX1-6} ${SY1} Z`;

  // Nock: cylindrical body (x=28..52) with string groove notch at rear (x=16..28)
  // Body is slightly taller than shaft; groove is a narrow step inward
  const nockPath  = `M ${SX0} ${SY0} L 34 ${SY0-2} L 28 ${SY0+1} L 20 ${SY-3} L 16 ${SY} L 20 ${SY+3} L 28 ${SY1-1} L 34 ${SY1+2} L ${SX0} ${SY1} Z`;

  const isBroadhead = hasPoint && pointType === "broadhead";

  // Field point: collar shoulder + tapered body to tip
  const pointPath = `M ${IX0} ${SY0-2} L ${IX0+20} ${SY0-2} L ${IX0+20} ${SY0} L ${SX1} ${SY0} L 798 ${SY} L ${SX1} ${SY1} L ${IX0+20} ${SY1} L ${IX0+20} ${SY1+2} L ${IX0} ${SY1+2} Z`;

  // Broadhead: same collar + ferrule body (no taper) + two swept blades to tip
  // Ferrule body runs at full shaft height from SX1 forward; blades sweep wide then meet at tip
  const bhFerulePath = `M ${IX0} ${SY0-2} L ${IX0+20} ${SY0-2} L ${IX0+20} ${SY0} L ${SX1+44} ${SY0} L ${SX1+44} ${SY1} L ${IX0+20} ${SY1} L ${IX0+20} ${SY1+2} L ${IX0} ${SY1+2} Z`;
  const bhTopBlade   = `M ${SX1} ${SY0} L ${SX1+4} ${SY0-12} L ${SX1+22} ${SY0-42} L 798 ${SY} L ${SX1+44} ${SY0} Z`;
  const bhBotBlade   = `M ${SX1} ${SY1} L ${SX1+4} ${SY1+12} L ${SX1+22} ${SY1+42} L 798 ${SY} L ${SX1+44} ${SY1} Z`;

  return (
    <div style={{ background: "#030305", borderRadius: 14, border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
      <svg viewBox="0 0 820 265" style={{ width: "100%", display: "block" }}>
        <defs>
          <pattern id="adot" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="11" cy="11" r="0.55" fill="rgba(255,255,255,.04)" />
          </pattern>
        </defs>

        {/* Dot grid */}
        <rect x="0" y="0" width="820" height="265" fill="url(#adot)" />

        {/* Centerline */}
        <line x1="12" y1={SY} x2="808" y2={SY}
          stroke="rgba(255,255,255,.03)" strokeWidth="0.5" strokeDasharray="6,4,1,4" />

        {/* ── Shaft body ── */}
        <rect x={SX0} y={SY0} width={SX1 - SX0} height={SH} rx="2"
          fill={hasShaft ? SHAFT_C : SHAFT_N}
          style={{ transition: `fill ${T}` }} />

        {/* ── Wrap band ── */}
        <rect x={WX0} y={SY0} width={WX1 - WX0} height={SH} rx="0"
          fill={hasShaft && hasWrap ? GOLD_D : DIM}
          opacity={hasShaft ? 1 : 0.25}
          style={{ transition: `fill ${T}, opacity ${T}` }} />
        {/* Wrap edge ticks */}
        {hasShaft && (<>
          <line x1={WX0} y1={SY0-2} x2={WX0} y2={SY1+2} stroke={hasWrap ? GOLD_C : "rgba(255,255,255,.14)"} strokeWidth="1.5" style={{ transition: `stroke ${T}` }} />
          <line x1={WX1} y1={SY0-2} x2={WX1} y2={SY1+2} stroke={hasWrap ? GOLD_C : "rgba(255,255,255,.14)"} strokeWidth="1.5" style={{ transition: `stroke ${T}` }} />
        </>)}

        {/* ── Vanes ── rendered back-to-front so primary pair is on top ── */}

        {/* 3rd / 4th secondary vanes (behind primary) */}
        {(fletchCount === 3 || fletchCount === 4) && (<>
          <path d={top3rd} fill={vaneFill(false)} opacity={hasShaft ? 0.7 : 0.12} style={{ transition: `fill ${T}` }} />
          <path d={bot3rd} fill={vaneFill(false)} opacity={hasShaft ? 0.7 : 0.12} style={{ transition: `fill ${T}` }} />
        </>)}
        {fletchCount === 4 && (<>
          <path d={top4th} fill={vaneFill(false)} opacity={hasShaft ? 0.55 : 0.08} style={{ transition: `fill ${T}` }} />
          <path d={bot4th} fill={vaneFill(false)} opacity={hasShaft ? 0.55 : 0.08} style={{ transition: `fill ${T}` }} />
        </>)}

        {/* Primary top & bottom vanes */}
        <path d={topVane} fill={vaneFill(true)} opacity={hasShaft ? 1 : 0.15} style={{ transition: `fill ${T}, opacity ${T}` }} />
        <path d={botVane} fill={vaneFill(true)} opacity={hasShaft ? 1 : 0.15} style={{ transition: `fill ${T}, opacity ${T}` }} />

        {/* ── Nock ── */}
        <path d={nockPath}
          fill={hasShaft && hasNock ? GOLD_C : (hasShaft ? "rgba(255,255,255,.30)" : SHAFT_N)}
          style={{ transition: `fill ${T}` }} />

        {/* ── Insert collar zone ── */}
        <rect x={IX0} y={SY0} width={IX1 - IX0} height={SH} rx="0"
          fill={hasShaft && hasInsert ? CYAN : CYAN_D}
          opacity={hasShaft ? 0.82 : 0.15}
          style={{ transition: `fill ${T}, opacity ${T}` }} />

        {/* ── Point ── field-point or broadhead based on selection ── */}
        {!isBroadhead && (
          <path d={pointPath}
            fill={hasShaft && hasPoint ? GOLD_C : (hasShaft ? "rgba(255,255,255,.36)" : SHAFT_N)}
            style={{ transition: `fill ${T}` }} />
        )}
        {isBroadhead && (<>
          <path d={bhFerulePath} fill={GOLD_C} style={{ transition: `fill ${T}` }} />
          <path d={bhTopBlade}   fill={GOLD_C} opacity={0.82} style={{ transition: `fill ${T}` }} />
          <path d={bhBotBlade}   fill={GOLD_C} opacity={0.82} style={{ transition: `fill ${T}` }} />
          {/* Blade edge highlight */}
          <line x1={SX1+4} y1={SY0-12} x2={798} y2={SY} stroke="rgba(255,255,255,.30)" strokeWidth="0.8" />
          <line x1={SX1+4} y1={SY1+12} x2={798} y2={SY} stroke="rgba(255,255,255,.30)" strokeWidth="0.8" />
        </>)}

        {/* ── Cut line overlay ── */}
        {cutX !== null && (<>
          <rect x={cutX} y={SY0 - 6} width={SX1 - cutX + 120} height={SH + 12}
            fill="rgba(0,0,0,.62)" rx="1" />
          <line x1={cutX} y1={SY0 - 18} x2={cutX} y2={SY1 + 12}
            stroke={GOLD_C} strokeWidth="1.5" strokeDasharray="4,3" />
          {/* Dimension line */}
          <line x1={SX0} y1={SY1 + 20} x2={cutX} y2={SY1 + 20} stroke={GOLD_D} strokeWidth="0.75" />
          <line x1={SX0} y1={SY1 + 16} x2={SX0} y2={SY1 + 24} stroke={GOLD_D} strokeWidth="0.75" />
          <line x1={cutX} y1={SY1 + 16} x2={cutX} y2={SY1 + 24} stroke={GOLD_D} strokeWidth="0.75" />
          <text x={(SX0 + cutX) / 2} y={SY1 + 35} textAnchor="middle"
            fill={GOLD_D} fontSize="9" fontFamily={MONO_FONT} letterSpacing="0.5">
            {cutLength?.toFixed(2)}"
          </text>
        </>)}

        {/* ── Uncut span ── */}
        {hasShaft && cutMode === "uncut" && (<>
          <line x1={SX0} y1={SY1 + 20} x2={SX1} y2={SY1 + 20} stroke="rgba(255,255,255,.06)" strokeWidth="0.75" />
          <line x1={SX0} y1={SY1 + 16} x2={SX0} y2={SY1 + 24} stroke="rgba(255,255,255,.06)" strokeWidth="0.75" />
          <line x1={SX1} y1={SY1 + 16} x2={SX1} y2={SY1 + 24} stroke="rgba(255,255,255,.06)" strokeWidth="0.75" />
          <text x={(SX0 + SX1) / 2} y={SY1 + 35} textAnchor="middle"
            fill="rgba(255,255,255,.16)" fontSize="9" fontFamily={MONO_FONT} letterSpacing="0.5">
            UNCUT · MAX {shaft?.max_length}"
          </text>
        </>)}

        {/* ── Labels ── */}
        {([
          { x: 34,          y0: SY1 + 6,  label: "NOCK",   on: hasShaft && hasNock },
          { x: WX0 + 48,    y0: SY1,      label: "WRAP",   on: hasShaft && hasWrap },
          { x: VX0 + 53,    y0: SY1,      label: fletchOn ? `${fletchCount}× VANE` : "VANES", on: hasShaft && hasVanes, yOff: 10 },
          { x: 376,         y0: SY1,      label: hasShaft ? `${shaft!.brand.toUpperCase()} ${shaft!.model.toUpperCase()} · ${shaft!.spine}` : "— SHAFT —", on: hasShaft, color: hasShaft ? "rgba(255,255,255,.45)" : undefined },
          { x: IX0 + 26,    y0: SY1,      label: "INSERT", on: hasShaft && hasInsert, color: hasShaft && hasInsert ? CYAN : undefined },
          { x: SX1 + 50,    y0: SY1,      label: "POINT",  on: hasShaft && hasPoint },
        ] as Array<{ x: number; y0: number; label: string; on: boolean; yOff?: number; color?: string }>).map((item, i) => {
          const lineEnd = 215 + (item.yOff ?? 0);
          return (
            <g key={i}>
              <line x1={item.x} y1={item.y0} x2={item.x} y2={lineEnd - 8}
                stroke={connFill(item.on)} strokeWidth="0.5" strokeDasharray="2,2" />
              <text x={item.x} y={lineEnd} textAnchor="middle"
                fill={item.color ?? lblFill(item.on)} fontSize="8.5"
                fontFamily={MONO_FONT} letterSpacing="0.8"
                style={{ transition: `fill ${T}` }}>
                {item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── FOC Gauge ────────────────────────────────────────────────────────────────

function FocGauge({ foc }: { foc: number | null }) {
  // Gauge: 225° (7:30) to 135° (4:30) clockwise = 270° sweep
  // 0% = 225°, 20% = 135° (via 495°)
  const CX = 100; const CY = 102;
  const R_OUT = 72; const R_IN = 57;
  const R_MID = (R_OUT + R_IN) / 2;
  const STROKE_W = R_OUT - R_IN;
  const MAX = 20;
  const START = 225; const SWEEP = 270;

  const v = foc != null ? Math.min(Math.max(foc, 0), MAX) : null;
  const vAngle = v != null ? START + (v / MAX) * SWEEP : null;

  const color = v == null ? "rgba(255,255,255,.2)"
    : v < 8  ? "#f59e0b"
    : v < 12 ? "#eab308"
    : v < 16 ? "#22c55e"
    : v < 20 ? "#84cc16"
    : "#ef4444";

  // Zone boundaries in degrees
  const zones: Array<{ s: number; e: number; c: string }> = [
    { s: 225, e: 225 + (8 / MAX) * SWEEP, c: "#f59e0b" },
    { s: 225 + (8 / MAX) * SWEEP, e: 225 + (12 / MAX) * SWEEP, c: "#eab308" },
    { s: 225 + (12 / MAX) * SWEEP, e: 225 + (16 / MAX) * SWEEP, c: "#22c55e" },
    { s: 225 + (16 / MAX) * SWEEP, e: 495, c: "#84cc16" },
  ];

  const MONO_FONT = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

  return (
    <div style={{ flex: "1 1 0", background: "rgba(0,0,0,.3)", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", padding: "8px 6px 4px", display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ fontFamily: MONO_FONT, fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: "1.5px", marginBottom: 2, alignSelf: "flex-start", paddingLeft: 6 }}>
        F.O.C.
      </div>
      <svg viewBox="0 0 200 140" style={{ width: "100%", display: "block" }}>
        {/* Background arc */}
        <path d={gaugeArc(CX, CY, R_MID, START, 495)}
          fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={STROKE_W} strokeLinecap="butt" />

        {/* Zone arcs */}
        {zones.map((z, i) => (
          <path key={i} d={gaugeArc(CX, CY, R_MID, z.s, z.e)}
            fill="none" stroke={z.c} strokeWidth={STROKE_W - 2} strokeLinecap="butt" opacity={0.22} />
        ))}

        {/* Value arc */}
        {v != null && vAngle != null && (
          <path d={gaugeArc(CX, CY, R_MID, START, vAngle)}
            fill="none" stroke={color} strokeWidth={STROKE_W - 3} strokeLinecap="butt" opacity={0.9}
            style={{ transition: "stroke 0.35s" }} />
        )}

        {/* Tick marks */}
        {[0, 8, 12, 16, 20].map((val) => {
          const a = START + (val / MAX) * SWEEP;
          const p1 = polarXY(CX, CY, R_OUT + 3, a);
          const p2 = polarXY(CX, CY, R_OUT + 9, a);
          return <line key={val} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
            stroke="rgba(255,255,255,.18)" strokeWidth="0.8" />;
        })}

        {/* Scale labels */}
        {[{ val: 0, anchor: "start" }, { val: 20, anchor: "end" }].map(({ val, anchor }) => {
          const a = START + (val / MAX) * SWEEP;
          const p = polarXY(CX, CY, R_OUT + 18, a);
          return (
            <text key={val} x={p.x} y={p.y + 3}
              textAnchor={anchor as any}
              fill="rgba(255,255,255,.22)" fontSize="8.5" fontFamily={MONO_FONT}>
              {val}%
            </text>
          );
        })}

        {/* IDEAL label at 14% mark */}
        {(() => {
          const p = polarXY(CX, CY, R_IN - 10, START + (14 / MAX) * SWEEP);
          return (
            <text x={p.x} y={p.y + 3} textAnchor="middle"
              fill="rgba(34,197,94,.5)" fontSize="7" fontFamily={MONO_FONT} letterSpacing="0.5">
              IDEAL
            </text>
          );
        })()}

        {/* Center value */}
        <text x={CX} y={CY - 2} textAnchor="middle"
          fill={color} fontSize="24" fontWeight="700" fontFamily={MONO_FONT}
          style={{ transition: "fill 0.35s" }}>
          {v != null ? v.toFixed(1) : "—"}
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle"
          fill="rgba(255,255,255,.3)" fontSize="8.5" fontFamily={MONO_FONT} letterSpacing="0.8">
          % FOC
        </text>
      </svg>
    </div>
  );
}

// ─── TAW Display ─────────────────────────────────────────────────────────────

function TawDisplay({ taw }: { taw: number | null }) {
  // Typical hunting arrow: 350–550gr
  const MIN_REF = 350; const MAX_REF = 600;
  const pct = taw != null ? Math.min(Math.max((taw - MIN_REF) / (MAX_REF - MIN_REF), 0), 1) : 0;
  const MONO_FONT = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

  const barColor = taw == null ? "rgba(255,255,255,.1)"
    : taw < 350 ? "#f59e0b"
    : taw > 550 ? "#f59e0b"
    : "#22c55e";

  return (
    <div style={{ flex: "0 0 auto", width: 110, background: "rgba(0,0,0,.3)", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", padding: "10px 10px 8px", display: "flex", flexDirection: "column" }}>
      <div style={{ fontFamily: MONO_FONT, fontSize: 9, color: "rgba(255,255,255,.35)", letterSpacing: "1.5px", marginBottom: 8 }}>
        TOTAL WEIGHT
      </div>
      <div style={{ fontFamily: MONO_FONT, fontSize: 26, fontWeight: 800, letterSpacing: -0.5, color: taw ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.25)", lineHeight: 1, marginBottom: 2 }}>
        {taw ?? "—"}
      </div>
      <div style={{ fontFamily: MONO_FONT, fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: "0.5px", marginBottom: 10 }}>
        GRAINS
      </div>
      {/* Range bar */}
      <div style={{ marginTop: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO_FONT, fontSize: 8, color: "rgba(255,255,255,.2)", marginBottom: 3 }}>
          <span>350</span><span>600</span>
        </div>
        <div style={{ height: 3, background: "rgba(255,255,255,.07)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: taw ? `${pct * 100}%` : "0%", background: barColor, borderRadius: 2, transition: "width 0.4s ease, background 0.3s" }} />
        </div>
        <div style={{ fontFamily: MONO_FONT, fontSize: 8, color: barColor, marginTop: 3, transition: "color 0.3s" }}>
          {taw == null ? "—" : taw < 350 ? "LIGHT" : taw > 550 ? "HEAVY" : "NOMINAL"}
        </div>
      </div>
    </div>
  );
}

// ─── Step ─────────────────────────────────────────────────────────────────────

function Step(props: {
  n: number; title: string; sub: string;
  open: boolean; done: boolean; disabled?: boolean;
  onToggle: () => void; children: React.ReactNode;
}) {
  const { n, title, sub, open, done, disabled, onToggle, children } = props;
  const MONO_FONT = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

  return (
    <div style={{
      borderRadius: 16,
      border: `1px solid ${open ? "rgba(255,212,0,.18)" : "rgba(255,255,255,.08)"}`,
      background: open ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.018)",
      marginBottom: 8,
      overflow: "hidden",
      transition: "border-color 0.2s, background 0.2s",
    }}>
      <button
        onClick={onToggle}
        disabled={disabled}
        style={{
          width: "100%", border: "none", padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
          color: "rgba(255,255,255,.92)",
          background: "transparent",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}>
        {/* Step number */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          display: "grid", placeItems: "center",
          fontFamily: MONO_FONT, fontSize: 11, fontWeight: 700,
          background: done ? "rgba(255,212,0,.15)" : (open ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)"),
          border: `1px solid ${done ? "rgba(255,212,0,.35)" : "rgba(255,255,255,.1)"}`,
          color: done ? GOLD : "rgba(255,255,255,.7)",
          transition: "background 0.2s, border-color 0.2s, color 0.2s",
        }}>
          {done ? "✓" : n}
        </div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: -0.1 }}>{title}</span>
            {done && (
              <span style={{ fontFamily: MONO_FONT, fontSize: 9, color: GOLD, letterSpacing: "0.5px", background: "rgba(255,212,0,.08)", padding: "2px 7px", borderRadius: 999, border: "1px solid rgba(255,212,0,.2)" }}>
                DONE
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.45)", marginTop: 2 }}>{sub}</div>
        </div>
        <div style={{ opacity: 0.5, fontSize: 14, flexShrink: 0 }}>{open ? "▾" : "▸"}</div>
      </button>

      {open && !disabled && (
        <div style={{ padding: "4px 16px 16px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
          {children}
        </div>
      )}
      {disabled && (
        <div style={{ padding: "8px 16px", fontSize: 11, color: "rgba(255,255,255,.35)", borderTop: "1px solid rgba(255,255,255,.06)", fontFamily: "ui-monospace, monospace", letterSpacing: "0.3px" }}>
          Complete step {props.n - 1} first.
        </div>
      )}
    </div>
  );
}

// ─── ComponentCard ────────────────────────────────────────────────────────────

function ComponentCardPlaceholder() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="4" y="13" width="20" height="2" rx="1" fill="rgba(255,255,255,.12)" />
      <circle cx="14" cy="14" r="4" stroke="rgba(255,255,255,.10)" strokeWidth="1" fill="none" />
    </svg>
  );
}

function ComponentCard({ selected, onClick, image, title, specs, price, badge }: {
  selected: boolean; onClick: () => void;
  image?: string; title: string; specs: string[]; price: string; badge?: string;
}) {
  const MONO_FONT = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = image && !imgFailed;

  return (
    <button onClick={onClick} style={{
      textAlign: "left", cursor: "pointer",
      borderRadius: 12,
      border: `1px solid ${selected ? "rgba(255,212,0,.45)" : "rgba(255,255,255,.10)"}`,
      background: selected ? "rgba(255,212,0,.06)" : "rgba(255,255,255,.025)",
      boxShadow: selected ? "0 0 0 3px rgba(255,212,0,.08)" : "none",
      padding: 0,
      color: "rgba(255,255,255,.92)",
      overflow: "hidden",
      display: "flex", flexDirection: "row",
      transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
    }}>
      <div style={{ width: 64, height: 64, flexShrink: 0, overflow: "hidden", background: "rgba(0,0,0,.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {showImg ? (
          <img src={image} alt="" onError={() => setImgFailed(true)} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        ) : (
          <ComponentCardPlaceholder />
        )}
      </div>
      <div style={{ padding: "8px 10px", flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: -0.1, color: selected ? GOLD : "rgba(255,255,255,.92)", lineHeight: 1.2 }}>
            {title}
          </div>
          {badge && (
            <span style={{ fontFamily: MONO_FONT, fontSize: 10, color: GOLD, background: "rgba(255,212,0,.1)", border: "1px solid rgba(255,212,0,.2)", borderRadius: 999, padding: "1px 5px", flexShrink: 0 }}>
              {badge}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 5 }}>
          {specs.map((s, i) => (
            <span key={i} style={{ fontFamily: MONO_FONT, fontSize: 9.5, color: "rgba(255,255,255,.45)", background: "rgba(255,255,255,.05)", padding: "2px 5px", borderRadius: 4 }}>
              {s}
            </span>
          ))}
        </div>
        <div style={{ fontFamily: MONO_FONT, fontSize: 10, color: selected ? GOLD : "rgba(255,212,0,.6)", marginTop: 6 }}>
          {price}
        </div>
      </div>
    </button>
  );
}

// ─── PointPicker ─────────────────────────────────────────────────────────────

function PointPicker({ fieldPoints, broadheads, selectedId, imagesFor, onSelect }: {
  fieldPoints: Point[]; broadheads: Point[];
  selectedId?: number;
  imagesFor: (type: ProductType, id?: number | null) => ProductImage[];
  onSelect: (id: number) => void;
}) {
  const [tab, setTab] = useState<"field" | "broadhead">("broadhead");
  const items = tab === "field" ? fieldPoints : broadheads;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["broadhead", "field"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={tabBtnStyle(tab === t)}>
            {t === "field" ? "Field Points" : "Broadheads"}
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
        {items.map((p) => {
          const label = `${p.brand || ""} ${p.model || ""}`.trim() || (p.type === "field" ? "Field Point" : "Broadhead");
          const imgs = imagesFor(p.type === "field" ? "point" : "point", p.id);
          return (
            <ComponentCard key={p.id}
              selected={p.id === selectedId}
              onClick={() => onSelect(p.id)}
              image={imgs[0]?.url}
              title={label}
              specs={[`${p.weight_grains}gr`, p.thread || "8-32", p.type === "broadhead" ? "Broadhead" : "Field"]}
              price={`+${formatMoney(p.price)}/arrow`}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── ImageCarousel ────────────────────────────────────────────────────────────

function ImageLightbox({ url, alt, onClose }: { url: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,.88)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "zoom-out",
      }}
    >
      <img
        src={url}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: "92vw", maxHeight: "88vh",
          objectFit: "contain", borderRadius: 12,
          boxShadow: "0 24px 80px rgba(0,0,0,.8)",
          cursor: "default",
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 20, right: 20,
          background: "rgba(255,255,255,.12)", border: "none",
          color: "#fff", borderRadius: 999, width: 36, height: 36,
          fontSize: 18, cursor: "pointer", lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}

function ImageCarousel({ images, height = 200 }: { images: ProductImage[]; height?: number }) {
  const [i, setI] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (!images?.length) return (
    <div style={{ height, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.2)", display: "grid", placeItems: "center", fontSize: 11, color: "rgba(255,255,255,.3)", fontFamily: "ui-monospace, monospace", letterSpacing: "0.5px" }}>
      NO IMAGE
    </div>
  );
  const cur = images[Math.min(i, images.length - 1)];
  return (
    <div>
      {lightbox && <ImageLightbox url={cur.url} alt={cur.alt ?? ""} onClose={() => setLightbox(false)} />}
      <div
        onClick={() => setLightbox(true)}
        style={{ height, borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.2)", cursor: "zoom-in", display: "flex", alignItems: "center", justifyContent: "center" }}
      >
        <img
          src={cur.url}
          alt={cur.alt ?? ""}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }}
          loading="lazy"
        />
      </div>
      {images.length > 1 && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <button style={miniBtn()} onClick={() => setI((v) => (v - 1 + images.length) % images.length)}>‹</button>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.4)", fontFamily: "ui-monospace, monospace" }}>{i + 1}/{images.length}</div>
          <button style={miniBtn()} onClick={() => setI((v) => (v + 1) % images.length)}>›</button>
          <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
            {images.slice(0, 8).map((_, idx) => (
              <button key={idx} onClick={() => setI(idx)} style={{ width: 6, height: 6, borderRadius: 999, border: "none", background: idx === i ? GOLD : "rgba(255,255,255,.15)", cursor: "pointer", padding: 0 }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Small atoms ─────────────────────────────────────────────────────────────

function FieldError({ msg }: { msg: string }) {
  return (
    <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 10, border: "1px solid rgba(255,100,100,.28)", background: "rgba(255,60,60,.05)", display: "flex", gap: 6, alignItems: "center", fontSize: 12, color: "rgba(255,200,200,.9)" }}>
      <span style={{ fontWeight: 900 }}>⚠</span> {msg}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11 }}>
      <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color: "rgba(255,255,255,.35)", letterSpacing: "0.5px", flexShrink: 0 }}>{label}</div>
      <div style={{ fontWeight: 700, textAlign: "right", color: "rgba(255,255,255,.8)", fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{value}</div>
    </div>
  );
}

function SpecChip({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "baseline", fontFamily: "ui-monospace, 'SF Mono', monospace", fontSize: 10, background: accent ? "rgba(255,212,0,.07)" : "rgba(255,255,255,.05)", border: `1px solid ${accent ? "rgba(255,212,0,.2)" : "rgba(255,255,255,.08)"}`, borderRadius: 5, padding: "2px 5px" }}>
      <span style={{ color: "rgba(255,255,255,.35)", letterSpacing: "0.3px" }}>{label}</span>
      <span style={{ color: accent ? GOLD : "rgba(255,255,255,.7)", fontWeight: 700 }}>{value}</span>
    </span>
  );
}

function OptionPill({ label, sub, active, onClick }: { label: string; sub?: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      borderRadius: 999,
      border: `1px solid ${active ? "rgba(255,212,0,.5)" : "rgba(255,255,255,.12)"}`,
      background: active ? "rgba(255,212,0,.09)" : "rgba(0,0,0,.18)",
      padding: sub ? "8px 12px" : "8px 12px",
      fontSize: 12, fontWeight: active ? 900 : 600,
      color: active ? GOLD : "rgba(255,255,255,.8)",
      cursor: "pointer", display: "inline-flex", flexDirection: "column", gap: 1, alignItems: "flex-start",
      transition: "border-color 0.2s, background 0.2s, color 0.2s",
    }}>
      <span>{label}</span>
      {sub && <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 9.5, color: active ? "rgba(255,212,0,.7)" : "rgba(255,255,255,.35)", letterSpacing: "0.2px" }}>{sub}</span>}
    </button>
  );
}

// ─── Brand Logo ───────────────────────────────────────────────────────────────

const BRAND_MARK: Record<string, { lines: string[]; accentColor: string; tracking: string; logoUrl?: string }> = {
  "Easton": {
    lines: ["EASTON"],
    accentColor: "#FFD400",
    tracking: "3px",
    logoUrl: "/brand-easton.jpg",
  },
  "Victory": {
    lines: ["VICTORY"],
    accentColor: "#e53935",
    tracking: "2.5px",
    logoUrl: "/brand-victory.png",
  },
  "Black Eagle": {
    lines: ["BLACK", "EAGLE"],
    accentColor: "#c8cdd3",
    tracking: "2px",
  },
  "Gold Tip": {
    lines: ["GOLD", "TIP"],
    accentColor: "#f5a623",
    tracking: "2.5px",
  },
  "AAE": {
    lines: ["AAE"],
    accentColor: "#3a7bd5",
    tracking: "3px",
    logoUrl: "/brand-aae.png",
  },
  "Bohning": {
    lines: ["BOHNING"],
    accentColor: "#cc2222",
    tracking: "2px",
    logoUrl: "/brand-bohning.webp",
  },
  "Altra": {
    lines: ["ALTRA"],
    accentColor: "#e0e0e0",
    tracking: "2.5px",
    logoUrl: "/brand-altra.png",
  },
};

function BrandLogo({ brand, active }: { brand: string; active: boolean }) {
  const mark = BRAND_MARK[brand];
  const accentColor = mark?.accentColor ?? "#FFD400";
  const tracking = mark?.tracking ?? "2px";
  const lines = mark?.lines ?? [brand.toUpperCase()];
  const isTwoLine = lines.length === 2;
  const logoUrl = mark?.logoUrl;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      {/* Accent bar */}
      <div style={{
        width: "100%", height: 2, borderRadius: 1,
        background: active ? accentColor : "rgba(255,255,255,.12)",
        marginBottom: logoUrl ? 6 : isTwoLine ? 5 : 6,
        transition: "background 0.2s",
      }} />
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={brand}
          style={{
            height: 20,
            maxWidth: 64,
            objectFit: "contain",
            opacity: active ? 1 : 0.45,
            transition: "opacity 0.2s",
            display: "block",
          }}
        />
      ) : (
        lines.map((line, i) => (
          <span key={i} style={{
            fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
            fontSize: isTwoLine ? 9 : 10,
            fontWeight: 800,
            letterSpacing: tracking,
            color: active ? accentColor : "rgba(255,255,255,.6)",
            lineHeight: 1.15,
            transition: "color 0.2s",
          }}>{line}</span>
        ))
      )}
    </div>
  );
}

function brandBtnStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 8,
    border: `1px solid ${active ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.08)"}`,
    background: active ? "rgba(255,255,255,.05)" : "rgba(255,255,255,.02)",
    boxShadow: active ? "0 0 0 2px rgba(255,212,0,.10)" : "none",
    padding: "9px 14px",
    minWidth: 68,
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
  };
}

// ─── Style helpers ────────────────────────────────────────────────────────────

const GOLD = "rgba(255,212,0,1)";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";

function tabBtnStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    border: `1px solid ${active ? "rgba(255,212,0,.45)" : "rgba(255,255,255,.12)"}`,
    background: active ? "rgba(255,212,0,.10)" : "rgba(255,255,255,.04)",
    padding: "7px 14px", fontSize: 12, fontWeight: active ? 900 : 600,
    color: active ? GOLD : "rgba(255,255,255,.7)",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s, color 0.2s",
  };
}

function modelCardStyle(selected: boolean): React.CSSProperties {
  return {
    textAlign: "left", cursor: "pointer",
    borderRadius: 12,
    border: `1px solid ${selected ? "rgba(255,212,0,.4)" : "rgba(255,255,255,.09)"}`,
    background: selected ? "rgba(255,212,0,.055)" : "rgba(255,255,255,.025)",
    boxShadow: selected ? "0 0 0 3px rgba(255,212,0,.07)" : "none",
    padding: "12px 12px",
    color: "rgba(255,255,255,.92)",
    transition: "border-color 0.2s, background 0.2s, box-shadow 0.2s",
  };
}

function spinePillStyle(active: boolean): React.CSSProperties {
  return {
    borderRadius: 10,
    border: `1px solid ${active ? "rgba(255,212,0,.5)" : "rgba(255,255,255,.1)"}`,
    background: active ? "rgba(255,212,0,.10)" : "rgba(255,255,255,.03)",
    padding: "8px 12px", minWidth: 60, textAlign: "center",
    color: active ? GOLD : "rgba(255,255,255,.8)",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s, color 0.2s",
  };
}

function segmentStyle(active: boolean): React.CSSProperties {
  return {
    flex: 1, borderRadius: 10,
    border: `1px solid ${active ? "rgba(255,212,0,.45)" : "rgba(255,255,255,.09)"}`,
    background: active ? "rgba(255,212,0,.07)" : "rgba(255,255,255,.025)",
    padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 700,
    color: active ? GOLD : "rgba(255,255,255,.75)",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s, color 0.2s",
  };
}

function inputStyle(error: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    border: `1px solid ${error ? "rgba(255,100,100,.45)" : "rgba(255,255,255,.14)"}`,
    background: "rgba(255,255,255,.05)",
    color: "rgba(255,255,255,.92)", outline: "none", fontSize: 13,
    fontFamily: MONO,
    boxShadow: error ? "0 0 0 3px rgba(255,60,60,.07)" : "none",
  };
}

function primaryBtn(enabled: boolean): React.CSSProperties {
  return {
    border: "none", borderRadius: 10, padding: "10px 18px",
    fontWeight: 900, letterSpacing: 0.2, fontSize: 13,
    background: enabled ? `linear-gradient(90deg, ${GOLD}, #ff9800)` : "rgba(255,255,255,.08)",
    color: enabled ? "#0b0b10" : "rgba(255,255,255,.4)",
    cursor: enabled ? "pointer" : "not-allowed",
    transition: "background 0.2s, color 0.2s",
  };
}

function ctaBtn(enabled: boolean): React.CSSProperties {
  return {
    border: "none", borderRadius: 12, padding: "12px 22px",
    fontWeight: 950, letterSpacing: 0.2, fontSize: 14,
    background: enabled ? `linear-gradient(90deg, ${GOLD}, #ff9800)` : "rgba(255,255,255,.07)",
    color: enabled ? "#0b0b10" : "rgba(255,255,255,.3)",
    cursor: enabled ? "pointer" : "not-allowed",
    minWidth: 200,
    transition: "background 0.2s, color 0.2s",
  };
}

function miniBtn(): React.CSSProperties {
  return {
    borderRadius: 8, border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(0,0,0,.2)", color: "rgba(255,255,255,.8)",
    width: 28, height: 28, cursor: "pointer", fontSize: 16,
    display: "grid", placeItems: "center",
  };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(800px 500px at 10% 5%, rgba(255,212,0,.07), transparent 55%)," +
      "radial-gradient(800px 500px at 90% 10%, rgba(255,106,0,.07), transparent 55%)," +
      "linear-gradient(180deg, #050507, #080810 40%, #060608)",
    color: "rgba(255,255,255,.92)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "24px 18px 64px",
  },
  pageHeader: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "16px 18px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.07)",
    background: "rgba(255,255,255,.02)",
    marginBottom: 16,
  },
  specPill: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(0,0,0,.2)",
    fontSize: 10,
    fontFamily: MONO,
    color: "rgba(255,255,255,.45)",
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1.35fr 0.65fr",
    gap: 14,
    alignItems: "start",
  },
  stickyPanel: {
    position: "sticky",
    top: 16,
    alignSelf: "start",
  },
  panel: {
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(255,255,255,.025)",
    padding: 14,
  },
  divider: {
    height: 1,
    background: "rgba(255,255,255,.07)",
    margin: "10px 0",
  },
  fieldLabel: {
    display: "block",
    fontFamily: MONO,
    fontSize: 9.5,
    color: "rgba(255,255,255,.35)",
    letterSpacing: "1px",
    marginBottom: 6,
  },
  helpText: {
    fontSize: 11,
    color: "rgba(255,255,255,.4)",
    marginTop: 6,
    fontFamily: MONO,
    letterSpacing: "0.2px",
  },
  infoBox: {
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(0,0,0,.2)",
    padding: "10px 12px",
  },
  warnBox: {
    padding: "10px 10px",
    borderRadius: 10,
    border: "1px solid rgba(255,100,100,.22)",
    background: "rgba(255,60,60,.04)",
    fontSize: 12,
    marginTop: 8,
  },
  successBox: {
    marginTop: 12,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,212,0,.3)",
    background: "rgba(255,212,0,.06)",
    color: "rgba(255,245,210,.95)",
  },
};
