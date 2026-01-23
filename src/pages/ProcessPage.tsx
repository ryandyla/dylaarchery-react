import React from "react";
import { tw } from "../ui/tw";
import { heroBandStyle, heroOverlayVignette, heroInnerBottom } from "../ui/hero";


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

export default function ProcessPage() {
  const heroUrl = useRandomHero(PROCESS_HERO_IMAGES);
  const bgPos = heroUrl.includes("deerbg3") ? "center bottom" : "center";

  return (
    <div style={styles.page}>
            <section
        style={{
          ...styles.heroBand,
          backgroundImage: `url(${heroUrl})`,
          backgroundPosition: bgPos,
        }}
      >
        {/* ultra-light vignette for legibility */}
        <div style={styles.heroOverlay} />

        <div style={styles.heroInner}>
          <div style={styles.heroStack}>
            <div style={styles.kicker}>THE DYLA PROCESS</div>

            <h1 style={styles.h1}>
              Precision isn’t a feature —
              <br />
              it’s the workflow.
            </h1>

            <p style={styles.lede}>
              We build arrows like equipment: measured, repeatable, and verified at every gate.
              If something doesn’t meet tolerance, it doesn’t move forward.
            </p>

            <div style={styles.ctaRow}>
              <a href="/builder" style={styles.ctaPrimary}>Build Your Arrows</a>
              <a href="/contact" style={styles.ctaSecondary}>Ask a Build Question</a>
            </div>
          </div>
        </div>
      </section>


      {/* CONTENT */}
      <section style={styles.section}>
        <div style={styles.inner}>
          <h2 style={styles.h2}>Quality gates</h2>
          <p style={styles.p}>
            The point isn’t to sound technical — it’s to deliver consistency you can trust when the shot matters.
            These are the checkpoints we don’t skip.
          </p>

          <div style={styles.gates}>
            {GATES.map((g, idx) => (
              <div key={g.title} style={styles.gateCard}>
                <div style={styles.gateTop}>
                  <div style={styles.gateIndex}>{String(idx + 1).padStart(2, "0")}</div>
                  <div>
                    <div style={styles.gateTitle}>{g.title}</div>
                    <div style={styles.gateText}>{g.body}</div>
                  </div>
                </div>

                {/* one tight “what happens” line only */}
                <div style={styles.gateFooter}>
                  <span style={styles.dot} />
                  <span style={styles.gateFooterText}>{g.check}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOTTOM STRIP */}
      <section style={styles.strip}>
        <div style={styles.inner}>
          <div style={styles.stripGrid}>
            <div style={styles.stripCard}>
              <div style={styles.stripTitle}>What we obsess over</div>
              <ul style={styles.ul}>
                <li>Measured cut length and repeatability</li>
                <li>Component alignment and concentricity</li>
                <li>Build consistency across a set</li>
              </ul>
            </div>

            <div style={styles.stripCard}>
              <div style={styles.stripTitle}>What you get</div>
              <ul style={styles.ul}>
                <li>Confidence in the build, not guesswork</li>
                <li>Consistency shot-to-shot, arrow-to-arrow</li>
                <li>Easton + Victory only (tolerance is the product)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer style={styles.footer}>
        © {new Date().getFullYear()} Dyla Archery • Built for hunters & precision shooters
      </footer>
    </div>
  );
}

const GATES = [
  {
    title: "Spec + selection",
    body: "We start with the build intent and select components that support it — no filler parts, no compromises.",
    check: "Shaft + component compatibility confirmed before cutting.",
  },
  {
    title: "Cut + measure",
    body: "Cuts are repeatable and verified. If a measurement is off, it gets corrected — not rationalized.",
    check: "Cut length verified to the build spec.",
  },
  {
    title: "Build + align",
    body: "Assembly is about alignment and consistency. We treat it like a system, not a craft project.",
    check: "Component seating + alignment checked before cure.",
  },
  {
    title: "QC gate",
    body: "Everything that matters gets checked. Anything outside tolerance gets reworked or rejected.",
    check: "Final QC before the set ships.",
  },
];

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#07070a",
    color: "rgba(255,255,255,.92)",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  },

  heroBand: {
    position: "relative",
    left: "50%",
    right: "50%",
    marginLeft: "-50vw",
    marginRight: "-50vw",
    width: "100vw",
    minHeight: "min(72vh, 760px)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
    borderBottom: "1px solid rgba(255,255,255,.10)",
  },
  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,.10) 0%, rgba(0,0,0,.18) 55%, rgba(0,0,0,.38) 100%)",
  },
  heroInner: {
    position: "relative",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "48px 18px 44px",
    minHeight: "inherit",
    display: "flex",
    alignItems: "flex-end",
  },

  heroStack: {
    maxWidth: 760,
    paddingBottom: 14,
  },
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
  },
  h1: {
    margin: "14px 0 0",
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
  ctaRow: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 },
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

  section: { padding: "44px 18px 18px" },
  strip: { padding: "18px 18px 44px" },
  inner: { maxWidth: 1180, margin: "0 auto" },

  h2: { margin: 0, fontSize: 22, fontWeight: 980, letterSpacing: -0.2 },
  p: { marginTop: 10, opacity: 0.75, lineHeight: 1.7, maxWidth: 820, fontSize: 14 },

  gates: {
    marginTop: 18,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  gateCard: {
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(255,255,255,.03)",
    padding: 16,
  },
  gateTop: { display: "flex", gap: 12, alignItems: "flex-start" },
  gateIndex: {
    width: 38,
    height: 38,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    fontWeight: 980,
    fontSize: 12,
    color: "#0b0b10",
    background: "linear-gradient(90deg, rgba(255,212,0,1), rgba(255,160,0,1))",
    flex: "0 0 auto",
  },
  gateTitle: { fontWeight: 980, fontSize: 14, marginTop: 2 },
  gateText: { marginTop: 6, fontSize: 13, opacity: 0.74, lineHeight: 1.6, maxWidth: 520 },

  gateFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,.10)",
    display: "flex",
    gap: 10,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    background: "rgba(255,212,0,1)",
    boxShadow: "0 0 0 3px rgba(255,212,0,.15)",
  },
  gateFooterText: { fontSize: 12, opacity: 0.72, lineHeight: 1.4 },

  stripGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  stripCard: {
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.20)",
    padding: 16,
  },
  stripTitle: { fontWeight: 980, fontSize: 14 },
  ul: {
    marginTop: 10,
    paddingLeft: 18,
    opacity: 0.78,
    lineHeight: 1.8,
    fontSize: 13,
  },

  footer: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "18px 18px 40px",
    opacity: 0.6,
    fontSize: 12,
  },
};
