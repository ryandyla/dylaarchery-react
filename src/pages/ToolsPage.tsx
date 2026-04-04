import { useMemo, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeNum(x: string, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// ─── Physics ──────────────────────────────────────────────────────────────────

/**
 * Estimate actual arrow speed from published IBO rating.
 *
 * IBO standard: 70 lb draw, 30" draw length, 350 gr arrow.
 * Adjustments applied per widely-used AMO/ATA compensation:
 *   - Arrow weight: −1 fps per 3 gr above 350 gr (heavier = slower)
 *   - Draw weight:  −2 fps per lb below 70 lb
 *   - Draw length:  −2.5 fps per inch below 30"
 */
function estimateSpeed(
  iboFps: number,
  drawWeightLbs: number,
  drawLengthIn: number,
  arrowGrains: number
): number {
  const weightAdj = ((arrowGrains - 350) / 3) * 1;
  const drawWeightAdj = (70 - drawWeightLbs) * 2;
  const drawLengthAdj = (30 - drawLengthIn) * 2.5;
  return iboFps - weightAdj - drawWeightAdj - drawLengthAdj;
}

/**
 * Kinetic energy in ft-lb.
 * KE = (grain_weight × fps²) / 450,240
 * Derived from: ½mv² with mass in lbs (grains÷7000) and velocity in ft/s,
 * then converted to ft-lb via the 450,240 constant.
 */
function calcKE(grains: number, fps: number): number {
  return (grains * fps * fps) / 450_240;
}

/**
 * Arrow momentum in slug-ft/s.
 * p = mass × velocity = (grains / 225,218) × fps
 * 1 slug = 32.174 lb = 32.174 × 7000 gr = 225,218 gr
 */
function calcMomentum(grains: number, fps: number): number {
  return (grains * fps) / 225_218;
}

// ─── Classification bands ────────────────────────────────────────────────────

type Band = { min: number; max: number; label: string; color: string };

const KE_BANDS: Band[] = [
  { min: 0,  max: 25,  label: "Small game",              color: "#6b7280" },
  { min: 25, max: 42,  label: "Deer / antelope minimum", color: "#eab308" },
  { min: 42, max: 65,  label: "Deer / black bear",       color: "#22c55e" },
  { min: 65, max: 80,  label: "Elk / large game",        color: "#22c55e" },
  { min: 80, max: Infinity, label: "Dangerous game",     color: "#22c55e" },
];

const MOM_BANDS: Band[] = [
  { min: 0,     max: 0.040, label: "Light",              color: "#6b7280" },
  { min: 0.040, max: 0.055, label: "Adequate for deer",  color: "#eab308" },
  { min: 0.055, max: 0.065, label: "Deer / black bear",  color: "#22c55e" },
  { min: 0.065, max: Infinity, label: "Elk-capable",     color: "#22c55e" },
];

function classify(value: number, bands: Band[]): Band {
  return bands.find((b) => value >= b.min && value < b.max) ?? bands[bands.length - 1];
}

// ─── Shared input styles ──────────────────────────────────────────────────────

const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const GOLD = "rgba(255,212,0,1)";

function inputCls(hasValue: boolean) {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${hasValue ? "rgba(255,212,0,.25)" : "rgba(255,255,255,.12)"}`,
    background: "rgba(255,255,255,.04)",
    color: "rgba(255,255,255,.92)",
    outline: "none",
    fontSize: 14,
    fontFamily: MONO,
    transition: "border-color 0.2s",
  } as React.CSSProperties;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: 9.5, color: "rgba(255,255,255,.35)", letterSpacing: "1px", marginBottom: 6 }}>
      {children}
    </div>
  );
}

// ─── Result card ─────────────────────────────────────────────────────────────

function ResultCard({
  tag, title, value, unit, sub, band, formula, breakdown,
}: {
  tag: string; title: string;
  value: string; unit: string; sub?: string;
  band?: Band; formula: string;
  breakdown?: Array<{ label: string; value: string; dimmed?: boolean }>;
}) {
  return (
    <div style={{
      borderRadius: 16,
      border: "1px solid rgba(255,255,255,.08)",
      background: "rgba(255,255,255,.025)",
      padding: "18px 18px 16px",
      display: "flex", flexDirection: "column", gap: 0,
    }}>
      <div style={{ fontFamily: MONO, fontSize: 9.5, color: GOLD, letterSpacing: "1.2px", marginBottom: 6 }}>
        {tag}
      </div>
      <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: -0.2, marginBottom: 14 }}>
        {title}
      </div>

      {/* Main result */}
      <div style={{
        borderRadius: 12, border: "1px solid rgba(255,255,255,.08)",
        background: "rgba(0,0,0,.3)", padding: "14px 16px", marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 32, fontWeight: 800, color: band?.color ?? "rgba(255,255,255,.9)", letterSpacing: -1, transition: "color 0.3s" }}>
            {value}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 13, color: "rgba(255,255,255,.4)" }}>
            {unit}
          </span>
        </div>
        {band && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: 999, background: band.color, flexShrink: 0 }} />
            <span style={{ fontFamily: MONO, fontSize: 10, color: band.color, letterSpacing: "0.3px" }}>
              {band.label}
            </span>
          </div>
        )}
        {sub && (
          <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.35)", marginTop: 6, letterSpacing: "0.2px" }}>
            {sub}
          </div>
        )}
      </div>

      {/* Breakdown */}
      {breakdown && breakdown.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          {breakdown.map((row, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: row.dimmed ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.45)", letterSpacing: "0.2px" }}>
                {row.label}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 10, color: row.dimmed ? "rgba(255,255,255,.25)" : "rgba(255,255,255,.65)", fontWeight: 700 }}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Formula */}
      <div style={{ marginTop: "auto", fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.2)", letterSpacing: "0.2px", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)" }}>
        {formula}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [ibo, setIbo]           = useState("320");
  const [drawWt, setDrawWt]     = useState("70");
  const [drawLen, setDrawLen]   = useState("29");
  const [grains, setGrains]     = useState("450");

  const calcs = useMemo(() => {
    const iboV    = safeNum(ibo,     0);
    const dwV     = safeNum(drawWt,  0);
    const dlV     = safeNum(drawLen, 0);
    const grV     = safeNum(grains,  0);

    if (iboV <= 0 || dwV <= 0 || dlV <= 0 || grV <= 0) return null;

    const fps = estimateSpeed(iboV, dwV, dlV, grV);
    const ke  = calcKE(grV, fps);
    const mom = calcMomentum(grV, fps);

    const weightAdj  = ((grV - 350) / 3) * 1;
    const dwAdj      = (70 - dwV) * 2;
    const dlAdj      = (30 - dlV) * 2.5;

    return { fps, ke, mom, weightAdj, dwAdj, dlAdj, iboV, grV, dwV, dlV };
  }, [ibo, drawWt, drawLen, grains]);

  const fmt1 = (n: number) => n.toFixed(1);
  const fmt2 = (n: number) => n.toFixed(3);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #050507, #080810 40%, #060608)", color: "rgba(255,255,255,.92)", fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial" }}>

      {/* Header */}
      <section style={{ borderBottom: "1px solid rgba(255,255,255,.08)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(800px 400px at 30% 50%, rgba(255,210,0,.08), transparent 60%), radial-gradient(600px 350px at 80% 40%, rgba(255,120,0,.07), transparent 60%)" }} />
        <div style={{ position: "relative", maxWidth: 1100, margin: "0 auto", padding: "40px 20px 36px" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.3)", letterSpacing: "1.5px", marginBottom: 8 }}>
            BALLISTICS TOOLS
          </div>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 950, letterSpacing: -0.5 }}>Tools & Calculators</h1>
          <p style={{ margin: "8px 0 0", maxWidth: 540, fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,.55)" }}>
            Enter your bow and arrow specs. Speed is estimated from IBO using standard AMO adjustment factors. KE and momentum derive from the estimated speed.
          </p>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 64px" }}>

        {/* Inputs */}
        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.02)", padding: "20px 20px 18px", marginBottom: 20 }}>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: "rgba(255,255,255,.3)", letterSpacing: "1.5px", marginBottom: 16 }}>
            BOW & ARROW INPUTS
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <div>
              <FieldLabel>IBO SPEED (fps)</FieldLabel>
              <input style={inputCls(!!ibo)} value={ibo} inputMode="decimal"
                onChange={(e) => setIbo(e.target.value)} placeholder="320" />
              <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,.22)", marginTop: 5, letterSpacing: "0.2px" }}>
                Published bow IBO rating
              </div>
            </div>
            <div>
              <FieldLabel>DRAW WEIGHT (lbs)</FieldLabel>
              <input style={inputCls(!!drawWt)} value={drawWt} inputMode="decimal"
                onChange={(e) => setDrawWt(e.target.value)} placeholder="70" />
              <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,.22)", marginTop: 5, letterSpacing: "0.2px" }}>
                Your actual peak draw weight
              </div>
            </div>
            <div>
              <FieldLabel>DRAW LENGTH (in)</FieldLabel>
              <input style={inputCls(!!drawLen)} value={drawLen} inputMode="decimal"
                onChange={(e) => setDrawLen(e.target.value)} placeholder="29" />
              <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,.22)", marginTop: 5, letterSpacing: "0.2px" }}>
                Your actual draw length
              </div>
            </div>
            <div>
              <FieldLabel>ARROW WEIGHT (gr)</FieldLabel>
              <input style={inputCls(!!grains)} value={grains} inputMode="decimal"
                onChange={(e) => setGrains(e.target.value)} placeholder="450" />
              <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,.22)", marginTop: 5, letterSpacing: "0.2px" }}>
                Total finished arrow weight
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>

          {/* Speed */}
          <ResultCard
            tag="ARROW SPEED"
            title="Estimated Velocity"
            value={calcs ? fmt1(calcs.fps) : "—"}
            unit="fps"
            sub={calcs ? `From ${calcs.iboV} fps IBO` : undefined}
            formula="IBO − weight adj − draw wt adj − draw len adj"
            breakdown={calcs ? [
              { label: `Arrow weight adj  (${fmt1(calcs.grV)}gr vs 350gr ref)`, value: `−${fmt1(calcs.weightAdj)} fps` },
              { label: `Draw weight adj   (${calcs.dwV} lb vs 70 lb ref)`,      value: `−${fmt1(calcs.dwAdj)} fps`, dimmed: calcs.dwAdj === 0 },
              { label: `Draw length adj   (${calcs.dlV}" vs 30" ref)`,          value: `−${fmt1(calcs.dlAdj)} fps`, dimmed: calcs.dlAdj === 0 },
            ] : undefined}
          />

          {/* KE */}
          <ResultCard
            tag="KINETIC ENERGY"
            title="Energy at Release"
            value={calcs ? fmt1(calcs.ke) : "—"}
            unit="ft-lb"
            band={calcs ? classify(calcs.ke, KE_BANDS) : undefined}
            formula="(grains × fps²) ÷ 450,240"
            breakdown={calcs ? [
              { label: "Arrow weight", value: `${calcs.grV} gr` },
              { label: "Est. speed",   value: `${fmt1(calcs.fps)} fps` },
            ] : undefined}
          />

          {/* Momentum */}
          <ResultCard
            tag="MOMENTUM"
            title="Penetration Potential"
            value={calcs ? fmt2(calcs.mom) : "—"}
            unit="slug·ft/s"
            band={calcs ? classify(calcs.mom, MOM_BANDS) : undefined}
            formula="(grains × fps) ÷ 225,218"
            breakdown={calcs ? [
              { label: "Arrow weight", value: `${calcs.grV} gr` },
              { label: "Est. speed",   value: `${fmt1(calcs.fps)} fps` },
            ] : undefined}
          />
        </div>

        {/* Assumptions note */}
        <div style={{ marginTop: 20, padding: "14px 18px", borderRadius: 12, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.015)" }}>
          <div style={{ fontFamily: MONO, fontSize: 9.5, color: "rgba(255,255,255,.25)", letterSpacing: "1px", marginBottom: 8 }}>
            ASSUMPTIONS & METHODOLOGY
          </div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: "rgba(255,255,255,.38)", lineHeight: 1.9, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 24px" }}>
            <span>IBO standard: 70 lb · 30" draw · 350 gr arrow</span>
            <span>Speed adj: −1 fps per 3 gr above 350 gr reference</span>
            <span>KE constant 450,240 = 2 × 7,000 gr/lb × 32.174 ft/s²</span>
            <span>Momentum constant 225,218 = 7,000 × 32.174 (grains → slugs)</span>
            <span>No peep, loop, or silencer adjustments applied</span>
            <span>Speed estimates are calculated — chronograph for true values</span>
          </div>
        </div>
      </div>
    </div>
  );
}
