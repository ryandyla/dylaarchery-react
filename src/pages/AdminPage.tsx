import React from "react";

type TypeKey = "shafts" | "nocks" | "vanes" | "wraps" | "inserts" | "points";

type Row = Record<string, any> & {
  id: number;
  active?: number;
  brand?: string;
  model?: string;
  name?: string;
  system?: string;
  price_per_shaft?: number;
  price_per_arrow?: number;
  price?: number;
  image_url?: string | null;
};

type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "checkbox";
  placeholder?: string;
  step?: string;
};

const FIELDS: Record<TypeKey, FieldDef[]> = {
  shafts: [
    { key: "brand",         label: "Brand",          type: "text" },
    { key: "model",         label: "Model",          type: "text" },
    { key: "spine",         label: "Spine",          type: "number", placeholder: "300" },
    { key: "gpi",           label: "GPI",            type: "number", step: "0.1", placeholder: "8.5" },
    { key: "inner_diameter",label: "Inner Dia (in)", type: "number", step: "0.001", placeholder: "0.204" },
    { key: "outer_diameter",label: "Outer Dia (in)", type: "number", step: "0.001", placeholder: "0.246" },
    { key: "max_length",    label: "Max Length (in)",type: "number", step: "0.25", placeholder: "32" },
    { key: "straightness",  label: "Straightness",   type: "text",   placeholder: ".001" },
    { key: "system",        label: "System",         type: "text",   placeholder: ".204 / .166 / 5mm" },
    { key: "price_per_shaft",label: "Price / shaft", type: "number", step: "0.01", placeholder: "0.00" },
    { key: "active",        label: "Active",         type: "checkbox" },
  ],
  vanes: [
    { key: "brand",          label: "Brand",          type: "text" },
    { key: "model",          label: "Model",          type: "text" },
    { key: "length",         label: "Length (in)",    type: "number", step: "0.01" },
    { key: "height",         label: "Height (in)",    type: "number", step: "0.01" },
    { key: "weight_grains",  label: "Weight (gr)",    type: "number", step: "0.1" },
    { key: "profile",        label: "Profile",        type: "text" },
    { key: "compatible_micro",label: "Micro OK",      type: "checkbox" },
    { key: "price_per_arrow",label: "Price / arrow",  type: "number", step: "0.01" },
    { key: "active",         label: "Active",         type: "checkbox" },
  ],
  nocks: [
    { key: "brand",          label: "Brand",          type: "text" },
    { key: "model",          label: "Model",          type: "text" },
    { key: "system",         label: "System",         type: "text", placeholder: ".204 / .166 / 5mm" },
    { key: "style",          label: "Style",          type: "text", placeholder: "standard / pin / large" },
    { key: "weight_grains",  label: "Weight (gr)",    type: "number", step: "0.1" },
    { key: "price_per_arrow",label: "Price / arrow",  type: "number", step: "0.01" },
    { key: "active",         label: "Active",         type: "checkbox" },
  ],
  wraps: [
    { key: "name",               label: "Name",           type: "text" },
    { key: "length",             label: "Length (in)",    type: "number", step: "0.25" },
    { key: "min_outer_diameter", label: "Min OD (in)",    type: "number", step: "0.001" },
    { key: "max_outer_diameter", label: "Max OD (in)",    type: "number", step: "0.001" },
    { key: "weight_grains",      label: "Weight (gr)",    type: "number", step: "0.1" },
    { key: "price_per_arrow",    label: "Price / arrow",  type: "number", step: "0.01" },
    { key: "active",             label: "Active",         type: "checkbox" },
  ],
  inserts: [
    { key: "brand",                label: "Brand",           type: "text" },
    { key: "model",                label: "Model",           type: "text" },
    { key: "system",               label: "System",          type: "text", placeholder: ".204 / HIT / half-out" },
    { key: "type",                 label: "Type",            type: "text", placeholder: "standard / hit / outsert" },
    { key: "weight_grains",        label: "Weight (gr)",     type: "number", step: "0.1" },
    { key: "price_per_arrow",      label: "Price / arrow",   type: "number", step: "0.01" },
    { key: "requires_collar",      label: "Needs collar",    type: "checkbox" },
    { key: "collar_weight_grains", label: "Collar wt (gr)",  type: "number", step: "0.1" },
    { key: "collar_price_per_arrow",label: "Collar price",   type: "number", step: "0.01" },
    { key: "active",               label: "Active",          type: "checkbox" },
  ],
  points: [
    { key: "brand",         label: "Brand",          type: "text" },
    { key: "model",         label: "Model",          type: "text" },
    { key: "type",          label: "Type",           type: "text", placeholder: "field / broadhead" },
    { key: "weight_grains", label: "Weight (gr)",    type: "number", step: "0.1" },
    { key: "thread",        label: "Thread",         type: "text", placeholder: "8-32" },
    { key: "price",         label: "Price",          type: "number", step: "0.01" },
    { key: "active",        label: "Active",         type: "checkbox" },
  ],
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
  if (r.name) return r.name;
  if (r.brand && r.model) return `${r.brand} ${r.model}`;
  if (r.model) return r.model;
  return String(r.id);
}

// ── Inline editor form ──────────────────────────────────────────────────────

function InlineEditor({
  type,
  draft,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  type: TypeKey;
  draft: Record<string, any>;
  saving: boolean;
  onChange: (key: string, val: any) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const fields = FIELDS[type];

  return (
    <div className="border-t border-yellow-400/20 bg-white/[0.03] px-4 py-4">
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
        {fields.map((f) => (
          <label key={f.key} className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-white/50">{f.label}</span>
            {f.type === "checkbox" ? (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!draft[f.key]}
                  onChange={(e) => onChange(f.key, e.target.checked ? 1 : 0)}
                  className="h-4 w-4 accent-yellow-400"
                />
                <span className="text-xs text-white/60">{draft[f.key] ? "Yes" : "No"}</span>
              </div>
            ) : (
              <input
                type={f.type}
                step={f.step}
                placeholder={f.placeholder}
                value={draft[f.key] ?? ""}
                onChange={(e) =>
                  onChange(
                    f.key,
                    f.type === "number"
                      ? e.target.value === "" ? null : Number(e.target.value)
                      : e.target.value
                  )
                }
                className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-sm text-white outline-none focus:border-yellow-400/50"
              />
            )}
          </label>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-yellow-500 px-4 py-1.5 text-sm font-extrabold text-black hover:bg-yellow-400 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-bold text-white/70 hover:bg-white/10"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [type, setType] = React.useState<TypeKey>("shafts");
  const [items, setItems] = React.useState<Row[]>([]);
  const [q, setQ] = React.useState("");
  const [err, setErr] = React.useState("");

  const [editingId, setEditingId] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState<Record<string, any>>({});
  const [saving, setSaving] = React.useState(false);

  async function load() {
    setErr("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const data = await api<{ ok: boolean; items: Row[] }>(`/api/admin/${type}?${params.toString()}`);
      setItems(data.items || []);
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  React.useEffect(() => {
    setEditingId(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  function startEdit(r: Row) {
    setEditingId(r.id);
    setDraft({ ...r });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({});
  }

  async function saveEdit() {
    if (editingId == null) return;
    setSaving(true);
    setErr("");
    try {
      // Only send fields defined for this type (safe whitelist)
      const allowed = new Set(FIELDS[type].map((f) => f.key));
      const patch: Record<string, any> = {};
      for (const [k, v] of Object.entries(draft)) {
        if (allowed.has(k)) patch[k] = v;
      }
      await api(`/api/admin/${type}/${editingId}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setEditingId(null);
      setDraft({});
      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function createQuick() {
    setErr("");
    try {
      if (type === "wraps") {
        const name = prompt("Wrap name?");
        if (!name) return;
        await api(`/api/admin/${type}`, {
          method: "POST",
          body: JSON.stringify({
            name, length: 7, min_outer_diameter: 0.24, max_outer_diameter: 0.30,
            price_per_arrow: 0, weight_grains: 0, active: 1,
          }),
        });
      } else {
        const brand = prompt("Brand?") || "";
        const model = prompt("Model?") || "";
        if (!brand || !model) return;
        const body: any = { brand, model, active: 1 };
        if (type === "shafts")  Object.assign(body, { spine: 300, gpi: 8.5, inner_diameter: 0.204, outer_diameter: 0.246, max_length: 32, price_per_shaft: 0, system: ".204" });
        if (type === "vanes")   Object.assign(body, { length: 2.0, height: 0.5, weight_grains: 6.0, compatible_micro: 0, price_per_arrow: 0 });
        if (type === "nocks")   Object.assign(body, { system: ".204", style: "standard", price_per_arrow: 0, weight_grains: 0 });
        if (type === "inserts") Object.assign(body, { system: ".204", type: "standard", weight_grains: 50, price_per_arrow: 0, requires_collar: 0 });
        if (type === "points")  Object.assign(body, { type: "field", weight_grains: 100, price: 0 });
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
      if (editingId === r.id) cancelEdit();
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
      await uploadImage(`/api/admin/${type}/${r.id}/images`, file);
      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-white">
      {/* Header */}
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

      {/* Search */}
      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search brand / model / system…"
          className="w-80 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none"
        />
        <button
          onClick={load}
          className="rounded-xl border border-white/15 bg-black/25 px-4 py-2 text-sm font-extrabold text-white/90 hover:bg-black/35"
        >
          Search
        </button>
      </div>

      {err && (
        <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-[1.4fr_.9fr_.7fr_.5fr_.8fr_.7fr] gap-2 bg-white/5 px-3 py-2 text-xs font-bold text-white/70">
          <div>Name / Model</div>
          <div>Brand</div>
          <div>System</div>
          <div>Active</div>
          <div>Price</div>
          <div>Actions</div>
        </div>

        {items.map((r) => (
          <div key={r.id} className="border-t border-white/10">
            {/* Row summary */}
            <div className="grid grid-cols-[1.4fr_.9fr_.7fr_.5fr_.8fr_.7fr] gap-2 px-3 py-3 text-sm">
              <div className="font-semibold">
                {titleLabel(r)}
                {r.image_url && (
                  <a
                    href={r.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs text-yellow-300/90 underline underline-offset-2 hover:text-yellow-200"
                  >
                    img
                  </a>
                )}
              </div>
              <div className="text-white/80">{r.brand || "—"}</div>
              <div className="text-white/70">{r.system || "—"}</div>
              <div>
                <button
                  onClick={() => toggleActive(r)}
                  className={`rounded-lg border px-2 py-1 text-xs font-bold ${
                    r.active
                      ? "border-green-500/20 bg-green-500/10 text-green-300"
                      : "border-white/10 bg-white/5 text-white/40"
                  }`}
                >
                  {r.active ? "On" : "Off"}
                </button>
              </div>
              <div className="text-white/70">{priceLabel(r)}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => (editingId === r.id ? cancelEdit() : startEdit(r))}
                  className={`rounded-lg border px-2 py-1 text-xs font-bold ${
                    editingId === r.id
                      ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
                      : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                  }`}
                >
                  {editingId === r.id ? "Editing…" : "Edit"}
                </button>
                <button
                  onClick={() => uploadForRow(r)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-white/70 hover:bg-white/10"
                >
                  Image
                </button>
                <button
                  onClick={() => delRow(r)}
                  className="rounded-lg border border-red-500/15 bg-red-500/5 px-2 py-1 text-xs font-bold text-red-400/80 hover:bg-red-500/10"
                >
                  Del
                </button>
              </div>
            </div>

            {/* Inline editor — expands below the row */}
            {editingId === r.id && (
              <InlineEditor
                type={type}
                draft={draft}
                saving={saving}
                onChange={(key, val) => setDraft((d) => ({ ...d, [key]: val }))}
                onSave={saveEdit}
                onCancel={cancelEdit}
              />
            )}
          </div>
        ))}

        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-white/40">No items found.</div>
        )}
      </div>

      <p className="mt-4 text-xs text-white/40">
        Protected by Cloudflare Access · JWT verified server-side on every request
      </p>
    </div>
  );
}
