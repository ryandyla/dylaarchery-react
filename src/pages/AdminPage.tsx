import React from "react";

type TypeKey = "shafts" | "nocks" | "vanes" | "wraps" | "inserts" | "points";

type Row = {
  id: number;
  active?: number;

  // common-ish fields across tables:
  brand?: string;
  model?: string;
  name?: string;
  system?: string;

  // pricing differs by table; we’ll display the first one we find
  price_per_shaft?: number;
  price_per_arrow?: number;
  price?: number;

  image_url?: string | null;
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function uploadImage(path: string, file: File): Promise<any> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(path, { method: "POST", body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function pickFile(accept = "image/*") {
  return new Promise<File | null>((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

function priceLabel(r: Row) {
  if (typeof r.price_per_shaft === "number") return `$${r.price_per_shaft.toFixed(2)} / shaft`;
  if (typeof r.price_per_arrow === "number") return `$${r.price_per_arrow.toFixed(2)} / arrow`;
  if (typeof r.price === "number") return `$${r.price.toFixed(2)}`;
  return "—";
}

function titleLabel(r: Row) {
  // wraps uses name; most others are brand+model
  if (r.name) return r.name;
  if (r.model) return r.model;
  return String(r.id);
}

export default function AdminPage() {
  const [type, setType] = React.useState<TypeKey>("shafts");
  const [items, setItems] = React.useState<Row[]>([]);
  const [q, setQ] = React.useState("");
  const [err, setErr] = React.useState("");

  async function load() {
    setErr("");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    const data = await api<{ ok: boolean; items: Row[] }>(`/api/admin/${type}?${params.toString()}`);
    setItems(data.items || []);
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  async function createQuick() {
    setErr("");
    try {
      if (type === "wraps") {
        const name = prompt("Wrap name?");
        if (!name) return;
        await api(`/api/admin/${type}`, {
          method: "POST",
          body: JSON.stringify({
            name,
            length: 7,
            min_outer_diameter: 0.24,
            max_outer_diameter: 0.30,
            price_per_arrow: 0,
            weight_grains: 0,
            active: 1,
          }),
        });
      } else {
        const brand = prompt("Brand?") || "";
        const model = prompt("Model?") || "";
        if (!brand || !model) return;

        // keep it minimal; you can expand per-table later
        const body: any = { brand, model, active: 1 };

        // give required defaults for tables with NOT NULLs if you want “quick create”
        if (type === "shafts") {
          body.spine = 300;
          body.gpi = 8.5;
          body.inner_diameter = 0.204;
          body.outer_diameter = 0.265;
          body.max_length = 32;
          body.price_per_shaft = 0;
          body.system = ".204";
        }
        if (type === "vanes") {
          body.length = 2.0;
          body.height = 0.5;
          body.weight_grains = 6.0;
          body.compatible_micro = 0;
          body.price_per_arrow = 0;
        }
        if (type === "nocks") {
          body.system = ".204";
          body.style = "standard";
          body.price_per_arrow = 0;
          body.weight_grains = 0;
        }
        if (type === "inserts") {
          body.system = ".204";
          body.type = "standard";
          body.weight_grains = 50;
          body.price_per_arrow = 0;
          body.requires_collar = 0;
        }
        if (type === "points") {
          body.type = "field";
          body.weight_grains = 100;
          body.price = 0;
        }

        await api(`/api/admin/${type}`, { method: "POST", body: JSON.stringify(body) });
      }

      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function toggleActive(r: Row) {
    setErr("");
    try {
      await api(`/api/admin/${type}/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: r.active ? 0 : 1 }),
      });
      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function delRow(r: Row) {
    if (!confirm(`Delete ID ${r.id}? This will also delete its images.`)) return;
    setErr("");
    try {
      await api(`/api/admin/${type}/${r.id}`, { method: "DELETE" });
      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function uploadForRow(r: Row) {
    setErr("");
    try {
      const file = await pickFile("image/*");
      if (!file) return;

      // your router returns { ok: true, url: servedUrl, key }
      await uploadImage(`/api/admin/${type}/${r.id}/images`, file);

      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-black">Admin</h1>

          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeKey)}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
          >
            <option value="shafts">Shafts</option>
            <option value="vanes">Vanes</option>
            <option value="nocks">Nocks</option>
            <option value="wraps">Wraps</option>
            <option value="inserts">Inserts</option>
            <option value="points">Points</option>
          </select>
        </div>

        <button
          onClick={createQuick}
          className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-extrabold text-black hover:bg-yellow-400"
        >
          + New
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search (brand/model/system/type/thread...)"
          className="w-80 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={load}
          className="rounded-xl border border-white/15 bg-black/25 px-4 py-2 text-sm font-extrabold text-white/90 hover:bg-black/35"
        >
          Refresh
        </button>
      </div>

      {err ? (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-[1.2fr_.9fr_.7fr_.6fr_.9fr_.6fr] gap-2 bg-white/5 px-3 py-2 text-xs font-bold text-white/70">
          <div>Name / Model</div>
          <div>Brand</div>
          <div>System</div>
          <div>Active</div>
          <div>Price</div>
          <div>Actions</div>
        </div>

        {items.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[1.2fr_.9fr_.7fr_.6fr_.9fr_.6fr] gap-2 border-t border-white/10 px-3 py-3 text-sm"
          >
            <div className="font-semibold">
              {titleLabel(r)}
              {r.image_url ? (
                <a
                  href={r.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-xs text-yellow-300/90 hover:text-yellow-200 underline underline-offset-2"
                >
                  view
                </a>
              ) : null}
            </div>
            <div className="text-white/80">{r.brand || "—"}</div>
            <div className="text-white/70">{r.system || "—"}</div>
            <div className="text-white/70">
              <button
                onClick={() => toggleActive(r)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-white/70 hover:bg-white/10"
              >
                {r.active ? "Yes" : "No"}
              </button>
            </div>
            <div className="text-white/70">{priceLabel(r)}</div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => uploadForRow(r)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-white/70 hover:bg-white/10"
              >
                Upload image
              </button>

              <button
                onClick={() => delRow(r)}
                className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-white/70 hover:bg-white/10"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-white/60">
        Protected by Cloudflare Access. The API additionally verifies the Access JWT on every request.
      </p>
    </div>
  );
}
