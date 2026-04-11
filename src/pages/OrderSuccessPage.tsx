import { useSearchParams } from "react-router-dom";
import { tw } from "../ui/tw";

export default function OrderSuccessPage() {
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const isShop = params.get("type") === "shop";

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      {/* Check mark */}
      <div
        className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-full"
        style={{
          background: "linear-gradient(135deg, #ffd400, #ffa000)",
          boxShadow: "0 0 0 8px rgba(255,212,0,.10)",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0b0b10" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h1 className={tw.h1}>Order received.</h1>

      <p className="mt-4 leading-relaxed text-white/70">
        {isShop
          ? "Payment confirmed. We'll get your components packed and shipped quickly. Check your email for a confirmation."
          : "Payment confirmed. We'll review your build specs and be in touch with a timeline before we start cutting."}
      </p>

      {orderId && (
        <p className="mt-3 text-sm text-white/35">Order #{orderId}</p>
      )}

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        {isShop ? (
          <>
            <a href="/shop" className={tw.btnSecondary}>Back to Shop</a>
            <a href="/builder" className={tw.btnPrimary}>Build a Custom Set</a>
          </>
        ) : (
          <>
            <a href="/builder" className={tw.btnSecondary}>Build another set</a>
            <a href="/" className={tw.btnPrimary}>Back to Home</a>
          </>
        )}
      </div>
    </div>
  );
}
