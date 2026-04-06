import React from "react";
import { tw } from "../ui/tw";
import { heroBandStyle, heroOverlayNone, heroInnerBottom } from "../ui/hero";

const PROCESS_HERO_IMAGES = [
  "/api/images/796892.jpg",
  "/api/images/deerbg1.jpg",
  "/api/images/deerbg2.jpg",
  "/api/images/deerbg3.jpg",
];

function useRandomHero(urls: string[]) {
  const [url] = React.useState(() => {
    if (!urls?.length) return "";
    const idx = Math.floor(Math.random() * urls.length);
    return urls[idx];
  });
  return url;
}

const STEPS = [
  {
    title: "Spec + Selection",
    body: "Build intent first. We select components that actually support it — no filler, no compromises.",
    check: "Shaft + component compatibility confirmed before cutting.",
  },
  {
    title: "Cut + Measure",
    body: "Cuts are repeatable and verified. If a measurement is off it gets corrected, not rationalized.",
    check: "Cut length verified to spec.",
  },
  {
    title: "Build + Align",
    body: "Assembly is about alignment and consistency. We treat it like a system, not a craft project.",
    check: "Component seating + alignment checked before cure.",
  },
  {
    title: "QC Gate",
    body: "Everything that matters gets checked. Anything outside tolerance gets reworked or rejected.",
    check: "Final QC before the set ships.",
  },
];

export default function ProcessPage() {
  const heroUrl = useRandomHero(PROCESS_HERO_IMAGES);
  const bgPos = heroUrl.includes("deerbg3") ? "center bottom" : "center";

  return (
    <div style={{ minHeight: "100vh", background: "#07070a", color: "rgba(255,255,255,.92)" }}>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section
        style={heroBandStyle({
          imageUrl: heroUrl,
          minHeight: "min(70vh, 700px)",
          backgroundPosition: bgPos,
          parallax: true,
        })}
      >
        <div style={heroOverlayNone} />
        <div style={heroInnerBottom}>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            <div style={styles.kicker}>THE DYLA PROCESS</div>
            <h1 style={styles.h1}>
              Precision isn't a feature —
              <br />
              it's the workflow.
            </h1>
            <p style={styles.lede}>
              We build arrows like equipment: measured, repeatable, and verified at every gate.
              If something doesn't meet tolerance, it doesn't move forward.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 20 }}>
              <a href="/builder" style={styles.ctaPrimary}>Build Your Arrows</a>
              <a href="/contact" style={styles.ctaSecondary}>Ask a Build Question</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Process steps ──────────────────────────────────── */}
      <section className="py-16">
        <div className={tw.container}>
          <h2 className={tw.h2}>How we build</h2>
          <p className={`${tw.p} mt-2 max-w-2xl`}>
            Every set goes through the same four gates — in order, every time.
          </p>

          {/* Stepper — horizontal on md+, vertical on mobile */}
          <div className="mt-12 flex flex-col md:flex-row md:items-start">
            {STEPS.map((step, idx) => (
              <React.Fragment key={step.title}>

                {/* Step card */}
                <div className="flex flex-1 flex-col items-center text-center px-2">
                  {/* Badge */}
                  <div
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black text-black"
                    style={{
                      background: "linear-gradient(135deg, #ffd400, #ffa000)",
                      boxShadow: "0 0 0 5px rgba(255,212,0,.10), 0 0 0 1px rgba(255,212,0,.30)",
                    }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  {/* Title */}
                  <div className="mt-4 text-sm font-black tracking-tight">{step.title}</div>

                  {/* Body */}
                  <div className="mt-2 text-xs leading-relaxed text-white/55" style={{ maxWidth: 190 }}>
                    {step.body}
                  </div>

                  {/* Check line */}
                  <div
                    className="mt-4 flex items-start gap-1.5 rounded-xl px-3 py-2 text-left text-xs text-white/50"
                    style={{ background: "rgba(255,212,0,.06)", border: "1px solid rgba(255,212,0,.12)" }}
                  >
                    <span
                      className="mt-px h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: "#ffd400", marginTop: 3 }}
                    />
                    {step.check}
                  </div>
                </div>

                {/* Horizontal connector (desktop) */}
                {idx < STEPS.length - 1 && (
                  <div
                    className="hidden md:block shrink-0 mt-[22px] h-px w-8"
                    style={{ background: "linear-gradient(90deg, rgba(255,180,0,.45), rgba(255,160,0,.12))" }}
                  />
                )}

                {/* Vertical connector (mobile) */}
                {idx < STEPS.length - 1 && (
                  <div
                    className="mx-auto my-6 h-8 w-px md:hidden"
                    style={{ background: "linear-gradient(180deg, rgba(255,180,0,.35), rgba(255,160,0,.08))" }}
                  />
                )}

              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom callout ─────────────────────────────────── */}
      <section className="border-t border-white/10 py-10">
        <div className={tw.container}>
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="text-sm font-black">Easton + Victory only.</div>
              <div className="mt-1 max-w-md text-xs leading-relaxed text-white/55">
                We work with premium shaft brands because tolerance is the product — not a
                promise. If a component doesn't meet spec, it doesn't ship.
              </div>
            </div>
            <a href="/builder" className={tw.btnPrimary}>Start Your Build</a>
          </div>
        </div>
      </section>

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  kicker: {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: 0.6,
    opacity: 0.85,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.16)",
    background: "rgba(0,0,0,.18)",
    marginBottom: 14,
  },
  h1: {
    margin: 0,
    fontSize: 46,
    fontWeight: 980,
    letterSpacing: -0.7,
    lineHeight: 1.05,
    textShadow: "0 10px 35px rgba(0,0,0,.65)",
  },
  lede: {
    marginTop: 14,
    maxWidth: 680,
    opacity: 0.92,
    lineHeight: 1.7,
    fontSize: 14,
    textShadow: "0 8px 26px rgba(0,0,0,.55)",
  },
  ctaPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 950,
    background: "linear-gradient(90deg, rgba(255,212,0,1), rgba(255,160,0,1))",
    color: "#0b0b10",
    border: "none",
  },
  ctaSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 900,
    background: "rgba(0,0,0,.25)",
    color: "rgba(255,255,255,.90)",
    border: "1px solid rgba(255,255,255,.14)",
  },
};
