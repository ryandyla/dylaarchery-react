import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import type { MemberOutletContext } from "./MemberShell";

type PurposeData = {
  label: string;
  arrow_weight: { min: number; max: number };
  gpp: { min: number; max: number };
  foc_target: string;
  fps: { min: number; max: number } | null;
  ke: { min: number; max: number } | null;
  ke_adequate: boolean | null;
  momentum: number | null;
  note: string;
};

type ShaftResult = {
  id: number;
  brand: string;
  model: string;
  spine: number;
  gpi: number;
  inner_diameter: number;
  outer_diameter: number;
  max_length: number;
  price_per_shaft: number;
  fit: "ideal" | "compatible";
};

type RecommendResult = {
  bow: { id: number; nickname: string | null; brand: string | null; model: string | null; draw_weight: number; draw_length: number; ibo_speed: number | null };
  inputs: { arrow_length: number; ideal_spine: number; spine_range: { min: number; max: number } };
  by_purpose: Record<string, PurposeData>;
  shafts: ShaftResult[];
};

const PURPOSE_ICONS: Record<string, string> = { hunting: "🦌", target: "🎯", "3d": "🌲", tac: "⚡" };

// Brands shown first, in order, before alphabetical remainder
const PREFERRED_BRANDS = ["Easton", "Victory"];

function sortBrands(brands: string[]): string[] {
  const preferred = PREFERRED_BRANDS.filter((b) => brands.includes(b));
  const rest = brands.filter((b) => !PREFERRED_BRANDS.includes(b)).sort();
  return [...preferred, ...rest];
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MemberBuildsPage() {
  const { bows } = useOutletContext<MemberOutletContext>();
  const [selectedBowId, setSelectedBowId] = useState<number | null>(bows[0]?.id ?? null);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [purposeOpen, setPurposeOpen] = useState(false);

  useEffect(() => {
    if (!selectedBowId) return;
    setLoading(true);
    setErr("");
    setResult(null);
    fetch(`/api/member/recommend?bow_id=${selectedBowId}`)
      .then((r) => r.json())
      .then((d: any) => {
        if (!d.ok) throw new Error(d.error || "Failed");
        setResult(d);
      })
      .catch((e: any) => setErr(e?.message || "Failed to load recommendations."))
      .finally(() => setLoading(false));
  }, [selectedBowId]);

  if (bows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
        <div className="text-2xl mb-3">🏹</div>
        <div className="font-bold text-white mb-2">Add a bow first</div>
        <p className="text-sm text-white/40 mb-4">Save your bow specs and we'll build you a custom arrow program.</p>
        <Link to="/member/bows" className="inline-block rounded-xl bg-yellow-500 px-5 py-2 text-sm font-extrabold text-black hover:bg-yellow-400 transition-colors">
          Add Your Bow →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-xs font-bold tracking-[2px] text-white/40">RECOMMENDED BUILDS</div>

      {/* Bow selector */}
      {bows.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {bows.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBowId(b.id)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors border ${
                selectedBowId === b.id
                  ? "bg-yellow-500/20 border-yellow-400/40 text-yellow-300"
                  : "border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              {b.nickname || `${b.brand ?? ""} ${b.model ?? ""}`.trim() || `Bow #${b.id}`}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="text-sm text-white/30 py-8 text-center">Calculating your arrow program…</div>}
      {err && <div className="text-sm text-red-400 py-4">{err}</div>}

      {result && (
        <div className="space-y-5">
          {/* Bow profile */}
          <InputSummary result={result} />

          {/* Purpose targets — collapsed by default */}
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
            <button
              onClick={() => setPurposeOpen((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-xs font-bold tracking-[2px] text-white/40">
                TARGET SPECS BY PURPOSE
              </span>
              <span className="text-white/30 text-sm">{purposeOpen ? "▲" : "▼"}</span>
            </button>
            {purposeOpen && (
              <div className="px-5 pb-5 space-y-4">
                {Object.entries(result.by_purpose).map(([key, p]) => (
                  <PurposeCard key={key} purposeKey={key} data={p} />
                ))}
              </div>
            )}
          </div>

          {/* Shaft selector — the main event */}
          <ShaftSelector shafts={result.shafts} idealSpine={result.inputs.ideal_spine} />
        </div>
      )}
    </div>
  );
}

// ── Shaft drill-down selector ─────────────────────────────────────────────────

function ShaftSelector({ shafts, idealSpine }: { shafts: ShaftResult[]; idealSpine: number }) {
  // Unique spines in range, ideal first then ascending
  const spines = [...new Set(shafts.map((s) => s.spine))].sort((a, b) => {
    if (a === idealSpine) return -1;
    if (b === idealSpine) return 1;
    return a - b;
  });

  const [selectedSpine, setSelectedSpine] = useState<number>(idealSpine);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  // Reset brand when spine changes
  function pickSpine(spine: number) {
    setSelectedSpine(spine);
    setSelectedBrand(null);
  }

  const shaftsAtSpine = shafts.filter((s) => s.spine === selectedSpine);
  const brands = sortBrands([...new Set(shaftsAtSpine.map((s) => s.brand))]);
  const modelsForBrand = selectedBrand
    ? shaftsAtSpine.filter((s) => s.brand === selectedBrand)
    : [];

  if (shafts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/30">
        No shafts in our current catalog match this spine range — contact us and we'll source the right option.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-6">
      <div className="text-xs font-bold tracking-[2px] text-white/40">BUILD YOUR ARROW — START HERE</div>

      {/* Step 1: Spine */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <StepBadge n={1} />
          <span className="font-bold text-white text-sm">Select a spine</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {spines.map((spine) => {
            const isIdeal = spine === idealSpine;
            const isSelected = spine === selectedSpine;
            return (
              <button
                key={spine}
                onClick={() => pickSpine(spine)}
                className={`relative rounded-xl px-4 py-2.5 text-sm font-mono font-bold border transition-colors ${
                  isSelected
                    ? "bg-yellow-400/20 border-yellow-400/50 text-yellow-300"
                    : "border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
                }`}
              >
                {spine}
                {isIdeal && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-1.5 text-[8px] font-black text-black whitespace-nowrap">
                    IDEAL
                  </span>
                )}
                {!isIdeal && (
                  <span className="block text-[9px] font-sans font-normal text-white/25 mt-0.5">compatible</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Brand */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <StepBadge n={2} active={!!selectedSpine} />
          <span className={`font-bold text-sm ${selectedSpine ? "text-white" : "text-white/30"}`}>
            Select a brand
          </span>
          {selectedBrand && (
            <button onClick={() => setSelectedBrand(null)} className="ml-auto text-xs text-white/30 hover:text-white/60">
              ← change
            </button>
          )}
        </div>

        {!selectedBrand ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {brands.map((brand) => {
              const count = shaftsAtSpine.filter((s) => s.brand === brand).length;
              const isPreferred = PREFERRED_BRANDS.includes(brand);
              return (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand)}
                  className={`relative rounded-xl border px-4 py-3 text-left transition-colors ${
                    isPreferred
                      ? "border-yellow-400/25 bg-yellow-400/[0.04] hover:bg-yellow-400/[0.08]"
                      : "border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15"
                  }`}
                >
                  {isPreferred && (
                    <span className="absolute top-2 right-2 rounded-full bg-yellow-400/20 border border-yellow-400/30 px-1.5 py-0.5 text-[8px] font-black text-yellow-400 tracking-wider">
                      TOP PICK
                    </span>
                  )}
                  <div className={`font-bold text-sm ${isPreferred ? "text-yellow-100" : "text-white"}`}>
                    {brand}
                  </div>
                  <div className="text-xs text-white/30 mt-0.5">
                    {count} model{count !== 1 ? "s" : ""} at {selectedSpine} spine
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 ${
            PREFERRED_BRANDS.includes(selectedBrand)
              ? "border-yellow-400/30 bg-yellow-400/10"
              : "border-white/15 bg-white/5"
          }`}>
            <span className={`font-bold text-sm ${PREFERRED_BRANDS.includes(selectedBrand) ? "text-yellow-200" : "text-white"}`}>
              {selectedBrand}
            </span>
            {PREFERRED_BRANDS.includes(selectedBrand) && (
              <span className="rounded-full bg-yellow-400/20 border border-yellow-400/30 px-1.5 py-0.5 text-[8px] font-black text-yellow-400">
                TOP PICK
              </span>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Model */}
      {selectedBrand && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <StepBadge n={3} active />
            <span className="font-bold text-white text-sm">Select a model</span>
          </div>
          <div className="space-y-2">
            {modelsForBrand.map((s) => (
              <ModelCard key={s.id} shaft={s} idealSpine={idealSpine} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ModelCard({ shaft: s, idealSpine }: { shaft: ShaftResult; idealSpine: number }) {
  const isIdeal = s.spine === idealSpine;
  return (
    <div className={`rounded-2xl border px-5 py-4 ${
      isIdeal ? "border-yellow-400/20 bg-yellow-400/[0.03]" : "border-white/8 bg-white/[0.02]"
    }`}>
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="font-black text-white">{s.model}</span>
            <span className="font-mono text-xs text-white/35">{s.spine} SPINE</span>
            {isIdeal && (
              <span className="rounded-full bg-yellow-400/15 border border-yellow-400/30 px-2 py-0.5 text-[9px] font-bold tracking-wider text-yellow-400">
                IDEAL MATCH
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-5 text-xs text-white/40">
            {s.gpi != null && (
              <div><span className="text-white/20 font-mono text-[10px] mr-1">GPI</span>{s.gpi}</div>
            )}
            {s.outer_diameter != null && (
              <div><span className="text-white/20 font-mono text-[10px] mr-1">OD</span>{s.outer_diameter}"</div>
            )}
            {s.inner_diameter != null && (
              <div><span className="text-white/20 font-mono text-[10px] mr-1">ID</span>{s.inner_diameter}"</div>
            )}
            {s.max_length != null && (
              <div><span className="text-white/20 font-mono text-[10px] mr-1">MAX</span>{s.max_length}"</div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="font-mono font-black text-yellow-400">${s.price_per_shaft.toFixed(2)}<span className="text-white/25 text-xs font-normal">/shaft</span></div>
          <Link
            to={`/builder?shaft_id=${s.id}`}
            className="rounded-xl bg-yellow-500 px-4 py-2 text-xs font-extrabold text-black hover:bg-yellow-400 transition-colors"
          >
            Start Build →
          </Link>
        </div>
      </div>
    </div>
  );
}

function StepBadge({ n, active = true }: { n: number; active?: boolean }) {
  return (
    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
      active ? "bg-yellow-400 text-black" : "bg-white/10 text-white/30"
    }`}>
      {n}
    </div>
  );
}

// ── Supporting components (unchanged) ─────────────────────────────────────────

function InputSummary({ result }: { result: RecommendResult }) {
  const { bow, inputs } = result;
  const bowTitle = bow.nickname || `${bow.brand ?? ""} ${bow.model ?? ""}`.trim() || "Your Bow";

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <div className="mb-3 text-xs font-bold tracking-[2px] text-white/40">BOW PROFILE</div>
      <div className="flex flex-wrap gap-x-8 gap-y-2 mb-4">
        <Spec label="Bow" value={bowTitle} />
        {bow.draw_weight && <Spec label="Draw Weight" value={`${bow.draw_weight} lbs`} />}
        {bow.draw_length && <Spec label="Draw Length" value={`${bow.draw_length}"`} />}
        {bow.ibo_speed && <Spec label="IBO Speed" value={`${bow.ibo_speed} fps`} />}
        <Spec label="Est. Arrow Length" value={`${inputs.arrow_length}"`} />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="text-xs text-white/40">Recommended spine:</div>
        <span className="rounded-lg bg-yellow-400/15 border border-yellow-400/30 px-3 py-1 text-sm font-mono font-black text-yellow-400">
          {inputs.ideal_spine}
        </span>
        <span className="text-xs text-white/30">
          (compatible range: {inputs.spine_range.min}–{inputs.spine_range.max})
        </span>
      </div>
    </div>
  );
}

function PurposeCard({ purposeKey, data }: { purposeKey: string; data: PurposeData }) {
  const icon = PURPOSE_ICONS[purposeKey] ?? "🏹";
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{icon}</span>
        <span className="font-black text-white">{data.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
        <MetricBox label="Arrow Weight" value={`${data.arrow_weight.min}–${data.arrow_weight.max} gr`} sub={`${data.gpp.min}–${data.gpp.max} GPP`} />
        <MetricBox label="Target FOC" value={data.foc_target} sub="front of center" />
        {data.fps && <MetricBox label="Est. Speed" value={`${data.fps.min}–${data.fps.max} fps`} sub="at target weight" />}
        {data.ke && (
          <MetricBox
            label="Kinetic Energy"
            value={`${data.ke.min.toFixed(0)}–${data.ke.max.toFixed(0)} ft-lbs`}
            sub={data.ke_adequate === false ? "⚠ may be low" : data.ke_adequate ? "✓ adequate" : ""}
            highlight={data.ke_adequate === false ? "warn" : data.ke_adequate ? "ok" : undefined}
          />
        )}
      </div>
      <p className="text-xs text-white/40 leading-relaxed">{data.note}</p>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-widest text-white/30 mb-0.5">{label.toUpperCase()}</div>
      <div className="text-sm font-bold text-white">{value}</div>
    </div>
  );
}

function MetricBox({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: "ok" | "warn" }) {
  const subColor = highlight === "ok" ? "text-green-400" : highlight === "warn" ? "text-yellow-500" : "text-white/30";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <div className="text-[10px] font-bold tracking-widest text-white/30 mb-1">{label.toUpperCase()}</div>
      <div className="font-mono text-sm font-bold text-white leading-tight">{value}</div>
      {sub && <div className={`text-[10px] mt-1 ${subColor}`}>{sub}</div>}
    </div>
  );
}
