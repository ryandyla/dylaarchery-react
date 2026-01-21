import React, { useMemo, useState } from "react";

function clampNum(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(x: string, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * FOC% = ((BalancePoint - (ArrowLength/2)) / ArrowLength) * 100
 * where BalancePoint and ArrowLength are in the same units (inches).
 */
function calcFOC(balancePointIn: number, arrowLengthIn: number) {
  if (arrowLengthIn <= 0) return 0;
  return ((balancePointIn - arrowLengthIn / 2) / arrowLengthIn) * 100;
}

export default function ToolsPage() {
  // FOC
  const [arrowLen, setArrowLen] = useState("29.0");
  const [balancePt, setBalancePt] = useState("18.0");

  const foc = useMemo(() => {
    const L = safeNum(arrowLen);
    const B = safeNum(balancePt);
    return calcFOC(B, L);
  }, [arrowLen, balancePt]);

  return (
    <div className="bg-zinc-950 text-white">
      {/* full-bleed hero header, constrained content */}
      <section className="relative w-full border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_30%_20%,rgba(255,210,0,0.12),transparent_60%),radial-gradient(700px_380px_at_80%_25%,rgba(255,120,0,0.10),transparent_60%),linear-gradient(to_bottom,rgba(0,0,0,0.35),rgba(0,0,0,0.9))]" />
        <div className="relative mx-auto max-w-6xl px-4 py-12">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Tools & Calculators</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
            Quick calculators for experienced builders. No fluff — just numbers you can trust.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-6 md:grid-cols-2">
          {/* FOC */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs font-black tracking-wide text-yellow-300">FOC CALCULATOR</div>
            <h2 className="mt-2 text-xl font-extrabold">Front-of-Center (FOC %)</h2>
            <p className="mt-2 text-sm leading-7 text-white/70">
              Enter arrow length and the balance point measured from the nock throat.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className="text-xs font-semibold text-white/70">Arrow length (in)</span>
                <input
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-yellow-500/60"
                  value={arrowLen}
                  onChange={(e) => setArrowLen(e.target.value)}
                  inputMode="decimal"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-xs font-semibold text-white/70">Balance point (in)</span>
                <input
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-yellow-500/60"
                  value={balancePt}
                  onChange={(e) => setBalancePt(e.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/25 p-4">
              <div className="text-xs font-black tracking-wide text-white/60">RESULT</div>
              <div className="mt-2 text-3xl font-black">
                {Number.isFinite(foc) ? `${foc.toFixed(1)}%` : "—"}
              </div>
              <div className="mt-2 text-xs text-white/60">
                Formula: ((B − L/2) / L) × 100
              </div>
            </div>
          </div>

          {/* placeholder cards for next calculators */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs font-black tracking-wide text-yellow-300">COMING NEXT</div>
            <h2 className="mt-2 text-xl font-extrabold">Speed / KE / Momentum</h2>
            <p className="mt-2 text-sm leading-7 text-white/70">
              Add bow IBO, draw weight/length, arrow mass, and we’ll compute estimated speed,
              kinetic energy, and momentum with transparent assumptions.
            </p>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70">
                • Arrow speed estimate
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70">
                • Kinetic energy (ft-lb)
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm text-white/70">
                • Momentum (slug-ft/s)
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
