import { Outlet, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import LeadWidget from "../LeadWidget";

type ActiveSpecial = {
  id: number;
  name: string;
  description: string | null;
  type: "percent_off" | "fixed_off" | "free_shipping";
  value: number | null;
};

function formatSpecial(s: ActiveSpecial): string {
  if (s.type === "percent_off" && s.value != null) return `${s.value}% off your order`;
  if (s.type === "fixed_off" && s.value != null) return `$${s.value} off your order`;
  if (s.type === "free_shipping") return "free shipping on your order";
  return "";
}

function SpecialsBanner() {
  const [special, setSpecial] = useState<ActiveSpecial | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem("dyla_banner_dismissed")) return;

    fetch("/api/specials")
      .then((r) => r.json())
      .then((d: any) => {
        if (d.ok && d.specials?.length > 0) setSpecial(d.specials[0]);
      })
      .catch(() => {});
  }, []);

  if (!special || dismissed) return null;

  const detail = formatSpecial(special);

  return (
    <div className="relative bg-yellow-400 px-4 py-2.5 text-center text-sm font-bold text-black">
      <span className="mr-1">🎉</span>
      <span className="font-extrabold">{special.name}</span>
      {detail && (
        <span className="font-normal"> — Get {detail}
          {special.description ? `. ${special.description}` : ""}
        </span>
      )}
      <button
        onClick={() => {
          sessionStorage.setItem("dyla_banner_dismissed", "1");
          setDismissed(true);
        }}
        aria-label="Dismiss"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 hover:bg-black/10 transition-colors text-black/60 hover:text-black"
      >
        ✕
      </button>
    </div>
  );
}

function MailingListSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("busy");
    try {
      const res = await fetch("/api/marketing/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json() as any;
      if (!res.ok || !data.ok) throw new Error(data.message || "Error");
      setStatus("done");
      setMsg(data.already ? "You're already on the list." : "You're on the list — check your inbox.");
    } catch (err: any) {
      setStatus("error");
      setMsg(err?.message || "Something went wrong. Try again.");
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-sm font-bold text-white/80">Stay in the loop</div>
        <div className="mt-0.5 text-xs text-white/40">
          No spam — occasional updates and the odd deal.
        </div>
      </div>

      {status === "done" ? (
        <div className="text-sm font-semibold text-green-400">{msg}</div>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
            placeholder="your@email.com"
            className="w-56 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-yellow-400/40"
          />
          <button
            type="submit"
            disabled={status === "busy"}
            className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-extrabold text-black hover:bg-yellow-400 disabled:opacity-50"
          >
            {status === "busy" ? "…" : "Join"}
          </button>
          {status === "error" && (
            <span className="self-center text-xs text-red-400">{msg}</span>
          )}
        </form>
      )}
    </div>
  );
}

export default function AppShell() {
  const linkClass = ({ isActive }: any) =>
    `px-3 py-2 rounded-lg text-sm font-medium ${
      isActive ? "bg-yellow-500 text-black" : "text-white/80 hover:text-white hover:bg-white/10"
    }`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SpecialsBanner />
      <header className="sticky top-0 z-10 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
          <div className="h-30 w-30 shrink-0 overflow-hidden" >
          
            <img
              src="/logo.png"
              alt="Dyla Archery"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="leading-tight">
            <div className="font-semibold">Dyla Archery</div>
            <div className="text-xs text-white/60">Precision-built custom arrows</div>
          </div>
        </div>

          <nav className="flex items-center gap-2">
            <NavLink to="/" className={linkClass} end>Home</NavLink>
            <NavLink to="/builder" className={linkClass}>Build Your Arrows</NavLink>
            <NavLink to="/process" className={linkClass}>Our Process</NavLink>
            <NavLink to="/tools" className={linkClass}>Tools and Calculators</NavLink>
            <NavLink to="/contact" className={linkClass}>Contact</NavLink>
            <NavLink to="/member" className={({ isActive }) =>
              `px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                isActive
                  ? "bg-yellow-500/20 border-yellow-400/30 text-yellow-400"
                  : "border-yellow-400/20 text-yellow-400/80 hover:bg-yellow-400/10 hover:text-yellow-400"
              }`
            }>My Account</NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto px-0 py-0">
        <Outlet />
      </main>

      <LeadWidget />

      <footer className="border-t border-white/10 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <MailingListSignup />
          <div className="mt-8 border-t border-white/10 pt-6 text-sm text-white/40">
            © {new Date().getFullYear()} Dyla Archery • Built for hunters & precision shooters
          </div>
        </div>
      </footer>
    </div>
  );
}
