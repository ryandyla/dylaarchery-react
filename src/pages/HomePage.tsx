import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-5">
        <h1 className="text-4xl font-bold tracking-tight">
          Custom arrows built like equipment, not accessories.
        </h1>

        <p className="text-white/75 leading-relaxed">
          At Dyla Archery we obsess over the details: correct spine selection, bare-shaft alignment,
          broadhead tuning, straightness, and repeatability. Whether you’re building a premium target setup
          or a hard-use hunting arrow, we build arrows that fly true.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/builder"
            className="rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-black hover:brightness-110"
          >
            Build Your Arrows
          </Link>
          <Link
            to="/contact"
            className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white hover:bg-white/10"
          >
            Contact Us
          </Link>
        </div>

        <div className="grid gap-3 pt-4 sm:grid-cols-3">
          {[
            ["Spine & FOC", "Built around math + tuning."],
            ["Precision Cuts", "Length in ¼” increments."],
            ["Quality Checks", "Straightness + consistency."],
          ].map(([title, desc]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="font-semibold">{title}</div>
              <div className="text-sm text-white/70 mt-1">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-orange-500/15 via-yellow-500/10 to-transparent p-8">
        <div className="text-sm text-white/70">Our mission</div>
        <h2 className="mt-2 text-2xl font-semibold">Make arrow building approachable — without compromising performance.</h2>

        <ul className="mt-6 space-y-3 text-white/75">
          <li>• Build guides that explain the “why”, not just the “what”.</li>
          <li>• Product choices curated for proven performance.</li>
          <li>• Assembly + tuning practices that match serious shooters.</li>
        </ul>

        <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-950/40 p-4 text-sm text-white/70">
          Coming soon: FOC calculator, spine recommendation wizard, and “build sheets” you can save and share.
        </div>
      </div>
    </div>
  );
}
