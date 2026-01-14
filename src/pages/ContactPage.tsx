import { useState } from "react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Failed");
      setStatus("sent");
      setName(""); setEmail(""); setMessage("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-bold">Contact us</h1>
      <p className="mt-2 text-white/70">
        Questions about spine, FOC, components, or a build you’re considering? Send a note.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm text-white/70">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-zinc-950/60 border border-white/10 px-3 py-2 outline-none focus:border-yellow-500"
              required />
          </div>
          <div>
            <label className="text-sm text-white/70">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              className="mt-1 w-full rounded-xl bg-zinc-950/60 border border-white/10 px-3 py-2 outline-none focus:border-yellow-500"
              required />
          </div>
        </div>

        <div>
          <label className="text-sm text-white/70">Message</label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={6}
            className="mt-1 w-full rounded-xl bg-zinc-950/60 border border-white/10 px-3 py-2 outline-none focus:border-yellow-500"
            required />
        </div>

        <button
          disabled={status === "sending"}
          className="rounded-xl bg-yellow-500 px-5 py-3 font-semibold text-black hover:brightness-110 disabled:opacity-60"
        >
          {status === "sending" ? "Sending..." : "Send message"}
        </button>

        {status === "sent" && <div className="text-sm text-green-400">Message sent — we’ll reply soon.</div>}
        {status === "error" && <div className="text-sm text-red-400">Something went wrong. Try again.</div>}
      </form>
    </div>
  );
}
