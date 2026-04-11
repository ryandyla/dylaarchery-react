import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

type CartItemType = "shaft" | "nock" | "vane" | "wrap" | "field_point" | "broadhead";

type ShaftVariant = {
  id: number;
  spine: number;
  gpi: number | null;
  outer_diameter: number | null;
  max_length: number | null;
  unit_price: number;
  pack_price: number;
};

type ShaftGroup = {
  brand: string;
  model: string;
  pack_qty: number;
  image_url: string | null;
  variants: ShaftVariant[];
};

type ShopItem = {
  id: number;
  type: CartItemType;
  brand?: string;
  name: string;
  meta?: string;
  pack_qty: number;
  pack_price: number;
  unit_price: number;
  image_url?: string | null;
  lighted?: boolean;
};

type CartItem = ShopItem & { qty: number };

const PACK_LABELS: Record<CartItemType, string | ((item: ShopItem) => string)> = {
  shaft: "12-shaft pack",
  nock: (item) => item.lighted ? "3-pack" : "12-pack",
  vane: "36-pack",
  wrap: "13-pack",
  field_point: "12-pack",
  broadhead: "3-pack",
};

function packLabel(item: ShopItem): string {
  const v = PACK_LABELS[item.type];
  return typeof v === "function" ? v(item) : v;
}

const TAB_LABELS: { key: CartItemType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "shaft", label: "Shafts" },
  { key: "nock", label: "Nocks" },
  { key: "vane", label: "Vanes" },
  { key: "wrap", label: "Wraps" },
  { key: "field_point", label: "Field Points" },
  { key: "broadhead", label: "Broadheads" },
];

type SortKey = "name_asc" | "price_asc" | "price_desc";

// ── Cart helpers ──────────────────────────────────────────────────────────────

const CART_KEY = "dyla_shop_cart";

function loadCart(): CartItem[] {
  try { return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"); } catch { return []; }
}
function saveCart(cart: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
function cartItemKey(item: Pick<ShopItem, "type" | "id">) {
  return `${item.type}-${item.id}`;
}

// ── Catalog transform ─────────────────────────────────────────────────────────

function transformItems(d: any): { groups: ShaftGroup[]; items: ShopItem[] } {
  const groups: ShaftGroup[] = d.shaft_groups ?? [];

  const items: ShopItem[] = [];

  for (const n of d.nocks ?? []) {
    items.push({
      id: n.id, type: "nock", brand: n.brand,
      name: `${n.brand} ${n.model}`,
      meta: [n.system, n.style, n.weight_grains ? `${n.weight_grains}gr` : null].filter(Boolean).join(" · "),
      pack_qty: n.pack_qty, pack_price: n.pack_price, unit_price: n.price_per_arrow,
      image_url: n.image_url, lighted: !!n.lighted,
    });
  }
  for (const v of d.vanes ?? []) {
    items.push({
      id: v.id, type: "vane", brand: v.brand,
      name: `${v.brand} ${v.model}`,
      meta: [v.length ? `${v.length}" L` : null, v.height ? `${v.height}" H` : null, v.weight_grains ? `${v.weight_grains}gr` : null].filter(Boolean).join(" · "),
      pack_qty: v.pack_qty, pack_price: v.pack_price, unit_price: v.price_per_arrow,
      image_url: v.image_url,
    });
  }
  for (const w of d.wraps ?? []) {
    items.push({
      id: w.id, type: "wrap", brand: "Wrap",
      name: w.name,
      meta: [w.length ? `${w.length}"` : null, w.min_outer_diameter && w.max_outer_diameter ? `OD ${w.min_outer_diameter}–${w.max_outer_diameter}"` : null].filter(Boolean).join(" · "),
      pack_qty: w.pack_qty, pack_price: w.pack_price, unit_price: w.price_per_arrow,
      image_url: w.image_url,
    });
  }
  for (const p of d.field_points ?? []) {
    items.push({
      id: p.id, type: "field_point", brand: p.brand,
      name: `${p.brand || ""} ${p.model || ""}`.trim() || "Field Point",
      meta: [p.weight_grains ? `${p.weight_grains}gr` : null, p.thread].filter(Boolean).join(" · "),
      pack_qty: p.pack_qty, pack_price: p.pack_price, unit_price: p.price,
      image_url: p.image_url,
    });
  }
  for (const p of d.broadheads ?? []) {
    items.push({
      id: p.id, type: "broadhead", brand: p.brand,
      name: `${p.brand || ""} ${p.model || ""}`.trim() || "Broadhead",
      meta: [p.weight_grains ? `${p.weight_grains}gr` : null, p.thread].filter(Boolean).join(" · "),
      pack_qty: p.pack_qty, pack_price: p.pack_price, unit_price: p.price,
      image_url: p.image_url,
    });
  }

  return { groups, items };
}

// ── Shaft Group Card (brand/model + spine variant picker) ─────────────────────

function ShaftGroupCard({
  group, cart, onAdd,
}: {
  group: ShaftGroup;
  cart: CartItem[];
  onAdd: (item: ShopItem) => void;
}) {
  const [selectedSpine, setSelectedSpine] = useState<number>(group.variants[0]?.spine ?? 0);
  const variant = group.variants.find((v) => v.spine === selectedSpine) ?? group.variants[0];

  if (!variant) return null;

  const key = cartItemKey({ type: "shaft", id: variant.id });
  const inCart = cart.some((c) => cartItemKey(c) === key);

  function handleAdd() {
    onAdd({
      id: variant.id,
      type: "shaft",
      brand: group.brand,
      name: `${group.brand} ${group.model}`,
      meta: `${variant.spine} spine${variant.gpi ? ` · ${variant.gpi} GPI` : ""}`,
      pack_qty: group.pack_qty,
      pack_price: variant.pack_price,
      unit_price: variant.unit_price,
      image_url: group.image_url,
    });
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] flex flex-col overflow-hidden hover:border-white/15 transition-colors">
      {/* Image */}
      <div className="aspect-square bg-white/5 flex items-center justify-center overflow-hidden">
        {group.image_url
          ? <img src={group.image_url} alt={`${group.brand} ${group.model}`} className="w-full h-full object-contain p-3" />
          : <div className="text-3xl opacity-20">🏹</div>
        }
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="text-[10px] font-bold tracking-[2px] text-white/30 mb-1">12-SHAFT PACK</div>
        <div className="font-black text-white text-sm leading-snug">{group.brand}</div>
        <div className="text-white/60 text-sm mb-3">{group.model}</div>

        {/* Spine selector */}
        <div className="mb-3">
          <div className="text-[10px] font-bold tracking-widest text-white/25 mb-1.5">SPINE</div>
          <div className="flex flex-wrap gap-1">
            {group.variants.map((v) => (
              <button
                key={v.spine}
                onClick={() => setSelectedSpine(v.spine)}
                className={`rounded-lg px-2 py-1 text-xs font-mono font-bold transition-colors border ${
                  v.spine === selectedSpine
                    ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-300"
                    : "border-white/10 text-white/40 hover:text-white hover:bg-white/5"
                }`}
              >
                {v.spine}
              </button>
            ))}
          </div>
        </div>

        {/* Selected variant specs */}
        <div className="flex flex-wrap gap-3 text-xs text-white/30 mb-3">
          {variant.gpi && <span>{variant.gpi} GPI</span>}
          {variant.outer_diameter && <span>OD {variant.outer_diameter}"</span>}
          {variant.max_length && <span>Max {variant.max_length}"</span>}
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div>
            <div className="font-mono font-black text-yellow-400 text-base">${variant.pack_price.toFixed(2)}</div>
            <div className="text-[10px] text-white/25">${variant.unit_price.toFixed(2)}/shaft</div>
          </div>
          <button
            onClick={handleAdd}
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

// ── Individual Product Card ───────────────────────────────────────────────────

function ProductCard({ item, inCart, onAdd }: { item: ShopItem; inCart: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] flex flex-col overflow-hidden hover:border-white/15 transition-colors">
      <div className="aspect-square bg-white/5 flex items-center justify-center overflow-hidden">
        {item.image_url
          ? <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-3" />
          : <div className="text-3xl opacity-20">🏹</div>
        }
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="text-[10px] font-bold tracking-[2px] text-white/30 mb-1">{packLabel(item).toUpperCase()}</div>
        <div className="font-bold text-white text-sm leading-snug mb-1">{item.name}</div>
        {item.meta && <div className="text-xs text-white/35 mb-3 leading-relaxed">{item.meta}</div>}
        <div className="mt-auto flex items-center justify-between">
          <div>
            <div className="font-mono font-black text-yellow-400 text-base">${item.pack_price.toFixed(2)}</div>
            <div className="text-[10px] text-white/25">${item.unit_price.toFixed(2)}/ea</div>
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

function CartDrawer({
  cart, onClose, onQtyChange, onRemove,
}: {
  cart: CartItem[];
  onClose: () => void;
  onQtyChange: (key: string, qty: number) => void;
  onRemove: (key: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [coupon, setCoupon] = useState("");
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  const subtotal = cart.reduce((sum, item) => sum + item.pack_price * item.qty, 0);

  async function checkout() {
    if (!email.trim()) { setErrMsg("Email is required"); return; }
    setBusy(true);
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
      setBusy(false);
      setErrMsg(e?.message || "Something went wrong");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-full max-w-md bg-zinc-950 border-l border-white/10 shadow-2xl overflow-y-auto">
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
            <div className="flex-1 p-5 space-y-3">
              {cart.map((item) => {
                const key = cartItemKey(item);
                return (
                  <div key={key} className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                    {item.image_url && (
                      <div className="w-14 h-14 rounded-lg bg-white/5 overflow-hidden shrink-0">
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-1" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white leading-snug">{item.name}</div>
                      {item.meta && <div className="text-[11px] text-white/35">{item.meta}</div>}
                      <div className="text-xs text-white/25">{packLabel(item)}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => onQtyChange(key, item.qty - 1)} className="w-6 h-6 rounded-md border border-white/10 text-white/50 hover:text-white flex items-center justify-center text-sm">−</button>
                        <span className="text-sm font-mono text-white w-4 text-center">{item.qty}</span>
                        <button onClick={() => onQtyChange(key, item.qty + 1)} className="w-6 h-6 rounded-md border border-white/10 text-white/50 hover:text-white flex items-center justify-center text-sm">+</button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between shrink-0">
                      <button onClick={() => onRemove(key)} className="text-white/20 hover:text-red-400 text-xs">✕</button>
                      <div className="font-mono font-black text-yellow-400 text-sm">${(item.pack_price * item.qty).toFixed(2)}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-white/10 p-5 space-y-3">
              <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-white/50">Subtotal</span>
                <span className="text-white font-mono">${subtotal.toFixed(2)}</span>
              </div>
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-yellow-400/40" />
              <input type="email" required placeholder="Email address *" value={email} onChange={(e) => { setEmail(e.target.value); setErrMsg(""); }}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-yellow-400/40" />
              <input type="text" placeholder="Coupon code (optional)" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-mono text-yellow-400 placeholder:font-sans placeholder:text-white/20 outline-none focus:border-yellow-400/40" />
              {errMsg && <div className="text-xs text-red-400">{errMsg}</div>}
              <button onClick={checkout} disabled={busy}
                className="w-full rounded-xl bg-yellow-500 py-3 text-sm font-extrabold text-black hover:bg-yellow-400 disabled:opacity-50 transition-colors">
                {busy ? "Redirecting to payment…" : `Checkout · $${subtotal.toFixed(2)}`}
              </button>
              <p className="text-[10px] text-white/20 text-center">Secured by Stripe · Questions? Contact us</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const [shaftGroups, setShaftGroups] = useState<ShaftGroup[]>([]);
  const [allItems, setAllItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<CartItemType | "all">("all");
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name_asc");

  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    fetch("/api/shop")
      .then((r) => r.json())
      .then((d: any) => {
        if (d.ok) {
          const { groups, items } = transformItems(d);
          setShaftGroups(groups);
          setAllItems(items);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { saveCart(cart); }, [cart]);
  // Reset brand filter when tab changes
  useEffect(() => { setActiveBrand(null); }, [activeTab]);

  function addToCart(item: ShopItem) {
    const key = cartItemKey(item);
    setCart((prev) => {
      const existing = prev.find((c) => cartItemKey(c) === key);
      if (existing) return prev.map((c) => cartItemKey(c) === key ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 }];
    });
  }

  function setQty(key: string, qty: number) {
    if (qty < 1) { removeFromCart(key); return; }
    setCart((prev) => prev.map((c) => cartItemKey(c) === key ? { ...c, qty } : c));
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((c) => cartItemKey(c) !== key));
  }

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const cartItemKeys = new Set(cart.map(cartItemKey));

  // ── Brands for active tab ──────────────────────────────────────────────────
  const brandsForTab = useMemo<string[]>(() => {
    if (activeTab === "shaft") {
      return [...new Set(shaftGroups.map((g) => g.brand))].sort();
    }
    if (activeTab === "all") return [];
    return [...new Set(allItems.filter((i) => i.type === activeTab && i.brand).map((i) => i.brand!))].sort();
  }, [activeTab, shaftGroups, allItems]);

  // ── Filtered + sorted shaft groups ────────────────────────────────────────
  const visibleGroups = useMemo<ShaftGroup[]>(() => {
    if (activeTab !== "shaft" && activeTab !== "all") return [];
    let result = shaftGroups;
    if (activeBrand) result = result.filter((g) => g.brand === activeBrand);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((g) => `${g.brand} ${g.model}`.toLowerCase().includes(q));
    }
    if (sort === "price_asc") result = [...result].sort((a, b) => Math.min(...a.variants.map(v => v.pack_price)) - Math.min(...b.variants.map(v => v.pack_price)));
    if (sort === "price_desc") result = [...result].sort((a, b) => Math.min(...b.variants.map(v => v.pack_price)) - Math.min(...a.variants.map(v => v.pack_price)));
    if (sort === "name_asc") result = [...result].sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`));
    return result;
  }, [activeTab, shaftGroups, activeBrand, search, sort]);

  // ── Filtered + sorted individual items ────────────────────────────────────
  const visibleItems = useMemo<ShopItem[]>(() => {
    if (activeTab === "shaft") return [];
    let result = activeTab === "all" ? allItems : allItems.filter((i) => i.type === activeTab);
    if (activeBrand) result = result.filter((i) => i.brand === activeBrand);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((i) => i.name.toLowerCase().includes(q) || (i.meta ?? "").toLowerCase().includes(q));
    }
    if (sort === "price_asc") result = [...result].sort((a, b) => a.pack_price - b.pack_price);
    if (sort === "price_desc") result = [...result].sort((a, b) => b.pack_price - a.pack_price);
    if (sort === "name_asc") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  }, [activeTab, allItems, activeBrand, search, sort]);

  const totalVisible = visibleGroups.length + visibleItems.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <div className="text-xs font-bold tracking-[3px] text-white/30 mb-2">DYLA ARCHERY SHOP</div>
          <h1 className="text-3xl font-black text-white leading-tight">Component Packs</h1>
          <p className="text-white/45 mt-2 text-sm max-w-md">
            Stock up on individual components in standard pack quantities. Or go all-in with a fully custom built set.
          </p>
        </div>
        <button onClick={() => setCartOpen(true)}
          className="relative rounded-2xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10 transition-colors shrink-0">
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
          <p className="text-sm text-white/50 mt-0.5">Custom-cut, fletched, and built to your specs. Sets of 6 or 12.</p>
        </div>
        <Link to="/builder" className="rounded-xl bg-yellow-500 px-5 py-2.5 text-sm font-extrabold text-black hover:bg-yellow-400 transition-colors shrink-0">
          Build Your Arrows →
        </Link>
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-yellow-400/40"
          />
        </div>
        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40"
        >
          <option value="name_asc">Name A → Z</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
        </select>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TAB_LABELS.map((tab) => {
          const count = tab.key === "all"
            ? shaftGroups.length + allItems.length
            : tab.key === "shaft"
            ? shaftGroups.length
            : allItems.filter((i) => i.type === tab.key).length;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors border ${
                activeTab === tab.key
                  ? "bg-yellow-500/20 border-yellow-400/40 text-yellow-300"
                  : "border-white/10 bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
              }`}>
              {tab.label}
              {count > 0 && <span className="ml-1.5 text-[10px] text-white/30">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Brand filter */}
      {brandsForTab.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveBrand(null)}
            className={`rounded-lg px-3 py-1 text-xs font-bold border transition-colors ${
              !activeBrand ? "border-white/30 text-white bg-white/10" : "border-white/10 text-white/40 hover:text-white"
            }`}
          >All brands</button>
          {brandsForTab.map((brand) => (
            <button key={brand} onClick={() => setActiveBrand(brand === activeBrand ? null : brand)}
              className={`rounded-lg px-3 py-1 text-xs font-bold border transition-colors ${
                activeBrand === brand ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-300" : "border-white/10 text-white/40 hover:text-white"
              }`}>
              {brand}
            </button>
          ))}
        </div>
      )}

      {/* Products */}
      {loading ? (
        <div className="text-sm text-white/30 py-16 text-center">Loading catalog…</div>
      ) : totalVisible === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center text-sm text-white/30">
          {search ? `No products matching "${search}"` : "No products in this category yet."}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Shaft groups */}
          {visibleGroups.length > 0 && (
            <div>
              {activeTab === "all" && (
                <div className="text-xs font-bold tracking-[2px] text-white/30 mb-4">SHAFTS</div>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {visibleGroups.map((group) => (
                  <ShaftGroupCard
                    key={`${group.brand}-${group.model}`}
                    group={group}
                    cart={cart}
                    onAdd={addToCart}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Individual items */}
          {visibleItems.length > 0 && (
            <div>
              {activeTab === "all" && visibleGroups.length > 0 && (
                <div className="text-xs font-bold tracking-[2px] text-white/30 mb-4">COMPONENTS</div>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {visibleItems.map((item) => (
                  <ProductCard
                    key={cartItemKey(item)}
                    item={item}
                    inCart={cartItemKeys.has(cartItemKey(item))}
                    onAdd={() => addToCart(item)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
