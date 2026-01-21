import { Link } from "react-router-dom";

export default function ProcessPage() {
  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-8 md:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(circle_at_20%_0%,rgba(255,200,0,.25),transparent_55%),radial-gradient(circle_at_90%_30%,rgba(255,120,0,.18),transparent_55%)]" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-white/70">
            <span className="h-2 w-2 rounded-full bg-yellow-400" />
            Our build philosophy
          </div>

          <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">
            The process is the product.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 md:text-base">
            Anyone can assemble parts. We build arrows like precision equipment: controlled inputs,
            measured steps, and verification at every checkpoint — so you get consistent flight when the
            shot matters.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/builder"
              className="inline-flex items-center justify-center rounded-xl bg-yellow-500 px-5 py-3 text-sm font-extrabold text-black hover:bg-yellow-400"
            >
              Build Your Arrows
            </Link>
            <a
              href="#checkpoints"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white/90 hover:bg-white/10"
            >
              See the checkpoints
            </a>
          </div>
        </div>
      </section>

      {/* 3 pillars */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Measured inputs",
            body: "Cut length, component fit, and setup intent are defined up front — no guessing, no “close enough.”",
          },
          {
            title: "Controlled assembly",
            body: "Each step is repeatable and documented so your next dozen matches your first dozen.",
          },
          {
            title: "Verification-first QC",
            body: "We verify what matters: alignment, consistency, and repeatability before it ships.",
          },
        ].map((x) => (
          <div
            key={x.title}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <div className="text-sm font-extrabold">{x.title}</div>
            <div className="mt-2 text-sm leading-7 text-white/75">{x.body}</div>
          </div>
        ))}
      </section>

      {/* Steps */}
      <section id="checkpoints" className="space-y-4">
        <h2 className="text-xl font-extrabold md:text-2xl">Build checkpoints</h2>

        <div className="grid gap-4 lg:grid-cols-2">
          <StepCard
            n="01"
            title="Spine + intent"
            body="We start with the goal: hunting vs target, point weight, draw weight, and desired feel. Then we select the appropriate shaft family and spine range."
            bullets={[
              "Static + dynamic spine considerations",
              "Point weight and total mass targets",
              "Build intent recorded for repeatability",
            ]}
          />
          <StepCard
            n="02"
            title="Cut length in precise increments"
            body="Length drives tune. We cut to the selected length in measured increments to keep your build consistent across the set."
            bullets={[
              "Measured cut-to-length (¼\" increments if needed)",
              "Deburr + prep for consistent insert fit",
              "Documented final cut length",
            ]}
          />
          <StepCard
            n="03"
            title="Component fit + alignment"
            body="We focus on the stuff that actually shows up downrange: fit, alignment, and consistency across every arrow in the batch."
            bullets={[
              "Insert/outsert fit verified",
              "Component seating consistency",
              "Alignment check before cure",
            ]}
          />
          <StepCard
            n="04"
            title="Final verification + batch consistency"
            body="Before shipping, we validate that the build behaves like a set — not a collection of individuals."
            bullets={[
              "Consistency checks across the dozen",
              "Visual/fit finish inspection",
              "Ready-to-tune out of the box",
            ]}
          />
        </div>
      </section>

      {/* Easton/Victory stance */}
      <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-7 md:p-10">
        <h2 className="text-xl font-extrabold md:text-2xl">Why Easton + Victory only</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/75 md:text-base">
          Your brand is precision. Easton and Victory are the easiest to defend on straightness,
          batch consistency, and real-world reliability — which makes them the best foundation for
          a repeatable process.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <MiniStat label="Consistency focus" value="Batch repeatability" />
          <MiniStat label="What we optimize" value="Flight + reliability" />
          <MiniStat label="What we avoid" value="“Close enough” builds" />
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-7 md:flex-row md:items-center md:p-10">
        <div>
          <div className="text-lg font-extrabold md:text-xl">Ready to build?</div>
          <div className="mt-2 max-w-xl text-sm text-white/70">
            Start a build sheet in the Arrow Builder. You’ll see your choices summarized and kept
            consistent as you go.
          </div>
        </div>
        <Link
          to="/builder"
          className="inline-flex items-center justify-center rounded-xl bg-yellow-500 px-5 py-3 text-sm font-extrabold text-black hover:bg-yellow-400"
        >
          Go to Arrow Builder
        </Link>
      </section>
    </div>
  );
}

function StepCard(props: {
  n: string;
  title: string;
  body: string;
  bullets: string[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-black tracking-wide text-yellow-400">
          CHECKPOINT {props.n}
        </div>
        <div className="text-xs text-white/45">Precision workflow</div>
      </div>

      <div className="mt-2 text-lg font-extrabold">{props.title}</div>
      <div className="mt-2 text-sm leading-7 text-white/75">{props.body}</div>

      <ul className="mt-4 space-y-2 text-sm text-white/75">
        {props.bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-yellow-400" />
            <span className="leading-7">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiniStat(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="text-xs text-white/55">{props.label}</div>
      <div className="mt-1 text-sm font-extrabold">{props.value}</div>
    </div>
  );
}
