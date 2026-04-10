import React, { useEffect, useRef, useState } from "react";

const GOLD = "#f5c418";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const STORAGE_KEY = "dyla_popup_done";

function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

export default function LeadWidget() {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  // Show after 5s unless already dismissed or completed
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => {
      setVisible(true);
      setOpen(true);
    }, 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open && !code) emailRef.current?.focus();
  }, [open, code]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/marketing/popup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() || null }),
      });
      const data: any = await res.json();
      if (!data.ok) throw new Error(data.error || "Something went wrong.");
      setCode(data.code);
      localStorage.setItem(STORAGE_KEY, "1");
    } catch (e: any) {
      setErr(e?.message || "Failed — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!visible) return null;

  // Bottom offset: on mobile stay above the sticky price bar
  const bottom = isMobile ? 76 : 20;
  const right = 16;

  // Minimized pill
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed", bottom, right, zIndex: 300,
          background: "linear-gradient(135deg, #1a1400 0%, #0e0e14 100%)",
          border: `1px solid rgba(245,196,24,0.35)`,
          borderRadius: 999,
          padding: "9px 16px",
          display: "flex", alignItems: "center", gap: 8,
          cursor: "pointer",
          boxShadow: "0 4px 24px rgba(245,196,24,0.12), 0 2px 8px rgba(0,0,0,0.5)",
          color: "rgba(255,255,255,.9)",
          fontSize: 13, fontWeight: 700,
          fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        }}>
        <span style={{ color: GOLD, fontSize: 15 }}>⟶</span>
        Get 10% off your first build
      </button>
    );
  }

  // Full chat window
  return (
    <div style={{
      position: "fixed", bottom, right, zIndex: 300,
      width: 320, maxWidth: `calc(100vw - ${right * 2}px)`,
      borderRadius: 16,
      border: "1px solid rgba(245,196,24,0.18)",
      background: "linear-gradient(160deg, #0e0e18 0%, #090910 100%)",
      boxShadow: "0 12px 48px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,212,0,0.04)",
      fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "11px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(255,255,255,0.025)",
      }}>
        <span style={{ color: GOLD, fontSize: 16, lineHeight: 1, flexShrink: 0 }}>◈</span>
        <span style={{ fontWeight: 900, fontSize: 13, color: "rgba(255,255,255,.92)", letterSpacing: -0.2 }}>
          Dyla Archery
        </span>
        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,.28)", letterSpacing: "1px" }}>
          CUSTOM BUILDS
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 5 }}>
          <button onClick={() => setOpen(false)} style={iconBtnStyle()} title="Minimize" aria-label="Minimize">
            <span style={{ marginTop: -1, display: "block" }}>−</span>
          </button>
          <button onClick={dismiss} style={iconBtnStyle()} title="Close" aria-label="Close">
            <span style={{ marginTop: -1, display: "block" }}>×</span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "16px 16px 18px" }}>
        {code ? (
          /* ── Success ── */
          <>
            <div style={{ textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎯</div>
              <div style={{ fontWeight: 900, fontSize: 15, color: "rgba(255,255,255,.93)", marginBottom: 5 }}>
                You're in!
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", lineHeight: 1.6 }}>
                Check your inbox — your code is on the way. Use it at checkout:
              </div>
            </div>

            <div style={{
              background: "#0e0900",
              border: `2px dashed ${GOLD}`,
              borderRadius: 10, padding: "14px 16px",
              textAlign: "center", marginBottom: 14,
            }}>
              <div style={{ fontFamily: MONO, fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: "2px", marginBottom: 6 }}>
                YOUR DISCOUNT CODE
              </div>
              <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 900, color: GOLD, letterSpacing: "2px" }}>
                {code}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(255,255,255,.3)", marginTop: 6 }}>
                $10 off · single use · expires in 30 days
              </div>
            </div>

            <button
              onClick={dismiss}
              style={{
                display: "block", width: "100%", textAlign: "center",
                background: `linear-gradient(90deg, ${GOLD}, #ff9800)`,
                color: "#0b0b10", fontWeight: 950, fontSize: 13,
                padding: "10px 16px", borderRadius: 10,
                border: "none", cursor: "pointer",
              }}>
              Start Building →
            </button>
          </>
        ) : (
          /* ── Form ── */
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 900, fontSize: 15, color: "rgba(255,255,255,.93)", marginBottom: 6, lineHeight: 1.3 }}>
                Get 10% off your first build
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,.48)", lineHeight: 1.6 }}>
                Drop your email and we'll send you a discount code. No spam, ever.
              </div>
            </div>

            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input
                ref={emailRef}
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="First name (optional)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
              />
              {err && (
                <div style={{ fontSize: 11, color: "#f87171", fontFamily: MONO }}>{err}</div>
              )}
              <button
                type="submit"
                disabled={busy || !email.trim()}
                style={{
                  background: busy || !email.trim()
                    ? "rgba(255,255,255,.07)"
                    : `linear-gradient(90deg, ${GOLD}, #ff9800)`,
                  color: busy || !email.trim() ? "rgba(255,255,255,.28)" : "#0b0b10",
                  border: "none", borderRadius: 10,
                  padding: "10px 16px",
                  fontWeight: 950, fontSize: 13,
                  cursor: busy || !email.trim() ? "not-allowed" : "pointer",
                  transition: "background 0.2s, color 0.2s",
                }}>
                {busy ? "Sending…" : "Send My Code →"}
              </button>
            </form>

            <div style={{
              marginTop: 10, fontSize: 10,
              color: "rgba(255,255,255,.22)",
              fontFamily: MONO, textAlign: "center", letterSpacing: "0.3px",
            }}>
              Unsubscribe anytime. We respect your inbox.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function iconBtnStyle(): React.CSSProperties {
  return {
    width: 24, height: 24, borderRadius: 6,
    border: "1px solid rgba(255,255,255,.1)",
    background: "rgba(255,255,255,.05)",
    color: "rgba(255,255,255,.5)",
    fontSize: 18, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    lineHeight: 1, padding: 0,
    transition: "background 0.15s",
  };
}

const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "rgba(255,255,255,.06)",
  border: "1px solid rgba(255,255,255,.1)",
  borderRadius: 8, padding: "9px 12px",
  color: "rgba(255,255,255,.9)", fontSize: 13,
  fontFamily: "inherit", outline: "none",
};
