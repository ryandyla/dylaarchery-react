import { useCallback, useEffect, useState } from "react";

const ORDER_STATUSES = ["draft", "paid", "processing", "built", "shipped", "delivered", "cancelled"];

const STATUS_NEXT: Record<string, string | null> = {
  draft: null,      // use Mark as Paid button instead
  paid: "processing",
  processing: "built",
  built: "shipped",
  shipped: "delivered",
  delivered: null,
  cancelled: null,
};

const STATUS_COLOR: Record<string, string> = {
  draft:      "border-white/10 bg-white/5 text-white/40",
  paid:       "border-blue-500/20 bg-blue-500/10 text-blue-300",
  processing: "border-yellow-500/20 bg-yellow-500/10 text-yellow-300",
  built:      "border-orange-500/20 bg-orange-500/10 text-orange-300",
  shipped:    "border-purple-500/20 bg-purple-500/10 text-purple-300",
  delivered:  "border-green-500/20 bg-green-500/10 text-green-300",
  cancelled:  "border-red-500/20 bg-red-500/10 text-red-300",
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type Order = {
  id: number;
  status: string;
  subtotal: number;
  total: number;
  discount_amount: number;
  coupon_code: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  paid_at: string | null;
  notes: string | null;
  stripe_session_id: string | null;
  customer_email: string;
  customer_name: string | null;
  // detail-only fields
  build_id?: number;
  cut_length?: number | null;
  quantity?: number;
  fletch_count?: number;
  price_per_arrow?: number;
  shaft_brand?: string; shaft_model?: string; shaft_spine?: number;
  wrap_name?: string | null;
  vane_brand?: string | null; vane_model?: string | null;
  insert_brand?: string | null; insert_model?: string | null;
  point_brand?: string | null; point_model?: string | null; point_weight?: number | null; point_type?: string | null;
  nock_brand?: string | null; nock_model?: string | null;
};

type Message = { id: number; subject: string; body: string; sent_at: string };
type HistoryEntry = { status: string; changed_at: string; changed_by: string };

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLOR[status] || "border-white/10 bg-white/5 text-white/50";
  return (
    <span className={`rounded-md border px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

function OrderDetail({
  orderId,
  onUpdated,
}: {
  orderId: number;
  onUpdated: () => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Editing state
  const [notes, setNotes] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [savingShipping, setSavingShipping] = useState(false);

  // Message compose
  const [msgSubject, setMsgSubject] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgErr, setMsgErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const d = await api<{ ok: boolean; order: Order; messages: Message[]; history: HistoryEntry[] }>(
        `/api/admin/orders/${orderId}`
      );
      setOrder(d.order);
      setMessages(d.messages);
      setHistory(d.history);
      setNotes(d.order.notes || "");
      setCarrier(d.order.shipping_carrier || "");
      setTracking(d.order.tracking_number || "");
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  async function advanceStatus() {
    if (!order) return;
    const next = STATUS_NEXT[order.status];
    if (!next) return;

    // Require shipping info before marking shipped
    if (next === "shipped" && (!carrier.trim() || !tracking.trim())) {
      setErr("Enter carrier and tracking number before marking as shipped.");
      return;
    }

    try {
      setErr("");
      const patch: any = { status: next };
      if (next === "shipped") {
        patch.shipping_carrier = carrier.trim();
        patch.tracking_number = tracking.trim();
        patch.shipped_at = new Date().toISOString();
      }
      await api(`/api/admin/orders/${order.id}`, { method: "PATCH", body: JSON.stringify(patch) });
      await load();
      onUpdated();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function markPaid() {
    if (!order || order.status !== "draft") return;
    if (!confirm("Mark this order as paid (cash / Venmo)?")) return;
    try {
      await api(`/api/admin/orders/${order.id}/mark-paid`, { method: "POST" });
      await load();
      onUpdated();
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  async function saveShipping() {
    if (!order) return;
    setSavingShipping(true);
    try {
      await api(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({ shipping_carrier: carrier, tracking_number: tracking, notes }),
      });
      await load();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setSavingShipping(false);
    }
  }

  async function sendMessage() {
    if (!order || !msgSubject.trim() || !msgBody.trim()) return;
    setSendingMsg(true);
    setMsgErr("");
    try {
      await api(`/api/admin/orders/${order.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ subject: msgSubject.trim(), body: msgBody.trim() }),
      });
      setMsgSubject("");
      setMsgBody("");
      await load();
    } catch (e: any) {
      setMsgErr(e?.message || String(e));
    } finally {
      setSendingMsg(false);
    }
  }

  if (loading) return <div className="px-4 py-6 text-sm text-white/40">Loading…</div>;
  if (!order) return <div className="px-4 py-6 text-sm text-red-400">{err || "Not found"}</div>;

  const buildShaft = [order.shaft_brand, order.shaft_model, order.shaft_spine].filter(Boolean).join(" ");
  const cutDisplay = order.cut_length && order.cut_length > 0 ? `${order.cut_length}"` : "Uncut";
  const vaneDisplay = order.vane_brand ? `${order.vane_brand} ${order.vane_model}` : "None";
  const insertDisplay = order.insert_brand ? `${order.insert_brand} ${order.insert_model}` : "None";
  const pointDisplay = order.point_brand
    ? `${order.point_brand} ${order.point_model} ${order.point_weight}gr`
    : order.point_type ? `${order.point_type} ${order.point_weight}gr` : "None";
  const nockDisplay = order.nock_brand ? `${order.nock_brand} ${order.nock_model}` : "None";

  const nextStatus = STATUS_NEXT[order.status];

  return (
    <div className="border-t border-white/10 bg-white/[0.02]">
      {err && (
        <div className="mx-4 mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {err}
        </div>
      )}

      <div className="grid gap-6 p-4 md:grid-cols-2">
        {/* Left: Build summary + status */}
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-bold text-white/40 uppercase tracking-wider">Build Summary</div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-3">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Shaft", buildShaft],
                    ["Cut", cutDisplay],
                    ["Wrap", order.wrap_name || "None"],
                    ["Vanes", vaneDisplay],
                    ["Insert", insertDisplay],
                    ["Point", pointDisplay],
                    ["Nock", nockDisplay],
                    ["Qty", `${order.quantity} arrows`],
                    ["$/arrow", `$${order.price_per_arrow?.toFixed(2) || "—"}`],
                  ].map(([label, val]) => (
                    <tr key={label} className="border-b border-white/5 last:border-0">
                      <td className="py-1 pr-3 font-mono text-[11px] uppercase text-white/40">{label}</td>
                      <td className="py-1 text-white/80">{val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex justify-between border-t border-white/10 pt-3 text-sm">
                <span className="text-white/50">Total</span>
                <span className="font-bold text-white">
                  ${order.total.toFixed(2)}
                  {order.discount_amount > 0 && (
                    <span className="ml-2 text-xs text-yellow-400">
                      (-${order.discount_amount.toFixed(2)} {order.coupon_code})
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Status controls */}
          <div>
            <div className="mb-2 text-xs font-bold text-white/40 uppercase tracking-wider">Status</div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={order.status} />
              {order.status === "draft" && (
                <button
                  onClick={markPaid}
                  className="rounded-lg bg-yellow-500 px-3 py-1.5 text-xs font-extrabold text-black hover:bg-yellow-400"
                >
                  Mark as Paid (cash/Venmo)
                </button>
              )}
              {nextStatus && (
                <button
                  onClick={advanceStatus}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/80 hover:bg-white/10"
                >
                  → {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                </button>
              )}
            </div>
            {/* Status history */}
            {history.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {history.map((h, i) => (
                  <div key={i} className="flex gap-2 text-xs text-white/30">
                    <span className="font-mono">{h.changed_at.slice(0, 16).replace("T", " ")}</span>
                    <span className="font-bold text-white/50">{h.status}</span>
                    <span>by {h.changed_by}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shipping */}
          <div>
            <div className="mb-2 text-xs font-bold text-white/40 uppercase tracking-wider">Shipping</div>
            <div className="space-y-2">
              <input
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400/40"
                placeholder="Carrier (e.g. UPS, USPS, FedEx)"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400/40"
                placeholder="Tracking number"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
              />
              {order.shipped_at && (
                <div className="text-xs text-white/40">
                  Shipped: {order.shipped_at.slice(0, 10)}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="mb-2 text-xs font-bold text-white/40 uppercase tracking-wider">Internal Notes</div>
            <textarea
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40"
              rows={3}
              placeholder="Notes visible only to you…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            onClick={saveShipping}
            disabled={savingShipping}
            className="rounded-lg bg-white/10 px-4 py-1.5 text-xs font-bold text-white/80 hover:bg-white/15 disabled:opacity-50"
          >
            {savingShipping ? "Saving…" : "Save Shipping & Notes"}
          </button>
        </div>

        {/* Right: Messages */}
        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-bold text-white/40 uppercase tracking-wider">
              Message Customer
            </div>
            <div className="space-y-2">
              <input
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-sm text-white outline-none focus:border-yellow-400/40"
                placeholder="Subject (e.g. Your arrows are ready)"
                value={msgSubject}
                onChange={(e) => setMsgSubject(e.target.value)}
              />
              <textarea
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40"
                rows={5}
                placeholder={`Hey ${order.customer_name?.split(" ")[0] || "there"},\n\nYour arrows are built and shipping tomorrow via UPS. Tracking: XXXXXX`}
                value={msgBody}
                onChange={(e) => setMsgBody(e.target.value)}
              />
              {msgErr && <div className="text-xs text-red-400">{msgErr}</div>}
              <button
                onClick={sendMessage}
                disabled={sendingMsg || !msgSubject.trim() || !msgBody.trim()}
                className="rounded-lg bg-yellow-500 px-4 py-1.5 text-xs font-extrabold text-black hover:bg-yellow-400 disabled:opacity-40"
              >
                {sendingMsg ? "Sending…" : "Send Email to Customer"}
              </button>
            </div>
          </div>

          {/* Message history */}
          {messages.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-bold text-white/40 uppercase tracking-wider">Sent Messages</div>
              <div className="space-y-3">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white/70">{m.subject}</span>
                      <span className="text-xs text-white/30">{m.sent_at.slice(0, 16).replace("T", " ")}</span>
                    </div>
                    <p className="whitespace-pre-wrap text-xs text-white/50">{m.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const d = await api<{ ok: boolean; orders: Order[] }>(`/api/admin/orders?${params}`);
      setOrders(d.orders || []);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-white/40">Filter:</span>
        {["all", ...ORDER_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-lg border px-3 py-1 text-xs font-bold transition-colors ${
              statusFilter === s
                ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-300"
                : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {s === "all" ? "All" : s}
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

      {!loading && orders.length === 0 && (
        <div className="py-8 text-center text-sm text-white/30">No orders found.</div>
      )}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {/* Header */}
        {orders.length > 0 && (
          <div className="grid grid-cols-[2rem_2fr_2fr_1fr_1.2fr_1.2fr] gap-2 bg-white/5 px-3 py-2 text-xs font-bold text-white/50">
            <div>#</div>
            <div>Customer</div>
            <div>Email</div>
            <div>Status</div>
            <div>Total</div>
            <div>Paid</div>
          </div>
        )}

        {orders.map((o) => (
          <div key={o.id} className="border-t border-white/10">
            <button
              onClick={() => setOpenId(openId === o.id ? null : o.id)}
              className="grid w-full grid-cols-[2rem_2fr_2fr_1fr_1.2fr_1.2fr] gap-2 px-3 py-3 text-left text-sm hover:bg-white/[0.03] transition-colors"
            >
              <div className="font-mono text-xs text-white/40">{o.id}</div>
              <div className="font-semibold text-white/90">{o.customer_name || "—"}</div>
              <div className="text-white/60 truncate">{o.customer_email}</div>
              <div><StatusBadge status={o.status} /></div>
              <div className="font-semibold text-white/80">
                ${o.total.toFixed(2)}
                {o.discount_amount > 0 && (
                  <span className="ml-1 text-xs text-yellow-400">-${o.discount_amount.toFixed(0)}</span>
                )}
              </div>
              <div className="text-xs text-white/40">{o.paid_at?.slice(0, 10) || "—"}</div>
            </button>

            {openId === o.id && (
              <OrderDetail orderId={o.id} onUpdated={load} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
