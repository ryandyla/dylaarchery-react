import React, { useEffect, useState } from "react";

const HERO_IMAGES = [
  "/api/images/796892.jpg",
  // later add more:
  // "/api/images/hero/2.jpg",
  // "/api/images/hero/3.jpg",
];

function useHeroRotation(urls: string[], ms = 9000) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (urls.length <= 1) return;
    const t = setInterval(() => setI((v) => (v + 1) % urls.length), ms);
    return () => clearInterval(t);
  }, [urls, ms]);

  return urls[Math.min(i, urls.length - 1)];
}

export default function HomePage() {
  const heroUrl = useHeroRotation(HERO_IMAGES, 9000);

  return (
    <div style={styles.page}>
      
      {/* HERO BAND */}
      <section style={{ ...styles.heroBand, backgroundImage: `url(${heroUrl})` }}>
        <div style={styles.heroOverlay} />
        <div style={styles.heroInner}>
          <div style={styles.heroGrid}>
            {/* Left content */}
            <div>
              <h1 style={styles.h1}>Custom arrows built like equipment, not accessories.</h1>
              <p style={styles.heroP}>
                We obsess over the details: spine selection, tolerance control, straightness checks,
                and repeatable builds — engineered for consistency when the shot matters.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
                <a href="/builder" style={styles.ctaPrimary}>Build Your Arrows</a>
                <a href="/process" style={styles.ctaSecondary}>Learn Our Process</a>
              </div>

              <div style={styles.featureRow}>
                <div style={styles.featureCard}>
                  <div style={styles.featureTitle}>Spine & Balance</div>
                  <div style={styles.featureText}>Static + dynamic spine guidance with FOC estimates.</div>
                </div>
                <div style={styles.featureCard}>
                  <div style={styles.featureTitle}>Measured Cuts</div>
                  <div style={styles.featureText}>Cut-to-length in ¼″ increments. No guessing.</div>
                </div>
                <div style={styles.featureCard}>
                  <div style={styles.featureTitle}>Build Verification</div>
                  <div style={styles.featureText}>Alignment, consistency checks, and QC before ship.</div>
                </div>
              </div>
            </div>

            {/* Right mission card */}
            <div style={styles.missionCard}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, letterSpacing: 0.3 }}>OUR MISSION</div>
              <div style={{ fontSize: 22, fontWeight: 980, marginTop: 10, lineHeight: 1.15 }}>
                Make arrow building approachable —
                <br />
                without compromising performance.
              </div>

              <ul style={styles.missionList}>
                <li>Build guides that explain the “why”, not just the “what”.</li>
                <li>Product choices curated for proven performance.</li>
                <li>Assembly + tuning practices that match serious shooters.</li>
              </ul>

              <div style={styles.missionNote}>
                Easton + Victory only — because tolerance and consistency are the product.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lower section placeholder */}
      <section style={styles.lowerSection}>
        <div style={styles.lowerInner}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>Why we only build with Easton and Victory</h2>
          <p style={{ marginTop: 10, opacity: 0.75, lineHeight: 1.6 }}>
            Your whole brand story is precision. These two manufacturers are the easiest to defend on
            straightness, batch consistency, and real-world reliability.
          </p>
        </div>
      </section>

      <footer style={styles.footer}>
        © {new Date().getFullYear()} Dyla Archery • Built for hunters & precision shooters
      </footer>
    </div>
  );
}

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
    minHeight: 520,
    backgroundSize: "cover",
    backgroundPosition: "center",
    borderBottom: "1px solid rgba(255,255,255,.10)",
  },

  heroOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(90deg, rgba(0,0,0,.78) 0%, rgba(0,0,0,.64) 46%, rgba(0,0,0,.78) 100%)," +
      "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.85) 100%)",
  },
  heroInner: {
    position: "relative",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "48px 18px 44px",
  },
  heroGrid: {
    display: "grid",
    gridTemplateColumns: "1.25fr .75fr",
    gap: 18,
    alignItems: "start",
  },
  h1: {
    margin: 0,
    fontSize: 44,
    fontWeight: 980,
    letterSpacing: -0.6,
    lineHeight: 1.05,
  },
  heroP: {
    marginTop: 14,
    maxWidth: 620,
    opacity: 0.82,
    lineHeight: 1.65,
    fontSize: 14,
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

  featureRow: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginTop: 22 },
  featureCard: {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.24)",
    padding: 12,
  },
  featureTitle: { fontWeight: 950, fontSize: 13 },
  featureText: { marginTop: 6, fontSize: 12, opacity: 0.72, lineHeight: 1.45 },

  missionCard: {
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,.14)",
    background: "linear-gradient(180deg, rgba(50,25,0,.55), rgba(10,10,14,.92))",
    boxShadow: "0 18px 70px rgba(0,0,0,.55)",
    padding: 18,
  },
  missionList: {
    marginTop: 14,
    opacity: 0.8,
    lineHeight: 1.7,
    paddingLeft: 18,
    fontSize: 13,
  },
  missionNote: {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.22)",
    fontSize: 12,
    opacity: 0.85,
  },

  lowerSection: { padding: "34px 18px 10px" },
  lowerInner: { maxWidth: 1180, margin: "0 auto" },

  footer: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "18px 18px 40px",
    opacity: 0.6,
    fontSize: 12,
  },
};
