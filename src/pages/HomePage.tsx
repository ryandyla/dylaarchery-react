import React from "react";
import { tw } from "../ui/tw";
import { heroBandStyle, heroOverlayNone, heroInnerBottom } from "../ui/hero";

const HERO_IMAGES = [
  "/api/images/796892.jpg",
  "/api/images/deerbg1.jpg",
  "/api/images/deerbg2.jpg",
  "/api/images/deerbg3.jpg",
];

function useRandomHero(urls: string[]) {
  const [url] = React.useState(() => {
    if (!urls?.length) return "";
    return urls[Math.floor(Math.random() * urls.length)];
  });
  return url;
}

export default function HomePage() {
  const heroUrl = useRandomHero(HERO_IMAGES);
  const bgPos = heroUrl.includes("deerbg3") ? "center bottom" : "center";

  return (
    <div style={styles.page}>
      {/* HERO BAND */}
      <section
        style={heroBandStyle({
          imageUrl: heroUrl,
          minHeight: "min(70vh, 700px)",
          backgroundPosition: bgPos,
          parallax: false,
        })}
      >
        <div style={heroOverlayNone} />

        <div style={heroInnerBottom}>
          <div style={styles.heroStack}>
            <h1 style={styles.h1}>Custom arrows built like equipment, not accessories.</h1>

            <p style={styles.heroP}>
              We obsess over the details: spine selection, tolerance control, straightness checks,
              and repeatable builds — engineered for consistency when the shot matters.
            </p>

            <div style={styles.ctaRow}>
              <a href="/builder" style={styles.ctaPrimary}>Build Your Arrows</a>
              <a href="/process" style={styles.ctaSecondary}>Learn Our Process</a>
            </div>
          </div>
        </div>
      </section>

      {/* Optional lower section */}
      <section style={styles.lowerSection}>
        <div style={styles.lowerInner}>
          <h2 style={styles.h2}>Why we only build with Easton and Victory</h2>
          <p style={styles.p}>
            Your whole brand story is precision. These two manufacturers are the easiest to defend on
            straightness, batch consistency, and real-world reliability.
          </p>
        </div>
      </section>

      <footer className={`${tw.container} pb-10 text-xs text-white/60`}>
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

  heroStack: {
    maxWidth: 720,
    paddingBottom: 14,
  },

  h1: {
    margin: 0,
    fontSize: 44,
    fontWeight: 980,
    letterSpacing: -0.6,
    lineHeight: 1.05,
    textShadow: "0 10px 35px rgba(0,0,0,.65)",
  },

  heroP: {
    marginTop: 14,
    maxWidth: 620,
    opacity: 0.92,
    lineHeight: 1.65,
    fontSize: 14,
    textShadow: "0 8px 26px rgba(0,0,0,.55)",
  },

  ctaRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 18,
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

  lowerSection: { padding: "34px 18px 10px" },
  lowerInner: { maxWidth: 1180, margin: "0 auto" },

  h2: { margin: 0, fontSize: 18, fontWeight: 950 },
  p: { marginTop: 10, opacity: 0.75, lineHeight: 1.6 },
};
