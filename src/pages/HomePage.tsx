import React from "react";

const HERO_IMAGES = [
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

export default function HomePage() {
  const heroUrl = useRandomHero(HERO_IMAGES);

  return (
    <div style={styles.page}>
      {/* HERO BAND */}
      <section
  style={{
    ...styles.heroBand,
    backgroundImage: `url(${heroUrl})`,
    backgroundPosition: heroUrl.includes("deerbg3")
      ? "center bottom"
      : "center",
  }}
>
        <div style={styles.heroOverlay} />

        {/* Constrained content, but vertically bottom-aligned */}
        <div style={styles.heroInner}>
          <div style={styles.heroBottom}>
            <h1 style={styles.h1}>Custom arrows built like equipment, not accessories.</h1>

            <div style={styles.ctaRow}>
              <a href="/builder" style={styles.ctaPrimary}>Build Your Arrows</a>
              <a href="/process" style={styles.ctaSecondary}>Learn Our Process</a>
            </div>
          </div>
        </div>
      </section>

      {/* Optional: keep or remove this lower section */}
      <section style={styles.lowerSection}>
        <div style={styles.lowerInner}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 950 }}>
            Why we only build with Easton and Victory
          </h2>
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
    minHeight: "min(78vh, 820px)", // tweak this to show more/less image
    backgroundSize: "cover",
    backgroundAttachment: "fixed",
    backgroundPosition: "center",
    borderBottom: "1px solid rgba(255,255,255,.10)",
  },

  // keep it super light (or transparent) since you said no overlay box "background:linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.22) 55%, rgba(0,0,0,0.55) 100%)",
  heroOverlay: {
    position: "absolute",
    inset: 0      
  },

  heroInner: {
    position: "relative",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "48px 18px 44px",
    minHeight: "inherit",
    display: "flex",
  },

  // This is the key: pushes content toward the bottom
  heroBottom: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: 14,
    paddingBottom: 6,
    maxWidth: 820, // keeps the tagline/CTAs from stretching too wide
  },

  h1: {
    margin: 0,
    fontSize: 46,
    fontWeight: 980,
    letterSpacing: -0.6,
    lineHeight: 1.05,
    textShadow: "0 10px 35px rgba(0,0,0,.65)",
  },

  ctaRow: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
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
    background: "rgba(0,0,0,.18)",
    color: "rgba(255,255,255,.92)",
    border: "1px solid rgba(255,255,255,.16)",
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
