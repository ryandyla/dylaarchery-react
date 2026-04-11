import { useEffect, useState } from "react";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type Special = {
  id: number;
  name: string;
  description: string | null;
  type: "percent_off" | "fixed_off" | "free_shipping";
  value: number | null;
  active: number;
  member_only: number;
  max_uses: number | null;
  use_count: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  percent_off: "% Off",
  fixed_off: "$ Off",
  free_shipping: "Free Shipping",
};

const TYPE_COLORS: Record<string, string> = {
  percent_off: "bg-blue-500/15 border-blue-400/30 text-blue-400",
  fixed_off: "bg-green-500/15 border-green-400/30 text-green-400",
  free_shipping: "bg-purple-500/15 border-purple-400/30 text-purple-400",
};

function formatValue(s: Special): string {
  if (s.type === "percent_off" && s.value != null) return `${s.value}% off`;
  if (s.type === "fixed_off" && s.value != null) return `$${s.value} off`;
  if (s.type === "free_shipping") return "Free shipping";
  return "—";
}

const EMPTY_FORM = {
  name: "",
  description: "",
  type: "percent_off" as Special["type"],
  value: "",
  active: false,
  member_only: true,
  max_uses: "",
  starts_at: "",
  ends_at: "",
};

export default function SpecialsSection() {
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const d = await api<{ ok: boolean; specials: Special[] }>("/api/admin/specials");
      setSpecials(d.specials);
    } catch (e: any) {
      setErr(e?.message || "Failed to load specials");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function toggle(s: Special) {
    setToggling(s.id);
    try {
      await api(`/api/admin/specials/${s.id}`, {
        method: "PATCH",
        body: JSON.stringify({ active: !s.active }),
      });
      setSpecials((prev) => prev.map((x) => x.id === s.id ? { ...x, active: s.active ? 0 : 1 } : x));
    } catch (e: any) {
      setErr(e?.message || "Failed to update");
    } finally {
      setToggling(null);
    }
  }

  async function del(s: Special) {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    setDeleting(s.id);
    try {
      await api(`/api/admin/specials/${s.id}`, { method: "DELETE" });
      setSpecials((prev) => prev.filter((x) => x.id !== s.id));
    } catch (e: any) {
      setErr(e?.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      await api("/api/admin/specials", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          type: form.type,
          value: form.value !== "" ? Number(form.value) : null,
          active: form.active,
          member_only: form.member_only,
          max_uses: form.max_uses !== "" ? Number(form.max_uses) : null,
          starts_at: form.starts_at || null,
          ends_at: form.ends_at || null,
        }),
      });
      setForm(EMPTY_FORM);
      setShowForm(false);
      await load();
    } catch (e: any) {
      setErr(e?.message || "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  const active = specials.filter((s) => s.active);
  const inactive = specials.filter((s) => !s.active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold tracking-[2px] text-white/40">SPECIALS</div>
          <div className="text-sm text-white/50 mt-1">
            {active.length} active · {specials.length} total
          </div>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-xl bg-yellow-500 px-4 py-2 text-sm font-extrabold text-black hover:bg-yellow-400 transition-colors"
        >
          {showForm ? "Cancel" : "+ New Special"}
        </button>
      </div>

      {err && <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{err}</div>}

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={create}
          className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.03] p-5 space-y-4"
        >
          <div className="text-sm font-bold text-white/60 mb-2">New Special</div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold tracking-widest text-white/30 mb-1">NAME *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Summer Sale"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-yellow-400/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest text-white/30 mb-1">TYPE *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as Special["type"] }))}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40"
              >
                <option value="percent_off">Percent Off</option>
                <option value="fixed_off">Fixed Dollar Off</option>
                <option value="free_shipping">Free Shipping</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold tracking-widest text-white/30 mb-1">DESCRIPTION</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional details shown to members"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-yellow-400/40"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {form.type !== "free_shipping" && (
              <div>
                <label className="block text-xs font-bold tracking-widest text-white/30 mb-1">
                  VALUE ({form.type === "percent_off" ? "%" : "$"})
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === "percent_off" ? "10" : "15"}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-yellow-400/40"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold tracking-widest text-white/30 mb-1">MAX USES</label>
              <input
                type="number"
                min={1}
                value={form.max_uses}
                onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                placeholder="Unlimited"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-yellow-400/40"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold tracking-widest text-white/30 mb-1">STARTS AT</label>
              <input
                type="date"
                value={form.starts_at}
                onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40"
              />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest text-white/30 mb-1">ENDS AT</label>
              <input
                type="date"
                value={form.ends_at}
                onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="accent-yellow-400 w-4 h-4"
              />
              <span className="text-sm text-white/70">Active immediately</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.member_only}
                onChange={(e) => setForm((f) => ({ ...f, member_only: e.target.checked }))}
                className="accent-yellow-400 w-4 h-4"
              />
              <span className="text-sm text-white/70">Members only</span>
            </label>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-yellow-500 px-5 py-2 text-sm font-extrabold text-black hover:bg-yellow-400 disabled:opacity-50 transition-colors"
            >
              {saving ? "Creating…" : "Create Special"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="rounded-xl border border-white/10 px-5 py-2 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <div className="text-sm text-white/30 py-6 text-center">Loading…</div>}

      {!loading && specials.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
          <div className="text-2xl mb-2">🎁</div>
          <div className="text-sm text-white/30">No specials yet. Create one to get started.</div>
        </div>
      )}

      {/* Active specials */}
      {active.length > 0 && (
        <div>
          <div className="text-xs font-bold tracking-[2px] text-green-400/60 mb-3">ACTIVE</div>
          <div className="space-y-2">
            {active.map((s) => <SpecialRow key={s.id} s={s} toggling={toggling} deleting={deleting} onToggle={toggle} onDelete={del} />)}
          </div>
        </div>
      )}

      {/* Inactive specials */}
      {inactive.length > 0 && (
        <div>
          <div className="text-xs font-bold tracking-[2px] text-white/30 mb-3">INACTIVE</div>
          <div className="space-y-2">
            {inactive.map((s) => <SpecialRow key={s.id} s={s} toggling={toggling} deleting={deleting} onToggle={toggle} onDelete={del} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function SpecialRow({
  s, toggling, deleting, onToggle, onDelete,
}: {
  s: Special;
  toggling: number | null;
  deleting: number | null;
  onToggle: (s: Special) => void;
  onDelete: (s: Special) => void;
}) {
  const isActive = !!s.active;
  const usagePercent = s.max_uses ? Math.min(100, Math.round((s.use_count / s.max_uses) * 100)) : null;

  return (
    <div className={`rounded-2xl border px-4 py-4 transition-colors ${
      isActive
        ? "border-green-400/20 bg-green-400/[0.03]"
        : "border-white/8 bg-white/[0.02]"
    }`}>
      <div className="flex flex-wrap items-start gap-3">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-bold text-white">{s.name}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wider ${TYPE_COLORS[s.type] ?? "text-white/40"}`}>
              {TYPE_LABELS[s.type] ?? s.type}
            </span>
            <span className="text-sm font-mono text-yellow-400">{formatValue(s)}</span>
            {!!s.member_only && (
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white/40">
                MEMBERS ONLY
              </span>
            )}
          </div>
          {s.description && <div className="text-xs text-white/40 mb-2">{s.description}</div>}

          <div className="flex flex-wrap gap-4 text-xs text-white/30">
            {/* Usage */}
            <div className="flex items-center gap-1.5">
              <span>{s.use_count} use{s.use_count !== 1 ? "s" : ""}</span>
              {s.max_uses && <span>/ {s.max_uses} max</span>}
              {usagePercent !== null && (
                <div className="flex items-center gap-1">
                  <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${usagePercent >= 90 ? "bg-red-400" : usagePercent >= 60 ? "bg-yellow-400" : "bg-green-400"}`}
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                  <span>{usagePercent}%</span>
                </div>
              )}
            </div>
            {/* Dates */}
            {s.starts_at && <span>from {s.starts_at}</span>}
            {s.ends_at && <span>until {s.ends_at}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle */}
          <button
            onClick={() => onToggle(s)}
            disabled={toggling === s.id}
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors border ${
              isActive
                ? "border-red-400/20 bg-red-400/10 text-red-400 hover:bg-red-400/20"
                : "border-green-400/20 bg-green-400/10 text-green-400 hover:bg-green-400/20"
            } disabled:opacity-50`}
          >
            {toggling === s.id ? "…" : isActive ? "Deactivate" : "Activate"}
          </button>
          {/* Delete */}
          <button
            onClick={() => onDelete(s)}
            disabled={deleting === s.id}
            className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-white/30 hover:text-red-400 hover:border-red-400/20 transition-colors disabled:opacity-50"
          >
            {deleting === s.id ? "…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
