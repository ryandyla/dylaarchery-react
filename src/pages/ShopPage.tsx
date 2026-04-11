import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

type ShopItem = {
  id: number;
  name: string;       // computed display name
  subtitle?: string;
  pack_qty: number;
  pack_price: number;
  unit_price: number;
  image_url?: string | null;
  type: CartItemType;
  meta?: string;      // e.g. "300 spine · 8.9 GPI" or "100gr · 8-32"
};

type CartItemType = "shaft" | "nock" | "vane" | "wrap" | "field_point" | "broadhead";

type CartItem = ShopItem & { qty: number }; // qty = number of packs

const PACK_LABELS: Record<CartItemType, string> = {
  shaft: "12-shaft pack",
  nock: "12-pack",
  vane: "36-pack",
  wrap: "13-pack",
  field_point: "12-pack",
  broadhead: "3-pack",
};

const TABS: { key: CartItemType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "shaft", label: "Shafts" },
  { key: "nock", label: "Nocks" },
  { key: "vane", label: "Vanes" },
  { key: "wrap", label: "Wraps" },
  { key: "field_point", label: "Field Points" },
  { key: "broadhead", label: "Broadheads" },
];

// ── Cart helpers ──────────────────────────────────────────────────────────────

const CART_KEY = "dyla_shop_cart";

function loadCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function cartKey(item: ShopItem) {
  return `${item.type}-${item.id}`;
}

// ── Catalog transform ─────────────────────────────────────────────────────────

function transformCatalog(d: any): ShopItem[] {
  const items: ShopItem[] = [];

  for (const s of d.shafts ?? []) {
    items.push({
      id: s.id,
      type: "shaft",
      name: `${s.brand} ${s.model}`,
      subtitle: `${s.spine} spine`,
      meta: [
        s.spine ? `${s.spine} spine` : null,
        s.gpi ? `${s.gpi} GPI` : null,
        s.outer_diameter ? `OD ${s.outer_diameter}"` : null,
      ].filter(Boolean).join(" · "),
      pack_qty: s.pack_qty,
      pack_price: s.pack_price,
      unit_price: s.price_per_shaft,
      image_url: s.image_url,
    });
  }

  for (const n of d.nocks ?? []) {
    items.push({
      id: n.id,
      type: "nock",
      name: `${n.brand} ${n.model}`,
      meta: [n.system, n.style, n.weight_grains ? `${n.weight_grains}gr` : null].filter(Boolean).join(" · "),
      pack_qty: n.pack_qty,
      pack_price: n.pack_price,
      unit_price: n.price_per_arrow,
      image_url: n.image_url,
    });
  }

  for (const v of d.vanes ?? []) {
    items.push({
      id: v.id,
      type: "vane",
      name: `${v.brand} ${v.model}`,
      meta: [
        v.length ? `${v.length}" length` : null,
        v.height ? `${v.height}" height` : null,
        v.weight_grains ? `${v.weight_grains}gr` : null,
      ].filter(Boolean).join(" · "),
      pack_qty: v.pack_qty,
      pack_price: v.pack_price,
      unit_price: v.price_per_arrow,
      image_url: v.image_url,
    });
  }

  for (const w of d.wraps ?? []) {
    items.push({
      id: w.id,
      type: "wrap",
      name: w.name,
      meta: [
        w.length ? `${w.length}"` : null,
        w.min_outer_diameter && w.max_outer_diameter
          ? `OD ${w.min_outer_diameter}–${w.max_outer_diameter}"`
          : null,
      ].filter(Boolean).join(" · "),
      pack_qty: w.pack_qty,
      pack_price: w.pack_price,
      unit_price: w.price_per_arrow,
      image_url: w.image_url,
    });
  }

  for (const p of d.field_points ?? []) {
    items.push({
      id: p.id,
      type: "field_point",
      name: `${p.brand || ""} ${p.model || ""}`.trim() || "Field Point",
      meta: [p.weight_grains ? `${p.weight_grains}gr` : null, p.thread].filter(Boolean).join(" · "),
      pack_qty: p.pack_qty,
      pack_price: p.pack_price,
      unit_price: p.price,
      image_url: p.image_url,
    });
  }

  for (const p of d.broadheads ?? []) {
    items.push({
      id: p.id,
      type: "broadhead",
      name: `${p.brand || ""} ${p.model || ""}`.trim() || "Broadhead",
      meta: [p.weight_grains ? `${p.weight_grains}gr` : null, p.thread].filter(Boolean).join(" · "),
      pack_qty: p.pack_qty,
      pack_price: p.pack_price,
      unit_price: p.price,
      image_url: p.image_url,
    });
  }

  return items;
}

// ── Product Card ──────────────────────────────────────────────────────────────

function ProductCard({ item, inCart, onAdd }: { item: ShopItem; inCart: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] flex flex-col overflow-hidden hover:border-white/15 transition-colors">
      {/* Image */}
      <div className="aspect-square bg-white/5 flex items-center justify-center overflow-hidden">
        {item.image_url ? (
          <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-3" />
        ) : (
          <div className="text-3xl opacity-20">🏹</div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <div className="text-[10px] font-bold tracking-[2px] text-white/30 mb-1">
          {PACK_LABELS[item.type].toUpperCase()}
        </div>
        <div className="font-bold text-white text-sm leading-snug mb-1">{item.name}</div>
        {item.meta && (
          <div className="text-xs text-white/35 mb-3 leading-relaxed">{item.meta}</div>
        )}

        <div className="mt-auto flex items-center justify-between">
          <div>
            <div className="font-mono font-black text-yellow-400 text-base">
              ${item.pack_price.toFixed(2)}
            </div>
            <div className="text-[10px] text-white/25">
              ${item.unit_price.toFixed(2)}/ea
            </div>
          </div>
          <button
            onClick={onAdd}
            className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-colors ${
              inCart
                ? "bg-green-500/20 border border-green-400/30 text-green-400 hover:bg-green-500/30"
                : "bg-yellow-500 text-black hover:bg-yellow-400"
            }`}
          >
            {inCart ? "✓ Added" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cart Drawer ───────────────────────────────────────────────────────────────

type CheckoutState = "idle" | "busy" | "error";

function CartDrawer({
  cart,
  onClose,
  onQtyChange,
  onRemove,
}: {
  cart: CartItem[];
  onClose: () => void;
  onQtyChange: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [coupon, setCoupon] = useState("");
  const [status, setStatus] = useState<CheckoutState>("idle");
  const [errMsg, setErrMsg] = useState("");

  const subtotal = cart.reduce((sum, item) => sum + item.pack_price * item.qty, 0);

  async function checkout() {
    if (!email.trim()) { setErrMsg("Email is required"); return; }
    setStatus("busy");
    setErrMsg("");
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim(),
          coupon_code: coupon.trim() || null,
          items: cart.map((item) => ({
            type: item.type,
            id: item.id,
            name: `${item.name}${item.meta ? ` (${item.meta})` : ""}`,
            pack_qty: item.pack_qty,
            qty: item.qty,
            unit_price: item.unit_price,
            pack_price: item.pack_price,
          })),
        }),
      });
      const data = await res.json() as any;
      if (!data.ok) throw new Error(data.error || "Checkout failed");
      localStorage.removeItem(CART_KEY);
      window.location.href = data.checkout_url;
    } catch (e: any) {
      setStatus("error");
      setErrMsg(e?.message || "Something went wrong");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative z-10 flex flex-col w-full max-w-md bg-zinc-950 border-l border-white/10 shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-white/10 bg-zinc-950/90 backdrop-blur">
          <div className="font-black text-white">Your Cart</div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
        </div>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
            <div className="text-3xl mb-3">🛒</div>
            <div className="text-sm text-white/30">Your cart is empty</div>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="flex-1 p-5 space-y-3">
              {cart.map((item) => {
                const key = cartKey(item);
                return (
                  <div key={key} className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                    {item.image_url && (
                      <div className="w-14 h-14 rounded-lg bg-white/5 overflow-hidden shrink-0">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-1" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white leading-snug">{item.name}</div>
                      <div className="text-xs text-white/30">{PACK_LABELS[item.type]}</div>
                      <div className="flex items-center gap-2 mt-2">
                        {/* Qty controls */}
                        <button
                          onClick={() => onQtyChange(key, item.qty - 1)}
                          className="w-6 h-6 rounded-md border border-white/10 text-white/50 hover:text-white flex items-center justify-center text-sm"
                        >−</button>
                        <span className="text-sm font-mono text-white w-4 text-center">{item.qty}</span>
                        <button
                          onClick={() => onQtyChange(key, item.qty + 1)}
                          className="w-6 h-6 rounded-md border border-white/10 text-white/50 hover:text-white flex items-center justify-center text-sm"
                        >+</button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between shrink-0">
                      <button
                        onClick={() => onRemove(key)}
                        className="text-white/20 hover:text-red-400 text-xs"
                      >✕</button>
                      <div className="font-mono font-black text-yellow-400 text-sm">
                        ${(item.pack_price * item.qty).toFixed(2)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Checkout form */}
            <div className="border-t border-white/10 p-5 space-y-3">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-white/50">Subtotal</span>
                <span className="text-white font-mono">${subtotal.toFixed(2)}</span>
              </div>

              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-yellow-400/40"
              />
              <input
                type="email"
                required
                placeholder="Email address *"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrMsg(""); }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-yellow-400/40"
              />
              <input
                type="text"
                placeholder="Coupon code (optional)"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-yellow-400 placeholder-white/20 placeholder:font-sans placeholder:text-white/20 outline-none focus:border-yellow-400/40"
              />

              {errMsg && (
                <div className="text-xs text-red-400">{errMsg}</div>
              )}

              <button
                onClick={checkout}
                disabled={status === "busy"}
                className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-extrabold text-black hover:bg-yellow-400 disabled:opacity-50 transition-colors"
              >
                {status === "busy" ? "Redirecting to payment…" : `Checkout · $${subtotal.toFixed(2)}`}
              </button>

              <p className="text-[10px] text-white/20 text-center">
                Secured by Stripe · Free returns · Questions? Contact us
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const [catalog, setCatalog] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<CartItemType | "all">("all");
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    fetch("/api/shop")
      .then((r) => r.json())
      .then((d: any) => {
        if (d.ok) setCatalog(transformCatalog(d));
      })
      .finally(() => setLoading(false));
  }, []);

  // Persist cart
  useEffect(() => { saveCart(cart); }, [cart]);

  function addToCart(item: ShopItem) {
    const key = cartKey(item);
    setCart((prev) => {
      const existing = prev.find((c) => cartKey(c) === key);
      if (existing) return prev.map((c) => cartKey(c) === key ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function setQty(key: string, qty: number) {
    if (qty < 1) { removeFromCart(key); return; }
    setCart((prev) => prev.map((c) => cartKey(c) === key ? { ...c, qty } : c));
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((c) => cartKey(c) !== key));
  }

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const cartInKeys = new Set(cart.map(cartKey));

  const visible = activeTab === "all" ? catalog : catalog.filter((i) => i.type === activeTab);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="text-xs font-bold tracking-[3px] text-white/30 mb-2">DYLA ARCHERY SHOP</div>
          <h1 className="text-3xl font-black text-white leading-tight">Component Packs</h1>
          <p className="text-white/45 mt-2 text-sm max-w-md">
            Stock up on individual components in standard pack quantities. Or go all-in with a fully custom built set.
          </p>
        </div>

        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          className="relative rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors"
        >
          <span className="text-white text-sm font-bold">🛒 Cart</span>
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-yellow-400 text-black text-[10px] font-black flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Custom build CTA */}
      <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-5 mb-8 flex flex-wrap items-center gap-4 justify-between">
        <div>
          <div className="font-black text-white text-lg">Want a fully custom build?</div>
          <p className="text-sm text-white/50 mt-0.5">
            Custom-cut, fletched, and built to your specs. Sets of 6 or 12.
          </p>
        </div>
        <Link
          to="/builder"
          className="rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-extrabold text-black hover:bg-yellow-400 transition-colors shrink-0"
        >
          Build Your Arrows →
        </Link>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors border ${
              activeTab === tab.key
                ? "bg-yellow-500/20 border-yellow-400/40 text-yellow-300"
                : "border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
            }`}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className="ml-1.5 text-[10px] text-white/30">
                {catalog.filter((i) => i.type === tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Products */}
      {loading ? (
        <div className="text-sm text-white/30 py-16 text-center">Loading catalog…</div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-white/30">
          No products in this category yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((item) => (
            <ProductCard
              key={cartKey(item)}
              item={item}
              inCart={cartInKeys.has(cartKey(item))}
              onAdd={() => addToCart(item)}
            />
          ))}
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          onQtyChange={setQty}
          onRemove={removeFromCart}
        />
      )}
    </div>
  );
}
