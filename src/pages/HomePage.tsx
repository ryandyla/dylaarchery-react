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
    <div className={tw.page}>
      <section style={heroBandStyle({ imageUrl: heroUrl, backgroundPosition: bgPos })}>
        <div style={heroOverlayNone} />
        <div style={heroInnerBottom}>
          <div className={`${tw.container} w-full`}>
            <div className="max-w-2xl pb-2">
              <h1 className={tw.h1}>Custom arrows built like equipment, not accessories.</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/75">
                We obsess over the details: spine selection, tolerance control, straightness checks,
                and repeatable builds — engineered for consistency when the shot matters.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a href="/builder" className={tw.btnPrimary}>Build Your Arrows</a>
                <a href="/process" className={tw.btnSecondary}>Learn Our Process</a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${tw.container} py-10`}>
        <h2 className={tw.h2}>Why we only build with Easton and Victory</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-white/70">
          Your whole brand story is precision. These two manufacturers are the easiest to defend on
          straightness, batch consistency, and real-world reliability.
        </p>
      </section>

      <footer className={`${tw.container} pb-10 text-xs text-white/60`}>
        © {new Date().getFullYear()} Dyla Archery • Built for hunters & precision shooters
      </footer>
    </div>
  );
}
