import { useCallback, useEffect, useState } from "react";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type Lead = {
  id: number;
  email: string;
  name: string | null;
  cart_snapshot: string | null;
  coupon_sent: number;
  converted: number;
  created_at: string;
  updated_at: string;
};

function CouponModal({
  lead,
  onClose,
  onSent,
}: {
  lead: Lead;
  onClose: () => void;
  onSent: () => void;
}) {
  const [amount, setAmount] = useState(10);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setErr("");
    try {
      const d = await api<{ ok: boolean; code: string }>(
        `/api/admin/marketing/${lead.id}/coupon`,
        { method: "POST", body: JSON.stringify({ discount_amount: amount }) }
      );
      setDone(d.code);
      onSent();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111] p-6 shadow-2xl">
        <h2 className="mb-1 text-base font-extrabold text-white">Send Coupon Email</h2>
        <p className="mb-4 text-xs text-white/50">
          to <strong className="text-white/80">{lead.email}</strong>
          {lead.name ? ` (${lead.name})` : ""}
        </p>

        {done ? (
          <div className="space-y-3">
            <div className="rounded-xl border-2 border-dashed border-yellow-400 bg-yellow-400/5 p-4 text-center">
              <div className="text-xs text-white/50">Code sent:</div>
              <div className="mt-1 font-mono text-2xl font-black tracking-widest text-yellow-400">{done}</div>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-white/10 py-2 text-sm font-bold text-white/80 hover:bg-white/15"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-white/50">Discount Amount ($)</span>
              <input
                type="number"
                min={1}
                step={1}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40"
              />
            </label>

            {err && <div className="text-xs text-red-400">{err}</div>}

            <div className="flex gap-2">
              <button
                onClick={send}
                disabled={sending || amount < 1}
                className="flex-1 rounded-xl bg-yellow-500 py-2 text-sm font-extrabold text-black hover:bg-yellow-400 disabled:opacity-40"
              >
                {sending ? "Sending…" : `Send $${amount} Off Coupon`}
              </button>
              <button
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-white/60 hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddContactForm({ onAdded }: { onAdded: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function submit() {
    if (!email.trim()) return;
    setSaving(true);
    setStatus(null);
    try {
      const d = await api<{ ok: boolean; existed: boolean }>(
        "/api/admin/marketing",
        { method: "POST", body: JSON.stringify({ email: email.trim(), name: name.trim() || null }) }
      );
      setStatus(d.existed ? "Already in list — name updated." : "Added!");
      setEmail("");
      setName("");
      onAdded();
    } catch (e: any) {
      setStatus(`Error: ${e?.message || String(e)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="mb-3 text-xs font-bold text-white/50 uppercase tracking-wider">Add Contact Manually</div>
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-white/40">Email *</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="archer@example.com"
            className="w-56 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400/40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-white/40">Name (optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="First Last"
            className="w-44 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400/40"
          />
        </div>
        <button
          onClick={submit}
          disabled={saving || !email.trim()}
          className="rounded-xl bg-yellow-500 px-4 py-1.5 text-sm font-extrabold text-black hover:bg-yellow-400 disabled:opacity-40"
        >
          {saving ? "Adding…" : "Add"}
        </button>
        {status && (
          <span className={`text-xs ${status.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}

export default function MarketingSection() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filter, setFilter] = useState<"all" | "unconverted" | "converted">("unconverted");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [couponLead, setCouponLead] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (filter === "unconverted") params.set("converted", "0");
      if (filter === "converted") params.set("converted", "1");
      const d = await api<{ ok: boolean; leads: Lead[] }>(`/api/admin/marketing?${params}`);
      setLeads(d.leads || []);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  function cartLabel(snapshot: string | null): string {
    if (!snapshot) return "—";
    try {
      const c = JSON.parse(snapshot);
      return [c.shaft, c.quantity ? `${c.quantity} arrows` : null].filter(Boolean).join(" · ") || "—";
    } catch {
      return "—";
    }
  }

  return (
    <div>
      <AddContactForm onAdded={load} />
      {couponLead && (
        <CouponModal
          lead={couponLead}
          onClose={() => setCouponLead(null)}
          onSent={load}
        />
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/40">Show:</span>
        {(["unconverted", "all", "converted"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg border px-3 py-1 text-xs font-bold transition-colors ${
              filter === f
                ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {f === "unconverted" ? "Abandoned" : f === "converted" ? "Converted" : "All"}
          </button>
        ))}
        <button
          onClick={load}
          className="ml-auto rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-white/60 hover:bg-white/10"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {loading && <div className="py-8 text-center text-sm text-white/40">Loading…</div>}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {leads.length > 0 && (
          <div className="grid grid-cols-[2fr_1.5fr_2fr_1fr_1fr_1.5fr] gap-2 bg-white/5 px-3 py-2 text-xs font-bold text-white/50">
            <div>Email</div>
            <div>Name</div>
            <div>Cart</div>
            <div>Coupon</div>
            <div>Converted</div>
            <div>Actions</div>
          </div>
        )}

        {leads.map((lead) => (
          <div
            key={lead.id}
            className="grid grid-cols-[2fr_1.5fr_2fr_1fr_1fr_1.5fr] gap-2 border-t border-white/10 px-3 py-3 text-sm"
          >
            <div className="truncate text-white/80">{lead.email}</div>
            <div className="truncate text-white/60">{lead.name || "—"}</div>
            <div className="truncate text-xs text-white/50">{cartLabel(lead.cart_snapshot)}</div>
            <div>
              {lead.coupon_sent ? (
                <span className="rounded border border-yellow-500/20 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">
                  Sent
                </span>
              ) : (
                <span className="text-xs text-white/30">—</span>
              )}
            </div>
            <div>
              {lead.converted ? (
                <span className="rounded border border-green-500/20 bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold text-green-400">
                  Yes
                </span>
              ) : (
                <span className="text-xs text-white/30">No</span>
              )}
            </div>
            <div>
              {!lead.converted && (
                <button
                  onClick={() => setCouponLead(lead)}
                  className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-2.5 py-1 text-xs font-bold text-yellow-400 hover:bg-yellow-400/10"
                >
                  {lead.coupon_sent ? "Resend Coupon" : "Send Coupon"}
                </button>
              )}
            </div>
          </div>
        ))}

        {!loading && leads.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-white/30">
            {filter === "unconverted" ? "No abandoned carts." : "No leads found."}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-white/30">
        Leads are captured when visitors enter their email in the builder. Converted = placed an order.
      </p>
    </div>
  );
}
