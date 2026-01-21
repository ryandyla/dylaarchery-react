import { Link } from "react-router-dom";

type Step = {
  k: string;
  title: string;
  subtitle: string;
  bullets: string[];
  checkpoint?: string;
};

const STEPS: Step[] = [
  {
    k: "spec",
    title: "1) Build spec intake",
    subtitle: "Get the inputs that actually affect tune + consistency.",
    bullets: [
      "Bow type, draw weight, draw length, cam style",
      "Intended use: hunting / 3D / target",
      "Point weight, broadhead plan, vane preference",
      "Cut length + desired total arrow weight range",
    ],
    checkpoint: "Spec sanity check (no missing variables)",
  },
  {
    k: "spine",
    title: "2) Spine + balance math",
    subtitle: "Static + dynamic spine selection with FOC targets.",
    bullets: [
      "Spine range recommendation with tolerance buffer",
      "FOC estimate + weight distribution planning",
      "Component stack-up to hit the spec, not “close enough”",
    ],
    checkpoint: "Spine window confirmed (with margin)",
  },
  {
    k: "prep",
    title: "3) Shaft prep + straightness verification",
    subtitle: "Precision starts before glue touches anything.",
    bullets: [
      "Shaft inspection + straightness confirmation",
      "Ends squared / prepped for repeatable seating",
      "Surface prep for consistent adhesion",
    ],
    checkpoint: "Reject/replace any outliers",
  },
  {
    k: "build",
    title: "4) Assembly to spec",
    subtitle: "Repeatability is the product.",
    bullets: [
      "Cut-to-length in ¼″ increments",
      "Component install with consistent seating depth",
      "Weight matching to your build sheet target",
    ],
    checkpoint: "Weights verified (set consistency)",
  },
  {
    k: "qc",
    title: "5) QC gates + final verification",
    subtitle: "No “good enough” leaves the bench.",
    bullets: [
      "Alignment checks + repeatable spin/roll verification",
      "Broadhead-ready build confidence",
      "Final review against the original build spec",
    ],
    checkpoint: "Final sign-off before ship",
  },
];

const CHECKPOINTS = [
  { title: "Spine window validated", desc: "Chosen with margin so tune stays stable across real-world variables." },
  { title: "Cut length verified", desc: "Length is controlled in ¼″ steps for repeatable dynamic behavior." },
  { title: "Straightness confirmed", desc: "Outliers don’t get “worked around” — they get removed." },
  { title: "Weight consistency", desc: "Set built to a target so every arrow behaves the same." },
  { title: "Final alignment + review", desc: "Everything checked against your build sheet before shipping." },
];

function StepIcon({ n }: { n: number }) {
  return (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/5 text-sm font-black text-yellow-300">
      {n}
    </div>
  );
}

function ArrowMark() {
  // simple, clean “arrow” separator that matches your brand without being busy
  return (
    <svg viewBox="0 0 120 12" className="h-3 w-32 opacity-80" aria-hidden="true">
      <path d="M2 6h96" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M98 2l18 4-18 4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProcessPage() {
  return (
    <div className="bg-zinc-950 text-white">
      {/* FULL-WIDTH HERO (content constrained) */}
      <section className="relative w-full overflow-hidden border-b border-white/10">
        {/* background (keep it subtle / clean like homepage) */}
        <div className="absolute inset-0">
          <div className="h-full w-full bg-[radial-gradient(1200px_520px_at_20%_10%,rgba(255,210,0,0.14),transparent_55%),radial-gradient(900px_500px_at_80%_20%,rgba(255,120,0,0.10),transparent_60%),linear-gradient(to_bottom,rgba(0,0,0,0.40),rgba(0,0,0,0.85))]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(255,255,255,.4)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.4)_1px,transparent_1px)] [background-size:64px_64px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-16 md:py-20">
          <div className="grid gap-10 md:grid-cols-[1.15fr_.85fr] md:items-start">
            {/* left */}
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs font-semibold text-white/80">
                Our process <span className="text-white/40">•</span> built for consistency
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
                Precision isn’t a feature —
                <span className="block text-white/90">it’s the workflow.</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-7 text-white/75">
                We build arrows like equipment: controlled inputs, repeatable steps, and QC gates that catch outliers
                before they become “mystery flyers.”
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  to="/builder"
                  className="inline-flex items-center justify-center rounded-xl bg-yellow-500 px-4 py-3 text-sm font-extrabold text-black hover:bg-yellow-400"
                >
                  Build Your Arrows
                </Link>
                <span className="inline-flex items-center gap-2 text-sm text-white/70">
                  <ArrowMark />
                  <span>Scroll for the step-by-step</span>
                </span>
              </div>

              {/* mini highlights row (keeps the homepage vibe) */}
              <div className="mt-10 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-extrabold">Inputs first</div>
                  <div className="mt-1 text-xs leading-6 text-white/70">
                    We don’t guess — we define the variables that matter.
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-extrabold">Math + margin</div>
                  <div className="mt-1 text-xs leading-6 text-white/70">
                    Spine selection with a buffer for real-world tune stability.
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-sm font-extrabold">QC gates</div>
                  <div className="mt-1 text-xs leading-6 text-white/70">
                    Outliers are removed — not “worked around.”
                  </div>
                </div>
              </div>
            </div>

            {/* right card */}
            <div className="rounded-3xl border border-white/10 bg-black/25 p-6 shadow-[0_30px_90px_rgba(0,0,0,.55)]">
              <div className="text-xs font-black tracking-wide text-yellow-300">WHAT YOU GET</div>
              <div className="mt-3 text-xl font-extrabold leading-tight">
                A repeatable build sheet
                <span className="block text-white/85">and arrows that match it.</span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-white/75">
                <li>• Recommended spine window + why</li>
                <li>• Component stack that hits the target</li>
                <li>• Cut length + weight plan</li>
                <li>• QC checkpoints before ship</li>
              </ul>

              <div className="mt-5 rounded-2xl border border-white/10 bg-black/25 p-4 text-xs text-white/70">
                Easton + Victory only — because tolerance and consistency are the product.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS DIAGRAM (illustrated rail) */}
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-14">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight">The build workflow</h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
              Each step has a checkpoint — not because it’s fancy, but because consistency is measurable.
            </p>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-xs font-semibold text-white/60">Start</span>
            <ArrowMark />
            <span className="text-xs font-semibold text-white/60">Ship</span>
          </div>
        </div>

        <div className="mt-8 grid gap-6">
          {STEPS.map((s, idx) => (
            <div
              key={s.k}
              className="relative rounded-3xl border border-white/10 bg-white/[0.03] p-6"
            >
              {/* rail */}
              <div className="absolute left-8 top-0 hidden h-full w-px bg-white/10 md:block" />
              <div className="flex flex-col gap-4 md:flex-row md:gap-5">
                <div className="flex items-start gap-4 md:gap-5">
                  <StepIcon n={idx + 1} />
                  <div className="md:hidden">
                    <div className="text-lg font-extrabold">{s.title}</div>
                    <div className="mt-1 text-sm text-white/70">{s.subtitle}</div>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="hidden md:block">
                    <div className="text-lg font-extrabold">{s.title}</div>
                    <div className="mt-1 text-sm text-white/70">{s.subtitle}</div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-[1fr_.9fr] md:items-start">
                    <ul className="space-y-2 text-sm text-white/75">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex gap-2">
                          <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-yellow-400/90" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>

                    {/* checkpoint callout */}
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <div className="text-xs font-black tracking-wide text-yellow-300">CHECKPOINT</div>
                      <div className="mt-2 text-sm font-semibold text-white/85">{s.checkpoint}</div>
                      <div className="mt-2 text-xs leading-6 text-white/60">
                        This gate exists to prevent drift — the small errors that become big misses.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* step separator arrow */}
              {idx < STEPS.length - 1 && (
                <div className="mt-6 flex items-center gap-3 text-white/35">
                  <div className="h-px flex-1 bg-white/10" />
                  <ArrowMark />
                  <div className="h-px flex-1 bg-white/10" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CHECKPOINTS (keep them, featured as a clean grid) */}
      <section className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-14">
          <h2 className="text-2xl font-black tracking-tight">QC checkpoints we won’t compromise on</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
            These are the gates that protect your consistency — especially when the shot matters.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {CHECKPOINTS.map((c) => (
              <div key={c.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-3 w-3 rounded-full bg-yellow-400/90 shadow-[0_0_0_4px_rgba(255,212,0,.10)]" />
                  <div>
                    <div className="text-sm font-extrabold">{c.title}</div>
                    <div className="mt-1 text-sm leading-7 text-white/70">{c.desc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-black/25 p-6">
            <div>
              <div className="text-sm font-extrabold">Ready to spec your arrows?</div>
              <div className="mt-1 text-sm text-white/70">Use the builder and we’ll follow this workflow end-to-end.</div>
            </div>
            <Link
              to="/builder"
              className="inline-flex items-center justify-center rounded-xl bg-yellow-500 px-4 py-3 text-sm font-extrabold text-black hover:bg-yellow-400"
            >
              Open Arrow Builder
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
