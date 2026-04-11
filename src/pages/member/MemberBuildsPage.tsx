import { useEffect, useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import type { MemberOutletContext, Bow } from "./MemberShell";

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

export default function MemberBuildsPage() {
  const { bows } = useOutletContext<MemberOutletContext>();
  const [selectedBowId, setSelectedBowId] = useState<number | null>(bows[0]?.id ?? null);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

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
        <div className="space-y-6">
          {/* Inputs summary */}
          <InputSummary result={result} />

          {/* Per-purpose cards */}
          {Object.entries(result.by_purpose).map(([key, p]) => (
            <PurposeCard key={key} purposeKey={key} data={p} />
          ))}

          {/* Matched shafts */}
          <ShaftList shafts={result.shafts} idealSpine={result.inputs.ideal_spine} />
        </div>
      )}
    </div>
  );
}

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
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <span className="font-black text-white text-lg">{data.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
        <MetricBox
          label="Arrow Weight"
          value={`${data.arrow_weight.min}–${data.arrow_weight.max} gr`}
          sub={`${data.gpp.min}–${data.gpp.max} GPP`}
        />
        <MetricBox
          label="Target FOC"
          value={data.foc_target}
          sub="front of center"
        />
        {data.fps && (
          <MetricBox
            label="Est. Speed"
            value={`${data.fps.min}–${data.fps.max} fps`}
            sub="at target weight"
          />
        )}
        {data.ke && (
          <MetricBox
            label="Kinetic Energy"
            value={`${data.ke.min.toFixed(0)}–${data.ke.max.toFixed(0)} ft-lbs`}
            sub={data.ke_adequate === false ? "⚠ may be low" : data.ke_adequate ? "✓ adequate" : ""}
            highlight={data.ke_adequate === false ? "warn" : data.ke_adequate ? "ok" : undefined}
          />
        )}
      </div>

      <p className="text-xs text-white/45 leading-relaxed">{data.note}</p>
    </div>
  );
}

function ShaftList({ shafts, idealSpine }: { shafts: ShaftResult[]; idealSpine: number }) {
  if (shafts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-white/30">
        No shafts in our current catalog match this spine range — contact us and we'll source the right option.
      </div>
    );
  }

  // Group by brand
  const byBrand: Record<string, ShaftResult[]> = {};
  for (const s of shafts) {
    (byBrand[s.brand] ??= []).push(s);
  }

  return (
    <div>
      <div className="mb-3 text-xs font-bold tracking-[2px] text-white/40">
        MATCHED SHAFTS — {shafts.length} option{shafts.length !== 1 ? "s" : ""} in your spine range
      </div>
      <div className="space-y-2">
        {shafts.map((s) => (
          <ShaftRow key={s.id} shaft={s} ideal={s.spine === idealSpine} />
        ))}
      </div>
    </div>
  );
}

function ShaftRow({ shaft: s, ideal }: { shaft: ShaftResult; ideal: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3 transition-colors ${
      ideal
        ? "border-yellow-400/25 bg-yellow-400/[0.04]"
        : "border-white/8 bg-white/[0.02]"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-white">{s.brand} {s.model}</span>
          <span className="font-mono text-xs text-white/40">SPINE {s.spine}</span>
          {ideal && (
            <span className="rounded-full bg-yellow-400/15 border border-yellow-400/30 px-2 py-0.5 text-[9px] font-bold tracking-wider text-yellow-400">
              IDEAL MATCH
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 mt-1">
          <span className="text-xs text-white/35">GPI {s.gpi}</span>
          {s.outer_diameter && <span className="text-xs text-white/35">OD {s.outer_diameter}"</span>}
          <span className="text-xs text-white/35">MAX {s.max_length}"</span>
          <span className="text-xs font-mono text-yellow-400/60">${s.price_per_shaft.toFixed(2)}/shaft</span>
        </div>
      </div>
      <Link
        to={`/builder?shaft_id=${s.id}`}
        className="shrink-0 rounded-xl bg-yellow-500 px-4 py-1.5 text-xs font-extrabold text-black hover:bg-yellow-400 transition-colors"
      >
        Build →
      </Link>
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

function MetricBox({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: "ok" | "warn";
}) {
  const subColor = highlight === "ok" ? "text-green-400" : highlight === "warn" ? "text-yellow-500" : "text-white/30";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <div className="text-[10px] font-bold tracking-widest text-white/30 mb-1">{label.toUpperCase()}</div>
      <div className="font-mono text-sm font-bold text-white leading-tight">{value}</div>
      {sub && <div className={`text-[10px] mt-1 ${subColor}`}>{sub}</div>}
    </div>
  );
}
