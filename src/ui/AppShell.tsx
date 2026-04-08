import { Outlet, NavLink } from "react-router-dom";
import { useState } from "react";

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
          </nav>
        </div>
      </header>

      <main className="mx-auto px-0 py-0">
        <Outlet />
      </main>

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
