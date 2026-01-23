// src/ui/styles.ts
import type React from "react";

export type Styles = Record<string, React.CSSProperties>;

export const TOKENS = {
  pageBg: "#07070a",
  text: "rgba(255,255,255,.92)",
  border: "rgba(255,255,255,.10)",
  font:
    "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial",
  ctaGrad: "linear-gradient(90deg, rgba(255,212,0,1), rgba(255,160,0,1))",
};

export const baseStyles: Styles = {
  page: {
    minHeight: "100vh",
    background: TOKENS.pageBg,
    color: TOKENS.text,
    fontFamily: TOKENS.font,
  },

  // full-bleed band (matches your Home hero)
  heroBand: {
    position: "relative",
    left: "50%",
    right: "50%",
    marginLeft: "-50vw",
    marginRight: "-50vw",
    width: "100vw",
    backgroundSize: "cover",
    borderBottom: `1px solid ${TOKENS.border}`,
  },

  heroOverlayNone: {
    position: "absolute",
    inset: 0,
    background: "transparent",
  },

  heroOverlayLightVignette: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,.10) 0%, rgba(0,0,0,.18) 55%, rgba(0,0,0,.38) 100%)",
  },

  // constrained inner container used everywhere
  inner1180: {
    position: "relative",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "48px 18px 44px",
  },

  // used when you want the hero content pushed downward
  innerHeroBottom: {
    position: "relative",
    maxWidth: 1180,
    margin: "0 auto",
    padding: "48px 18px 44px",
    minHeight: "inherit",
    display: "flex",
    alignItems: "flex-end",
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

  ctaPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    borderRadius: 14,
    padding: "12px 16px",
    fontWeight: 950,
    background: TOKENS.ctaGrad,
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

  footer: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "18px 18px 40px",
    opacity: 0.6,
    fontSize: 12,
  },
};

// Small helper to build hero style consistently
export function heroStyle(opts: {
  imageUrl: string;
  minHeight?: string;
  backgroundPosition?: string;
  parallax?: boolean;
}) {
  return {
    ...baseStyles.heroBand,
    minHeight: opts.minHeight ?? "min(70vh, 700px)",
    backgroundImage: `url(${opts.imageUrl})`,
    backgroundPosition: opts.backgroundPosition ?? "center",
    backgroundAttachment: opts.parallax ? "fixed" : undefined,
  } satisfies React.CSSProperties;
}
