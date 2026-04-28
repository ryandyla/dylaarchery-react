import { Outlet, NavLink, useLocation } from "react-router-dom";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";
  const expanded = isHome && !scrolled;

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = ({ isActive }: any) =>
    `inline-flex items-center justify-center px-4 py-2 rounded-md uppercase tracking-[0.15em] text-xs font-bold border transition-colors ${
      isActive
        ? "bg-yellow-500 border-yellow-500 text-black"
        : "bg-white/5 border-white/10 text-white/85 hover:bg-white/10 hover:border-white/25 hover:text-white"
    }`;

  const memberLinkClass = ({ isActive }: any) =>
    `inline-flex items-center justify-center px-4 py-2 rounded-md uppercase tracking-[0.15em] text-xs font-bold border transition-colors ${
      isActive
        ? "bg-yellow-500/20 border-yellow-400 text-yellow-400"
        : "bg-white/5 border-yellow-400/40 text-yellow-400/90 hover:bg-yellow-400/10 hover:border-yellow-400 hover:text-yellow-400"
    }`;

  const leftLinks = (
    <>
      <NavLink to="/" className={linkClass} end>Home</NavLink>
      <NavLink to="/shop" className={linkClass}>Shop</NavLink>
      <NavLink to="/builder" className={linkClass}>Builder</NavLink>
    </>
  );

  const rightLinks = (
    <>
      <NavLink to="/process" className={linkClass}>Process</NavLink>
      <NavLink to="/tools" className={linkClass}>Tools</NavLink>
      <NavLink to="/contact" className={linkClass}>Contact</NavLink>
      <NavLink to="/member" className={memberLinkClass}>Account</NavLink>
    </>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="fixed inset-x-0 top-0 z-30">
        <SpecialsBanner />

        <header
          className={`transition-colors duration-300 ${
            expanded
              ? "bg-transparent"
              : "border-b border-white/10 bg-zinc-950/85 backdrop-blur"
          }`}
        >
          <div className="relative flex flex-col items-center px-4 py-3 lg:hidden">
            <img
              src="/logo-gold.png"
              alt="Dyla Archery"
              className={`object-contain transition-all duration-300 ${
                expanded ? "h-28 w-28" : "h-14 w-14"
              }`}
            />
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="absolute right-3 top-3 z-20 rounded-lg p-2 text-yellow-400/80 hover:bg-white/5 hover:text-yellow-400"
            >
              {menuOpen ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              )}
            </button>
            {menuOpen && (
              <nav className="mt-4 flex w-full flex-col items-center gap-2 border-t border-white/10 bg-zinc-950/90 pt-4">
                {leftLinks}
                {rightLinks}
              </nav>
            )}
          </div>

          <div className="hidden flex-col items-center lg:flex">
            <div
              className={`flex justify-center transition-all duration-300 ${
                expanded ? "pb-3 pt-6" : "pb-1 pt-2"
              }`}
            >
              <img
                src="/logo-gold.png"
                alt="Dyla Archery"
                className={`object-contain transition-all duration-300 ${
                  expanded ? "h-44 w-44" : "h-12 w-12"
                }`}
              />
            </div>

            <div
              className={`w-full border-y border-white/10 backdrop-blur-sm transition-all duration-300 ${
                expanded ? "bg-black/30 py-3" : "bg-zinc-950/40 py-2"
              }`}
            >
              <nav className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 xl:gap-3">
                {leftLinks}
                {rightLinks}
              </nav>
            </div>
          </div>
        </header>
      </div>

      <main className={`mx-auto px-0 py-0 ${isHome ? "" : "pt-28 lg:pt-36"}`}>
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
