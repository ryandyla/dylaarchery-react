// src/ui/tw.ts
export const tw = {
  // page shell
  page: "min-h-screen bg-zinc-950 text-white",

  // consistent max width container
  container: "mx-auto max-w-6xl px-4",

  // headings / text
  h1: "text-4xl font-black tracking-tight md:text-5xl",
  h2: "text-2xl font-black tracking-tight",
  p: "text-sm leading-7 text-white/70",

  // buttons
  btnPrimary:
    "inline-flex items-center justify-center rounded-xl bg-yellow-500 px-4 py-3 text-sm font-extrabold text-black hover:bg-yellow-400",
  btnSecondary:
    "inline-flex items-center justify-center rounded-xl border border-white/15 bg-black/25 px-4 py-3 text-sm font-extrabold text-white/90 hover:bg-black/35",

  // cards
  card:
    "rounded-3xl border border-white/10 bg-white/[0.03] shadow-[0_30px_90px_rgba(0,0,0,.35)]",
  cardPad: "p-6",

  // section separators
  sectionBorder: "border-t border-white/10",
};
