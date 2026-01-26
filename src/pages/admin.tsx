import React from "react";

type Product = {
  id: string;
  category: string;
  brand: string;
  name: string;
  sku?: string | null;
  price_cents: number;
  is_active: number;
  specs_json: string;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function AdminPage() {
  const [items, setItems] = React.useState<Product[]>([]);
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("");

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (category) params.set("category", category);
    const data = await api<{ ok: boolean; items: Product[] }>(`/api/admin/products?${params.toString()}`);
    setItems(data.items || []);
  }

  React.useEffect(() => { load(); }, []);

  async function createQuick() {
    const name = prompt("Product name?");
    if (!name) return;
    const brand = prompt("Brand?") || "Unknown";
    const category = prompt("Category? (shafts/vanes/nocks/wraps/inserts/points)") || "shafts";

    await api(`/api/admin/products`, {
      method: "POST",
      body: JSON.stringify({ name, brand, category, price_cents: 0, specs: {} }),
    });
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Admin</h1>
        <button
          onClick={createQuick}
          className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-extrabold text-black hover:bg-yellow-400"
        >
          + New Product
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name / brand / sku"
          className="w-72 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
        >
          <option value="">All categories</option>
          <option value="shafts">Shafts</option>
          <option value="vanes">Vanes</option>
          <option value="nocks">Nocks</option>
          <option value="wraps">Wraps</option>
          <option value="inserts">Inserts</option>
          <option value="points">Points</option>
        </select>
        <button
          onClick={load}
          className="rounded-xl border border-white/15 bg-black/25 px-4 py-2 text-sm font-extrabold text-white/90 hover:bg-black/35"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-[1.2fr_.8fr_.8fr_.5fr_.6fr] gap-2 bg-white/5 px-3 py-2 text-xs font-bold text-white/70">
          <div>Name</div><div>Brand</div><div>Category</div><div>Active</div><div>Price</div>
        </div>

        {items.map((p) => (
          <div key={p.id} className="grid grid-cols-[1.2fr_.8fr_.8fr_.5fr_.6fr] gap-2 border-t border-white/10 px-3 py-3 text-sm">
            <div className="font-semibold">{p.name}</div>
            <div className="text-white/80">{p.brand}</div>
            <div className="text-white/70">{p.category}</div>
            <div className="text-white/70">{p.is_active ? "Yes" : "No"}</div>
            <div className="text-white/70">${(p.price_cents / 100).toFixed(2)}</div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-white/60">
        Protected by Cloudflare Access. If you can see this page, your identity is allowed — but the API still verifies your Access JWT.
      </p>
    </div>
  );
}
