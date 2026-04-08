import { useCallback, useEffect, useState } from "react";

async function api<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type Customer = {
  id: number;
  email: string;
  name: string | null;
  order_count: number;
  total_spent: number;
  last_order_id: number | null;
  last_order_status: string | null;
};

type CustomerOrder = {
  id: number;
  status: string;
  total: number;
  paid_at: string | null;
  shipping_carrier: string | null;
  tracking_number: string | null;
  quantity: number | null;
  shaft_brand: string | null;
  shaft_model: string | null;
  shaft_spine: number | null;
};

const STATUS_COLOR: Record<string, string> = {
  draft: "text-white/40",
  paid: "text-blue-300",
  processing: "text-yellow-300",
  built: "text-orange-300",
  shipped: "text-purple-300",
  delivered: "text-green-300",
  cancelled: "text-red-300",
};

function CustomerDetail({ customerId }: { customerId: number }) {
  const [data, setData] = useState<{ customer: Customer; orders: CustomerOrder[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    setLoading(true);
    api<{ ok: boolean; customer: Customer; orders: CustomerOrder[] }>(`/api/admin/customers/${customerId}`)
      .then((d) => setData(d))
      .catch((e) => setErr(e?.message || String(e)))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) return <div className="px-4 py-4 text-xs text-white/40">Loading…</div>;
  if (!data) return <div className="px-4 py-4 text-xs text-red-400">{err}</div>;

  const { orders } = data;

  return (
    <div className="border-t border-white/10 bg-white/[0.02] px-4 py-4">
      {orders.length === 0 ? (
        <div className="text-xs text-white/30">No orders yet.</div>
      ) : (
        <div className="space-y-2">
          <div className="mb-2 text-xs font-bold text-white/40 uppercase tracking-wider">Orders</div>
          {orders.map((o) => {
            const shaftLabel = [o.shaft_brand, o.shaft_model, o.shaft_spine].filter(Boolean).join(" ");
            return (
              <div key={o.id} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-white/40">#{o.id}</span>
                  <span className={`text-xs font-bold uppercase ${STATUS_COLOR[o.status] || "text-white/40"}`}>
                    {o.status}
                  </span>
                  <span className="text-sm font-semibold text-white/80">${o.total.toFixed(2)}</span>
                </div>
                {shaftLabel && (
                  <div className="mt-1 text-xs text-white/50">
                    {o.quantity ? `${o.quantity}× ` : ""}{shaftLabel}
                  </div>
                )}
                {o.tracking_number && (
                  <div className="mt-1 text-xs text-white/40">
                    {o.shipping_carrier} · {o.tracking_number}
                  </div>
                )}
                {o.paid_at && (
                  <div className="mt-0.5 text-xs text-white/30">Paid {o.paid_at.slice(0, 10)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CustomersSection() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const d = await api<{ ok: boolean; customers: Customer[] }>(`/api/admin/customers?${params}`);
      setCustomers(d.customers || []);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => { load(); }, []); // eslint-disable-line

  return (
    <div>
      <div className="mb-4 flex gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search email or name…"
          className="w-72 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none text-white"
        />
        <button
          onClick={load}
          className="rounded-xl border border-white/15 bg-black/25 px-4 py-2 text-sm font-extrabold text-white/90 hover:bg-black/35"
        >
          Search
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {loading && <div className="py-8 text-center text-sm text-white/40">Loading…</div>}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        {customers.length > 0 && (
          <div className="grid grid-cols-[2fr_2fr_1fr_1.2fr_1.5fr] gap-2 bg-white/5 px-3 py-2 text-xs font-bold text-white/50">
            <div>Name</div>
            <div>Email</div>
            <div>Orders</div>
            <div>Total Spent</div>
            <div>Last Status</div>
          </div>
        )}

        {customers.map((c) => (
          <div key={c.id} className="border-t border-white/10">
            <button
              onClick={() => setOpenId(openId === c.id ? null : c.id)}
              className="grid w-full grid-cols-[2fr_2fr_1fr_1.2fr_1.5fr] gap-2 px-3 py-3 text-left text-sm hover:bg-white/[0.03] transition-colors"
            >
              <div className="font-semibold text-white/90">{c.name || "—"}</div>
              <div className="text-white/60 truncate">{c.email}</div>
              <div className="text-white/60">{c.order_count}</div>
              <div className="text-white/70">${(c.total_spent || 0).toFixed(2)}</div>
              <div className={`text-xs font-bold uppercase ${STATUS_COLOR[c.last_order_status || ""] || "text-white/30"}`}>
                {c.last_order_status || "—"}
              </div>
            </button>

            {openId === c.id && <CustomerDetail customerId={c.id} />}
          </div>
        ))}

        {!loading && customers.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-white/30">No customers found.</div>
        )}
      </div>
    </div>
  );
}
