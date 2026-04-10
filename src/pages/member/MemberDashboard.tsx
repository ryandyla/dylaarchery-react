import { useOutletContext, Link } from "react-router-dom";
import type { MemberOutletContext } from "./MemberShell";

const INTEREST_LABELS: Record<string, string> = {
  hunting: "🦌 Hunting",
  target: "🎯 Target",
  "3d": "🌲 3D",
  tac: "⚡ TAC",
};

export default function MemberDashboard() {
  const { member, bows } = useOutletContext<MemberOutletContext>();

  const firstName = member.name?.split(" ")[0] || member.email.split("@")[0];

  return (
    <div>
      {/* Welcome */}
      <div className="mb-8">
        <div className="text-xs font-bold tracking-[2px] text-yellow-400/60 mb-1">MEMBER DASHBOARD</div>
        <h1 className="text-2xl font-black text-white">
          Welcome back{member.name ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-white/50">{member.email}</p>
      </div>

      {/* Quick stats */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="BOWS SAVED"
          value={String(bows.length)}
          sub={bows.length === 0 ? "Add your first bow" : `${bows.length} rig${bows.length !== 1 ? "s" : ""}`}
          href="/member/bows"
        />
        <StatCard
          label="INTERESTS"
          value={member.interests.length > 0 ? member.interests.length + " set" : "—"}
          sub={member.interests.length > 0 ? member.interests.map(i => INTEREST_LABELS[i] ?? i).join(", ") : "Not set yet"}
          href="/member/bows"
        />
        <StatCard
          label="ORDERS"
          value="→"
          sub="View order history"
          href="/member/orders"
        />
      </div>

      {/* Bows quick view */}
      {bows.length > 0 && (
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-xs font-bold tracking-[2px] text-white/40">YOUR BOWS</div>
            <Link to="/member/bows" className="text-xs text-yellow-400/70 hover:text-yellow-400">Manage →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {bows.map((bow) => (
              <BowCard key={bow.id} bow={bow} />
            ))}
          </div>
        </div>
      )}

      {/* CTAs */}
      <div className="grid gap-3 sm:grid-cols-2">
        <CtaCard
          title="Get a Recommended Build"
          desc="Based on your bow specs and shooting style, we'll suggest the right arrow program."
          href="/member/builds"
          disabled={bows.length === 0}
          disabledHint="Add a bow first"
        />
        <CtaCard
          title="Start a Custom Build"
          desc="Use the full builder to spec out any setup you want."
          href="/builder"
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, href }: { label: string; value: string; sub: string; href: string }) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-white/8 bg-white/[0.025] p-4 hover:border-yellow-400/20 hover:bg-white/[0.04] transition-colors"
    >
      <div className="text-[10px] font-bold tracking-[1.5px] text-white/35 mb-2">{label}</div>
      <div className="text-2xl font-black text-white group-hover:text-yellow-400 transition-colors">{value}</div>
      <div className="mt-1 text-xs text-white/40">{sub}</div>
    </Link>
  );
}

function BowCard({ bow }: { bow: any }) {
  const title = bow.nickname || `${bow.brand || ""} ${bow.model || ""}`.trim() || "Unnamed Bow";
  const specs = [
    bow.draw_weight ? `${bow.draw_weight} lbs` : null,
    bow.draw_length ? `${bow.draw_length}"` : null,
    bow.ibo_speed ? `${bow.ibo_speed} fps IBO` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
      <div className="font-bold text-white">{title}</div>
      {bow.brand && <div className="text-xs text-white/40 mt-0.5">{bow.brand} {bow.model}</div>}
      {specs && <div className="mt-2 text-xs font-mono text-yellow-400/70">{specs}</div>}
    </div>
  );
}

function CtaCard({ title, desc, href, disabled, disabledHint }: {
  title: string; desc: string; href: string; disabled?: boolean; disabledHint?: string;
}) {
  const inner = (
    <div className={`rounded-2xl border p-5 transition-colors ${
      disabled
        ? "border-white/5 bg-white/[0.01] opacity-50"
        : "border-yellow-400/15 bg-yellow-400/[0.03] hover:border-yellow-400/30 hover:bg-yellow-400/[0.06]"
    }`}>
      <div className="font-bold text-white mb-1">{title}</div>
      <div className="text-xs text-white/50 leading-relaxed">{disabled ? disabledHint : desc}</div>
    </div>
  );

  if (disabled) return inner;
  return <Link to={href}>{inner}</Link>;
}
