import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

// ── Types ─────────────────────────────────────────────────────────────────────

type CartItemType = "shaft" | "nock" | "vane" | "wrap" | "field_point" | "broadhead";

// A variant within a grouped product (size, spine, weight, etc.)
type ProductVariant = {
  id: number;
  label: string;       // shown on picker chip: "340", "1.8\"", "100 gr"
  sublabel?: string;   // shown below selected: "8.9 GPI · OD 0.244\""
  pack_price: number;
  unit_price: number;
  colors?: string[];   // available color options for this variant
};

// A product group (brand+model with 1+ variants)
type ProductGroup = {
  key: string;
  type: CartItemType;
  brand: string;
  name: string;
  pack_qty: number;
  image_urls: string[];
  variants: ProductVariant[];
};

// A flat (non-grouped) product — nocks, wraps
type ShopItem = {
  id: number;
  type: CartItemType;
  brand?: string;
  name: string;
  meta?: string;
  pack_qty: number;
  pack_price: number;
  unit_price: number;
  image_urls: string[];
  colors?: string[];
  lighted?: boolean;
};

type CartItem = {
  id: number;
  type: CartItemType;
  name: string;
  meta?: string;
  brand?: string;
  pack_qty: number;
  pack_price: number;
  unit_price: number;
  image_url?: string | null;
  color?: string | null;
  lighted?: boolean;
  qty: number;
};

// ── Color support ─────────────────────────────────────────────────────────────

const COLOR_SWATCH_BG: Record<string, string> = {
  black: "#1a1a1a", blackout: "#050505", white: "#f0f0f0", silver: "#a8a8a8",
  gray: "#888888", brown: "#7b4f2e", tan: "#c4a87a", olive: "#4b5320",
  navy: "#0a1a5c", red: "#cc2222", "neon red": "#ff1133", orange: "#ff6600",
  "neon orange": "#ff4500", yellow: "#ffd400", "neon yellow": "#ffe000",
  green: "#22bb44", "neon green": "#39ff14", kiwi: "#8db600", teal: "#009b8d",
  blue: "#2255cc", "satin blue": "#1e5fa8", purple: "#8833cc", pink: "#ff69b4",
  "hot pink": "#ff1493", chartreuse: "#80ff00",
  // flo = fluorescent (archery shorthand)
  "flo yellow": "#ffe000", "flo orange": "#ff4500", "flo green": "#39ff14",
  "flo red": "#ff1133", "flo pink": "#ff1493", "flo chartreuse": "#80ff00",
  clear: "rgba(255,255,255,0.12)",
  "white tiger":   "repeating-linear-gradient(45deg,#e8e8e8 0px,#e8e8e8 4px,#444 4px,#444 7px)",
  "red tiger":     "repeating-linear-gradient(45deg,#cc2222 0px,#cc2222 4px,#111 4px,#111 7px)",
  "orange tiger":  "repeating-linear-gradient(45deg,#ff6600 0px,#ff6600 4px,#111 4px,#111 7px)",
  "yellow tiger":  "repeating-linear-gradient(45deg,#ffd400 0px,#ffd400 4px,#111 4px,#111 7px)",
  "green tiger":   "repeating-linear-gradient(45deg,#22bb44 0px,#22bb44 4px,#111 4px,#111 7px)",
  "teal tiger":    "repeating-linear-gradient(45deg,#009b8d 0px,#009b8d 4px,#111 4px,#111 7px)",
  "pink tiger":    "repeating-linear-gradient(45deg,#ff1493 0px,#ff1493 4px,#111 4px,#111 7px)",
  "purple tiger":  "repeating-linear-gradient(45deg,#8833cc 0px,#8833cc 4px,#111 4px,#111 7px)",
  "american flag": "linear-gradient(90deg,#cc2222 0%,#cc2222 33%,#f5f5f5 33%,#f5f5f5 66%,#002868 66%)",
  "american made": "linear-gradient(90deg,#cc2222 0%,#f5f5f5 50%,#002868 100%)",
  "don't tread on me": "#e8c800",
  "fred bear": "#e8e8e8",
  realtree: "repeating-linear-gradient(30deg,#3a4a2a 0px,#5a6a3a 6px,#2a3520 11px)",
};

const LIGHT_COLORS = new Set([
  "white","white tiger","silver","yellow","neon yellow","kiwi","chartreuse",
  "neon green","tan","don't tread on me","fred bear","american made",
  "flo yellow","flo green","flo chartreuse",
]);

function ColorSwatchPicker({ colors, selected, onSelect }: {
  colors: string[];
  selected: string | null;
  onSelect: (c: string | null) => void;
}) {
  if (colors.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="text-[10px] font-bold tracking-widest text-white/25 mb-1.5">COLOR</div>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => {
          const key = c.toLowerCase();
          const bg = COLOR_SWATCH_BG[key] ?? "#666";
          const isSel = selected === c;
          const isLight = LIGHT_COLORS.has(key);
          return (
            <button
              key={c}
              title={c}
              onClick={() => onSelect(isSel ? null : c)}
              style={{ background: bg }}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                isSel
                  ? isLight ? "border-black/60 scale-110" : "border-white scale-110"
                  : "border-transparent hover:scale-105 hover:border-white/40"
              }`}
            />
          );
        })}
      </div>
      {selected && (
        <div className="text-[10px] text-white/40 mt-1 capitalize">{selected}</div>
      )}
    </div>
  );
}

const PACK_LABELS: Partial<Record<CartItemType, string>> = {
  shaft: "12-shaft pack",
  vane: "36-pack",
  wrap: "13-pack",
  field_point: "12-pack",
  broadhead: "3-pack",
};

function packLabel(type: CartItemType, pack_qty: number, lighted?: boolean): string {
  if (type === "nock") return lighted ? "3-pack" : "12-pack";
  return PACK_LABELS[type] ?? `${pack_qty}-pack`;
}

const TAB_LABELS: { key: CartItemType | "all"; label: string }[] = [
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
function saveCart(cart: CartItem[]) { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function cartKey(type: CartItemType, id: number) { return `${type}-${id}`; }

// ── Catalog transform ─────────────────────────────────────────────────────────

type RawCatalog = {
  shaft_groups: any[];
  vane_groups: any[];
  field_point_groups: any[];
  broadhead_groups: any[];
  nocks: any[];
  wraps: any[];
};

function toGroups(raw: any[], type: CartItemType): ProductGroup[] {
  return raw.map((g, i) => ({
    key: `${type}-${g.brand}-${g.name}-${i}`,
    type,
    brand: g.brand,
    name: g.name,
    pack_qty: g.pack_qty,
    image_urls: Array.isArray(g.image_urls) ? g.image_urls : (g.image_url ? [g.image_url] : []),
    variants: g.variants,
  }));
}

function toItems(raw: any[], type: CartItemType): ShopItem[] {
  return raw.map((r) => ({
    id: r.id, type, brand: r.brand, name: r.name, meta: r.meta,
    pack_qty: r.pack_qty, pack_price: r.pack_price, unit_price: r.unit_price,
    image_urls: Array.isArray(r.image_urls) ? r.image_urls : (r.image_url ? [r.image_url] : []),
    colors: Array.isArray(r.colors) ? r.colors : [],
    lighted: r.lighted,
  }));
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({ urls, alt, startIdx, onClose }: {
  urls: string[]; alt: string; startIdx: number; onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIdx);
  const clamp = (n: number) => Math.max(0, Math.min(urls.length - 1, n));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setIdx((i) => clamp(i - 1));
      if (e.key === "ArrowRight") setIdx((i) => clamp(i + 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [urls.length]);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
      <div className="relative z-10 flex flex-col items-center max-w-3xl w-full px-4" onClick={(e) => e.stopPropagation()}>
        {/* Image */}
        <div className="relative w-full">
          <img src={urls[idx]} alt={alt} className="w-full max-h-[75vh] object-contain rounded-2xl" />
          {urls.length > 1 && (
            <>
              <button
                onClick={() => setIdx(clamp(idx - 1))}
                disabled={idx === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white text-xl flex items-center justify-center hover:bg-black/80 disabled:opacity-20 transition-colors"
              >‹</button>
              <button
                onClick={() => setIdx(clamp(idx + 1))}
                disabled={idx === urls.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white text-xl flex items-center justify-center hover:bg-black/80 disabled:opacity-20 transition-colors"
              >›</button>
            </>
          )}
        </div>
        {/* Dot strip + close */}
        <div className="flex items-center gap-4 mt-4">
          {urls.length > 1 && (
            <div className="flex gap-2">
              {urls.map((_, i) => (
                <button key={i} onClick={() => setIdx(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${i === idx ? "bg-yellow-400" : "bg-white/30 hover:bg-white/60"}`} />
              ))}
            </div>
          )}
          <button onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-1 text-xs text-white/50 hover:text-white hover:border-white/40 transition-colors">
            Close
          </button>
        </div>
        <div className="text-[11px] text-white/25 mt-2">{alt}</div>
      </div>
    </div>
  );
}

// ── Image Gallery ─────────────────────────────────────────────────────────────

function ImageGallery({ urls, alt }: { urls: string[]; alt: string }) {
  const [idx, setIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  if (urls.length === 0) {
    return (
      <div className="aspect-square bg-white/5 flex items-center justify-center">
        <div className="text-3xl opacity-20">🏹</div>
      </div>
    );
  }
  const clamp = (n: number) => Math.max(0, Math.min(urls.length - 1, n));
  return (
    <>
      <div className="aspect-square bg-white/5 relative group overflow-hidden cursor-zoom-in" onClick={() => setLightbox(true)}>
        <img src={urls[idx]} alt={alt} className="w-full h-full object-contain p-3" />
        {urls.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setIdx(clamp(idx - 1)); }}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 disabled:opacity-20"
              disabled={idx === 0}
            >‹</button>
            <button
              onClick={(e) => { e.stopPropagation(); setIdx(clamp(idx + 1)); }}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/50 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 disabled:opacity-20"
              disabled={idx === urls.length - 1}
            >›</button>
            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
              {urls.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setIdx(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === idx ? "bg-yellow-400" : "bg-white/30 hover:bg-white/60"}`}
                />
              ))}
            </div>
          </>
        )}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] text-white/60">zoom</div>
        </div>
      </div>
      {lightbox && <Lightbox urls={urls} alt={alt} startIdx={idx} onClose={() => setLightbox(false)} />}
    </>
  );
}

// ── Variant Group Card ────────────────────────────────────────────────────────

function VariantGroupCard({ group, cart, onAdd }: {
  group: ProductGroup;
  cart: CartItem[];
  onAdd: (item: Omit<CartItem, "qty">) => void;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const variant = group.variants[selectedIdx] ?? group.variants[0];
  const hasVariants = group.variants.length > 1;
  const colors = variant.colors ?? [];
  const key = cartKey(group.type, variant.id);
  const inCart = cart.some((c) => cartKey((c as any).type, (c as any).id) === key);

  // Reset color when variant changes
  const handleVariantChange = (i: number) => { setSelectedIdx(i); setSelectedColor(null); };

  // Infer the variant attribute name for the label row
  const variantAttr =
    group.type === "shaft" ? "Spine" :
    group.type === "vane" ? "Length" :
    (group.type === "field_point" || group.type === "broadhead") ? "Weight" : "";

  const metaParts = [hasVariants ? variant.label : (variant.sublabel ?? ""), selectedColor].filter(Boolean);

  function handleAdd() {
    onAdd({
      id: variant.id,
      type: group.type,
      brand: group.brand,
      name: group.name,
      meta: metaParts.join(" · "),
      pack_qty: group.pack_qty,
      pack_price: variant.pack_price,
      unit_price: variant.unit_price,
      image_url: group.image_urls[0] ?? null,
      color: selectedColor,
    });
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] flex flex-col overflow-hidden hover:border-white/15 transition-colors">
      {/* Image */}
      <ImageGallery urls={group.image_urls} alt={group.name} />

      <div className="p-4 flex flex-col flex-1">
        <div className="text-[10px] font-bold tracking-[2px] text-white/30 mb-1">
          {packLabel(group.type, group.pack_qty).toUpperCase()}
        </div>
        <div className="font-black text-white text-sm leading-snug mb-3">{group.name}</div>

        {/* Variant picker — only shown when there are multiple */}
        {hasVariants && (
          <div className="mb-3">
            <div className="text-[10px] font-bold tracking-widest text-white/25 mb-1.5">
              {variantAttr.toUpperCase()}
            </div>
            <div className="flex flex-wrap gap-1">
              {group.variants.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => handleVariantChange(i)}
                  className={`rounded-lg px-2 py-1 text-xs font-mono font-bold border transition-colors ${
                    i === selectedIdx
                      ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-300"
                      : "border-white/10 text-white/40 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
            {variant.sublabel && (
              <div className="text-[10px] text-white/25 mt-1.5">{variant.sublabel}</div>
            )}
          </div>
        )}

        {/* Single variant — show sublabel inline */}
        {!hasVariants && variant.sublabel && (
          <div className="text-xs text-white/35 mb-3">{variant.sublabel}</div>
        )}

        {/* Color swatches (vanes) */}
        {colors.length > 0 && (
          <ColorSwatchPicker colors={colors} selected={selectedColor} onSelect={setSelectedColor} />
        )}

        <div className="mt-auto flex items-center justify-between mt-3">
          <div>
            <div className="font-mono font-black text-yellow-400 text-base">
              ${variant.pack_price.toFixed(2)}
            </div>
            <div className="text-[10px] text-white/25">${variant.unit_price.toFixed(2)}/ea</div>
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

// ── Flat Product Card (nocks, wraps) ──────────────────────────────────────────

function ProductCard({ item, onAdd }: { item: ShopItem; inCart: boolean; onAdd: (color: string | null) => void }) {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const colors = item.colors ?? [];
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] flex flex-col overflow-hidden hover:border-white/15 transition-colors">
      <ImageGallery urls={item.image_urls} alt={item.name} />
      <div className="p-4 flex flex-col flex-1">
        <div className="text-[10px] font-bold tracking-[2px] text-white/30 mb-1">
          {packLabel(item.type, item.pack_qty, item.lighted).toUpperCase()}
        </div>
        <div className="font-bold text-white text-sm leading-snug mb-1">{item.name}</div>
        {item.meta && <div className="text-xs text-white/35 mb-3 leading-relaxed">{item.meta}</div>}
        {colors.length > 0 && (
          <ColorSwatchPicker colors={colors} selected={selectedColor} onSelect={setSelectedColor} />
        )}
        <div className="mt-auto flex items-center justify-between mt-3">
          <div>
            <div className="font-mono font-black text-yellow-400 text-base">${item.pack_price.toFixed(2)}</div>
            <div className="text-[10px] text-white/25">${item.unit_price.toFixed(2)}/ea</div>
          </div>
          <button onClick={() => onAdd(selectedColor)}
            className="rounded-xl px-3 py-1.5 text-xs font-extrabold transition-colors bg-yellow-500 text-black hover:bg-yellow-400">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Cart Drawer ───────────────────────────────────────────────────────────────

function CartDrawer({ cart, onClose, onQtyChange, onRemove }: {
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

  const subtotal = cart.reduce((sum, item) => sum + (item as any).pack_price * item.qty, 0);

  async function checkout() {
    if (!email.trim()) { setErrMsg("Email is required"); return; }
    setBusy(true);
    setErrMsg("");
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim(), name: name.trim(),
          coupon_code: coupon.trim() || null,
          items: cart.map((item) => {
            const i = item as any;
            return {
              type: i.type, id: i.id,
              name: i.meta ? `${i.name} (${i.meta})` : i.name,
              pack_qty: i.pack_qty, qty: item.qty,
              unit_price: i.unit_price, pack_price: i.pack_price,
            };
          }),
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
                const i = item as any;
                const k = cartKey(i.type, i.id);
                return (
                  <div key={k} className="flex gap-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
                    {i.image_url && (
                      <div className="w-14 h-14 rounded-lg bg-white/5 overflow-hidden shrink-0">
                        <img src={i.image_url} alt={i.name} className="w-full h-full object-contain p-1" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white leading-snug">{i.name}</div>
                      {i.meta && <div className="text-[11px] text-white/35">{i.meta}</div>}
                      <div className="text-xs text-white/25">{packLabel(i.type, i.pack_qty, i.lighted)}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => onQtyChange(k, item.qty - 1)} className="w-6 h-6 rounded-md border border-white/10 text-white/50 hover:text-white flex items-center justify-center text-sm">−</button>
                        <span className="text-sm font-mono text-white w-4 text-center">{item.qty}</span>
                        <button onClick={() => onQtyChange(k, item.qty + 1)} className="w-6 h-6 rounded-md border border-white/10 text-white/50 hover:text-white flex items-center justify-center text-sm">+</button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end justify-between shrink-0">
                      <button onClick={() => onRemove(k)} className="text-white/20 hover:text-red-400 text-xs">✕</button>
                      <div className="font-mono font-black text-yellow-400 text-sm">${(i.pack_price * item.qty).toFixed(2)}</div>
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
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [flatItems, setFlatItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<CartItemType | "all">("shaft");
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name_asc");

  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    fetch("/api/shop")
      .then((r) => r.json())
      .then((d: RawCatalog & { ok: boolean }) => {
        if (!d.ok) return;
        setGroups([
          ...toGroups(d.shaft_groups, "shaft"),
          ...toGroups(d.vane_groups, "vane"),
          ...toGroups(d.field_point_groups, "field_point"),
          ...toGroups(d.broadhead_groups, "broadhead"),
        ]);
        setFlatItems([
          ...toItems(d.nocks, "nock"),
          ...toItems(d.wraps, "wrap"),
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { saveCart(cart); }, [cart]);
  useEffect(() => { setActiveBrand(null); }, [activeTab]);

  function addToCart(item: Omit<CartItem, "qty">) {
    const k = cartKey((item as any).type, (item as any).id);
    setCart((prev) => {
      const existing = prev.find((c) => cartKey((c as any).type, (c as any).id) === k);
      if (existing) return prev.map((c) => cartKey((c as any).type, (c as any).id) === k ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { ...item, qty: 1 } as CartItem];
    });
  }

  function addFlatToCart(item: ShopItem, color: string | null) {
    addToCart({
      ...item,
      image_url: item.image_urls[0] ?? null,
      color,
      meta: [item.meta, color].filter(Boolean).join(" · ") || undefined,
    } as unknown as Omit<CartItem, "qty">);
  }

  function setQty(k: string, qty: number) {
    if (qty < 1) { removeFromCart(k); return; }
    setCart((prev) => prev.map((c) => cartKey((c as any).type, (c as any).id) === k ? { ...c, qty } : c));
  }

  function removeFromCart(k: string) {
    setCart((prev) => prev.filter((c) => cartKey((c as any).type, (c as any).id) !== k));
  }

  const cartCount = cart.reduce((sum, c) => sum + c.qty, 0);
  const cartKeys = new Set(cart.map((c) => cartKey((c as any).type, (c as any).id)));

  // Tab-filtered groups and flat items
  const GROUPED_TYPES: CartItemType[] = ["shaft", "vane", "field_point", "broadhead"];
  const FLAT_TYPES: CartItemType[] = ["nock", "wrap"];

  const filteredGroups = useMemo(() => {
    let result = activeTab === "all" ? groups
      : GROUPED_TYPES.includes(activeTab as CartItemType) ? groups.filter((g) => g.type === activeTab)
      : [];
    if (activeBrand) result = result.filter((g) => g.brand === activeBrand);
    if (search) { const q = search.toLowerCase(); result = result.filter((g) => g.name.toLowerCase().includes(q)); }
    if (sort === "name_asc") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "price_asc") result = [...result].sort((a, b) => Math.min(...a.variants.map(v => v.pack_price)) - Math.min(...b.variants.map(v => v.pack_price)));
    if (sort === "price_desc") result = [...result].sort((a, b) => Math.min(...b.variants.map(v => v.pack_price)) - Math.min(...a.variants.map(v => v.pack_price)));
    return result;
  }, [groups, activeTab, activeBrand, search, sort]);

  const filteredFlat = useMemo(() => {
    let result = activeTab === "all" ? flatItems
      : FLAT_TYPES.includes(activeTab as CartItemType) ? flatItems.filter((i) => i.type === activeTab)
      : [];
    if (activeBrand) result = result.filter((i) => i.brand === activeBrand);
    if (search) { const q = search.toLowerCase(); result = result.filter((i) => i.name.toLowerCase().includes(q) || (i.meta ?? "").toLowerCase().includes(q)); }
    if (sort === "name_asc") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "price_asc") result = [...result].sort((a, b) => a.pack_price - b.pack_price);
    if (sort === "price_desc") result = [...result].sort((a, b) => b.pack_price - a.pack_price);
    return result;
  }, [flatItems, activeTab, activeBrand, search, sort]);

  // Brand filter options for current tab
  const brandsForTab = useMemo(() => {
    const fromGroups = activeTab === "all" || GROUPED_TYPES.includes(activeTab as CartItemType)
      ? groups.filter((g) => activeTab === "all" || g.type === activeTab).map((g) => g.brand)
      : [];
    const fromFlat = activeTab === "all" || FLAT_TYPES.includes(activeTab as CartItemType)
      ? flatItems.filter((i) => activeTab === "all" || i.type === activeTab).map((i) => i.brand ?? "")
      : [];
    const all = [...new Set([...fromGroups, ...fromFlat].filter(Boolean))].sort();
    return all.length > 1 ? all : [];
  }, [groups, flatItems, activeTab]);

  // Tab counts
  const tabCount = (key: CartItemType | "all") => {
    if (key === "all") return groups.length + flatItems.length;
    if (GROUPED_TYPES.includes(key as CartItemType)) return groups.filter((g) => g.type === key).length;
    return flatItems.filter((i) => i.type === key).length;
  };

  const totalVisible = filteredGroups.length + filteredFlat.length;

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

      {/* Controls */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
          <input type="text" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 outline-none focus:border-yellow-400/40" />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-yellow-400/40">
          <option value="name_asc">Name A → Z</option>
          <option value="price_asc">Price: Low → High</option>
          <option value="price_desc">Price: High → Low</option>
        </select>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {TAB_LABELS.map((tab) => {
          const count = tabCount(tab.key);
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
      {brandsForTab.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setActiveBrand(null)}
            className={`rounded-lg px-3 py-1 text-xs font-bold border transition-colors ${
              !activeBrand ? "border-white/30 text-white bg-white/10" : "border-white/10 text-white/40 hover:text-white"
            }`}>All brands</button>
          {brandsForTab.map((brand) => (
            <button key={brand} onClick={() => setActiveBrand(brand === activeBrand ? null : brand)}
              className={`rounded-lg px-3 py-1 text-xs font-bold border transition-colors ${
                activeBrand === brand ? "border-yellow-400/40 bg-yellow-400/15 text-yellow-300" : "border-white/10 text-white/40 hover:text-white"
              }`}>{brand}</button>
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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filteredGroups.map((group) => (
            <VariantGroupCard key={group.key} group={group} cart={cart} onAdd={addToCart} />
          ))}
          {filteredFlat.map((item) => (
            <ProductCard
              key={`${item.type}-${item.id}`}
              item={item}
              inCart={cartKeys.has(cartKey(item.type, item.id))}
              onAdd={(color) => addFlatToCart(item, color)}
            />
          ))}
        </div>
      )}

      {cartOpen && (
        <CartDrawer cart={cart} onClose={() => setCartOpen(false)} onQtyChange={setQty} onRemove={removeFromCart} />
      )}
    </div>
  );
}
