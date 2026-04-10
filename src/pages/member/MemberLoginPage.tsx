import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "That login link isn't valid. Please request a new one.",
  used: "That link has already been used. Please request a new one.",
  expired: "That link has expired. Please request a new one.",
};

export default function MemberLoginPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "busy" | "sent">("idle");
  const [err, setErr] = useState("");

  const urlError = params.get("error");

  // Redirect if already logged in
  useEffect(() => {
    fetch("/api/member/me").then((r) => {
      if (r.ok) navigate("/member/dashboard", { replace: true });
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("busy");
    setErr("");
    try {
      const res = await fetch("/api/member/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data: any = await res.json();
      if (!data.ok) throw new Error(data.error || "Something went wrong.");
      setStatus("sent");
    } catch (e: any) {
      setErr(e?.message || "Failed. Please try again.");
      setStatus("idle");
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-2 text-xs font-bold tracking-[2px] text-yellow-400/70">DYLA ARCHERY</div>
          <h1 className="text-3xl font-black text-white">Member Area</h1>
          <p className="mt-2 text-sm text-white/50">
            Save your bow setup, get curated arrow builds, track orders.
          </p>
        </div>

        {/* Error from magic link */}
        {urlError && ERROR_MESSAGES[urlError] && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
            {ERROR_MESSAGES[urlError]}
          </div>
        )}

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-6">
          {status === "sent" ? (
            <div className="py-4 text-center">
              <div className="mb-3 text-3xl">📬</div>
              <div className="font-bold text-white">Check your inbox</div>
              <p className="mt-2 text-sm text-white/50">
                We sent a login link to <strong className="text-white/80">{email}</strong>.
                It expires in 15 minutes.
              </p>
              <button
                onClick={() => { setStatus("idle"); setEmail(""); }}
                className="mt-4 text-xs text-white/40 hover:text-white/60 underline"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              <h2 className="mb-1 font-bold text-white">Sign in / Create account</h2>
              <p className="mb-5 text-xs text-white/40">
                Enter your email and we'll send you a magic link — no password needed.
              </p>

              <form onSubmit={submit} className="flex flex-col gap-3">
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 outline-none focus:border-yellow-400/40 focus:ring-1 focus:ring-yellow-400/20"
                />
                {err && <div className="text-xs text-red-400">{err}</div>}
                <button
                  type="submit"
                  disabled={status === "busy" || !email.trim()}
                  className="rounded-xl bg-yellow-500 py-3 text-sm font-extrabold text-black hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {status === "busy" ? "Sending…" : "Send Login Link →"}
                </button>
              </form>

              <p className="mt-4 text-center text-xs text-white/25">
                New here? Just enter your email — we'll create your account automatically.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
