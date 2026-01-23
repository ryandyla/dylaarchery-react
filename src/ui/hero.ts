// src/ui/hero.ts
import type React from "react";

type HeroOpts = {
  imageUrl: string;
  minHeight?: string;              // e.g. "min(72vh, 760px)"
  backgroundPosition?: string;     // e.g. "center bottom"
  parallax?: boolean;              // background-attachment fixed
};

export function heroBandStyle(opts: HeroOpts): React.CSSProperties {
  return {
    position: "relative",
    left: "50%",
    right: "50%",
    marginLeft: "-50vw",
    marginRight: "-50vw",
    width: "100vw",
    minHeight: opts.minHeight ?? "min(70vh, 700px)",
    backgroundImage: `url(${opts.imageUrl})`,
    backgroundSize: "cover",
    backgroundPosition: opts.backgroundPosition ?? "center",
    backgroundAttachment: opts.parallax ? "fixed" : undefined,
    borderBottom: "1px solid rgba(255,255,255,.10)",
    overflow: "hidden",
  };
}

export const heroOverlayNone: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "transparent",
};

export const heroOverlayVignette: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(0,0,0,.10) 0%, rgba(0,0,0,.18) 55%, rgba(0,0,0,.38) 100%)",
};

// Inner container that can push content to bottom (like your homepage/process hero)
export const heroInnerBottom: React.CSSProperties = {
  position: "relative",
  maxWidth: 1152, // max-w-6xl ≈ 72rem
  margin: "0 auto",
  padding: "48px 16px 44px", // matches px-4 vibes
  minHeight: "inherit",
  display: "flex",
  alignItems: "flex-end",
};

// If you want normal flow in the hero
export const heroInner: React.CSSProperties = {
  position: "relative",
  maxWidth: 1152,
  margin: "0 auto",
  padding: "48px 16px 44px",
};
