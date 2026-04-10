import { useOutletContext, Link } from "react-router-dom";
import type { MemberOutletContext } from "./MemberShell";

export default function MemberBuildsPage() {
  const { bows } = useOutletContext<MemberOutletContext>();

  if (bows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
        <div className="text-2xl mb-3">🏹</div>
        <div className="font-bold text-white mb-2">Add a bow first</div>
        <p className="text-sm text-white/40 mb-4">
          Save your bow's draw weight, draw length, and IBO speed and we'll recommend the right arrow program for you.
        </p>
        <Link
          to="/member/bows"
          className="inline-block rounded-xl bg-yellow-500 px-5 py-2 text-sm font-extrabold text-black hover:bg-yellow-400 transition-colors"
        >
          Add Your Bow →
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-xs font-bold tracking-[2px] text-white/40">RECOMMENDED BUILDS</div>
      <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.03] p-8 text-center">
        <div className="text-2xl mb-3">⚙️</div>
        <div className="font-bold text-white mb-2">Recommendation engine coming soon</div>
        <p className="text-sm text-white/40">
          Your bow data is saved. We're building the logic to match your setup to the right shafts, spine, and components.
        </p>
      </div>
    </div>
  );
}
