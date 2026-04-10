import { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";

export type Bow = {
  id: number;
  nickname: string | null;
  brand: string | null;
  model: string | null;
  bow_type: string | null;
  ibo_speed: number | null;
  draw_length: number | null;
  draw_weight: number | null;
  created_at: string;
};

export type MemberData = {
  id: number;
  email: string;
  name: string | null;
  interests: string[];
};

export type MemberOutletContext = {
  member: MemberData;
  bows: Bow[];
  refresh: () => void;
};

export default function MemberShell() {
  const navigate = useNavigate();
  const [member, setMember] = useState<MemberData | null>(null);
  const [bows, setBows] = useState<Bow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const res = await fetch("/api/member/me");
      if (res.status === 401) { navigate("/member"); return; }
      const data: any = await res.json();
      setMember(data.member);
      setBows(data.bows ?? []);
    } catch {
      navigate("/member");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function logout() {
    await fetch("/api/member/auth/logout", { method: "POST" });
    navigate("/member");
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-white/40 text-sm">
        Loading…
      </div>
    );
  }

  if (!member) return null;

  const linkClass = ({ isActive }: any) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? "bg-yellow-500/20 text-yellow-400" : "text-white/60 hover:text-white hover:bg-white/8"
    }`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Member sub-nav */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3">
        <div className="flex flex-wrap gap-1">
          <NavLink to="/member/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/member/bows" className={linkClass}>My Bows</NavLink>
          <NavLink to="/member/builds" className={linkClass}>Recommended Builds</NavLink>
          <NavLink to="/member/orders" className={linkClass}>Orders</NavLink>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">{member.email}</span>
          <button
            onClick={logout}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/50 hover:text-white/80 hover:bg-white/10 transition-colors"
          >
            Log out
          </button>
        </div>
      </div>

      <Outlet context={{ member, bows, refresh: load } satisfies MemberOutletContext} />
    </div>
  );
}
