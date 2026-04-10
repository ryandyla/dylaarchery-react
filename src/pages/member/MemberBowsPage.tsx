import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import type { MemberOutletContext, Bow } from "./MemberShell";

const BOW_TYPES = ["compound", "recurve", "traditional", "crossbow"];
const INTERESTS = [
  { key: "hunting", label: "🦌 Hunting" },
  { key: "target", label: "🎯 Target" },
  { key: "3d", label: "🌲 3D" },
  { key: "tac", label: "⚡ TAC" },
];

type BowForm = {
  nickname: string;
  brand: string;
  model: string;
  bow_type: string;
  ibo_speed: string;
  draw_length: string;
  draw_weight: string;
};

const EMPTY_FORM: BowForm = {
  nickname: "", brand: "", model: "", bow_type: "compound",
  ibo_speed: "", draw_length: "", draw_weight: "",
};

export default function MemberBowsPage() {
  const { member, bows, refresh } = useOutletContext<MemberOutletContext>();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BowForm>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [interests, setInterests] = useState<string[]>(member.interests ?? []);
  const [interestsBusy, setInterestsBusy] = useState(false);

  function field(k: keyof BowForm) {
    return {
      value: form[k],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [k]: e.target.value })),
    };
  }

  function startAdd() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
    setErr("");
  }

  function startEdit(bow: Bow) {
    setForm({
      nickname: bow.nickname ?? "",
      brand: bow.brand ?? "",
      model: bow.model ?? "",
      bow_type: bow.bow_type ?? "compound",
      ibo_speed: bow.ibo_speed != null ? String(bow.ibo_speed) : "",
      draw_length: bow.draw_length != null ? String(bow.draw_length) : "",
      draw_weight: bow.draw_weight != null ? String(bow.draw_weight) : "",
    });
    setEditingId(bow.id);
    setShowForm(true);
    setErr("");
  }

  async function saveBow(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = {
        nickname: form.nickname.trim() || null,
        brand: form.brand.trim() || null,
        model: form.model.trim() || null,
        bow_type: form.bow_type || null,
        ibo_speed: form.ibo_speed ? Number(form.ibo_speed) : null,
        draw_length: form.draw_length ? Number(form.draw_length) : null,
        draw_weight: form.draw_weight ? Number(form.draw_weight) : null,
      };
      const url = editingId ? `/api/member/bows/${editingId}` : "/api/member/bows";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: any = await res.json();
      if (!data.ok) throw new Error(data.error || "Save failed");
      setShowForm(false);
      setEditingId(null);
      refresh();
    } catch (e: any) {
      setErr(e?.message || "Failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteBow(id: number) {
    if (!confirm("Delete this bow?")) return;
    await fetch(`/api/member/bows/${id}`, { method: "DELETE" });
    refresh();
  }

  async function saveInterests(next: string[]) {
    setInterests(next);
    setInterestsBusy(true);
    try {
      await fetch("/api/member/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ interests: next }),
      });
      refresh();
    } finally {
      setInterestsBusy(false);
    }
  }

  function toggleInterest(key: string) {
    const next = interests.includes(key)
      ? interests.filter((i) => i !== key)
      : [...interests, key];
    saveInterests(next);
  }

  const inputCls = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-yellow-400/40";

  return (
    <div>
      {/* Interests */}
      <div className="mb-8 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="mb-3 text-xs font-bold tracking-[2px] text-white/40">SHOOTING INTERESTS</div>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map(({ key, label }) => {
            const active = interests.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleInterest(key)}
                disabled={interestsBusy}
                className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:opacity-50 ${
                  active
                    ? "bg-yellow-500/20 border border-yellow-400/40 text-yellow-300"
                    : "border border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bows header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs font-bold tracking-[2px] text-white/40">MY BOWS</div>
        {!showForm && (
          <button
            onClick={startAdd}
            className="rounded-xl bg-yellow-500 px-4 py-1.5 text-xs font-extrabold text-black hover:bg-yellow-400 transition-colors"
          >
            + Add Bow
          </button>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <form onSubmit={saveBow} className="mb-6 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.03] p-5">
          <div className="mb-4 font-bold text-white">{editingId ? "Edit Bow" : "Add a Bow"}</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/35">NICKNAME</label>
              <input className={inputCls} placeholder='e.g. "Hunting Rig"' {...field("nickname")} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/35">TYPE</label>
              <select className={inputCls} {...field("bow_type")}>
                {BOW_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/35">BRAND</label>
              <input className={inputCls} placeholder="Hoyt, Mathews, PSE…" {...field("brand")} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/35">MODEL</label>
              <input className={inputCls} placeholder="Carbon RX-8, V3X…" {...field("model")} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/35">DRAW WEIGHT (lbs)</label>
              <input className={inputCls} type="number" step="0.5" min="20" max="100" placeholder="70" {...field("draw_weight")} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/35">DRAW LENGTH (inches)</label>
              <input className={inputCls} type="number" step="0.5" min="20" max="35" placeholder="29.5" {...field("draw_length")} />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/35">IBO SPEED (fps)</label>
              <input className={inputCls} type="number" step="1" min="200" max="400" placeholder="340" {...field("ibo_speed")} />
            </div>
          </div>
          {err && <div className="mt-3 text-xs text-red-400">{err}</div>}
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-yellow-500 px-5 py-2 text-sm font-extrabold text-black hover:bg-yellow-400 disabled:opacity-40 transition-colors"
            >
              {busy ? "Saving…" : editingId ? "Save Changes" : "Add Bow"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setEditingId(null); }}
              className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Bow list */}
      {bows.length === 0 && !showForm ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
          No bows saved yet. Add your first rig above.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {bows.map((bow) => (
            <BowCard key={bow.id} bow={bow} onEdit={() => startEdit(bow)} onDelete={() => deleteBow(bow.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function BowCard({ bow, onEdit, onDelete }: { bow: Bow; onEdit: () => void; onDelete: () => void }) {
  const title = bow.nickname || `${bow.brand ?? ""} ${bow.model ?? ""}`.trim() || "Unnamed Bow";
  const specs = [
    bow.draw_weight ? `${bow.draw_weight} lbs` : null,
    bow.draw_length ? `${bow.draw_length}"` : null,
    bow.ibo_speed ? `${bow.ibo_speed} fps IBO` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-bold text-white">{title}</div>
          {(bow.brand || bow.model) && (
            <div className="text-xs text-white/40 mt-0.5">{bow.brand} {bow.model}</div>
          )}
        </div>
        {bow.bow_type && (
          <span className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-white/40 uppercase tracking-wide">
            {bow.bow_type}
          </span>
        )}
      </div>

      {specs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {specs.map((s) => (
            <span key={s} className="rounded-lg bg-yellow-400/10 px-2 py-0.5 text-xs font-mono font-bold text-yellow-400/80">
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg border border-red-500/15 bg-red-500/5 px-3 py-1 text-xs font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
