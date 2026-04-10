import { useEffect, useState } from "react";

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
  created_at: string;
};

const STATUS_STYLES: Record<string, string> = {
  draft:      "border-white/10 text-white/40",
  paid:       "border-blue-400/30 text-blue-400",
  processing: "border-yellow-400/30 text-yellow-400",
  built:      "border-purple-400/30 text-purple-400",
  shipped:    "border-green-400/30 text-green-400",
  delivered:  "border-green-500/40 text-green-300",
  cancelled:  "border-red-500/20 text-red-400",
};

export default function MemberOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/member/orders")
      .then((r) => r.json())
      .then((d: any) => setOrders(d.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 text-xs font-bold tracking-[2px] text-white/40">ORDER HISTORY</div>

      {loading ? (
        <div className="text-sm text-white/30">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
          No orders yet. <a href="/builder" className="text-yellow-400/70 hover:text-yellow-400 underline">Start building →</a>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => <OrderRow key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}

function OrderRow({ order: o }: { order: Order }) {
  const date = o.paid_at || o.created_at;
  const dateStr = date ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
  const statusStyle = STATUS_STYLES[o.status] ?? STATUS_STYLES.draft;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-white">Order #{o.id}</span>
            <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${statusStyle}`}>
              {o.status}
            </span>
          </div>
          <div className="text-xs text-white/40">{dateStr}</div>
        </div>
        <div className="text-right">
          <div className="font-mono font-bold text-white">${(o.total ?? o.subtotal).toFixed(2)}</div>
          {o.discount_amount > 0 && (
            <div className="text-xs text-green-400">−${o.discount_amount.toFixed(2)} off</div>
          )}
        </div>
      </div>

      {(o.tracking_number || o.shipping_carrier) && (
        <div className="mt-3 rounded-xl border border-green-400/15 bg-green-400/5 px-3 py-2 text-xs text-green-400">
          <span className="font-bold">Tracking:</span>{" "}
          {o.shipping_carrier && <span>{o.shipping_carrier} </span>}
          {o.tracking_number}
        </div>
      )}
    </div>
  );
}
