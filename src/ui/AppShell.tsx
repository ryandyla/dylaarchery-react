import { Outlet, NavLink } from "react-router-dom";

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
            <img src="/logo.png" alt="Dyla Archery" className="h-10 w-auto" />
            <div className="leading-tight">
              <div className="font-semibold">Dyla Archery</div>
              <div className="text-xs text-white/60">Precision-built custom arrows</div>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <NavLink to="/" className={linkClass} end>Home</NavLink>
            <NavLink to="/builder" className={linkClass}>Arrow Builder</NavLink>
            <NavLink to="/contact" className={linkClass}>Contact</NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-0">
        <Outlet />
      </main>

      <footer className="border-t border-white/10 py-8">
        <div className="mx-auto max-w-6xl px-4 text-sm text-white/60">
          © {new Date().getFullYear()} Dyla Archery • Built for hunters & precision shooters
        </div>
      </footer>
    </div>
  );
}
