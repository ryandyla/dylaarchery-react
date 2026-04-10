// Email sending via Resend — sending domain: dyla.net
const ORDER_FROM   = "Dyla Archery <orders@dyla.net>";
const MARKETING_FROM = "Dyla Archery <hello@dyla.net>";
const RESEND_API = "https://api.resend.com/emails";

async function send(env: any, payload: { from: string; to: string; subject: string; html: string }) {
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY not set");
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: payload.from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Resend ${res.status}: ${err}`);
  }
  return res.json() as Promise<{ id: string }>;
}

// Dark-themed email shell matching the Dyla Archery aesthetic
function shell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{margin:0;padding:0;background:#080808;font-family:system-ui,-apple-system,sans-serif}
.wrap{max-width:580px;margin:32px auto;background:#111;border:1px solid #1e1e1e;border-radius:12px;overflow:hidden}
.hdr{padding:22px 30px;border-bottom:2px solid #f5c418}
.hdr h1{margin:0;font-size:20px;font-weight:900;color:#f5c418;letter-spacing:-0.5px}
.hdr p{margin:3px 0 0;font-size:11px;color:#555;font-family:monospace;letter-spacing:1px;text-transform:uppercase}
.bdy{padding:26px 30px}
.bdy p{margin:0 0 14px;font-size:15px;color:#c8c8c8;line-height:1.65}
.box{background:#0a0a0a;border:1px solid #1e1e1e;border-radius:8px;padding:14px 18px;margin:16px 0}
.box table{width:100%;border-collapse:collapse}
.box td{padding:4px 0;font-size:13px;vertical-align:top}
.box td:first-child{color:#555;width:90px;font-family:monospace;font-size:11px;text-transform:uppercase;padding-right:10px}
.box td:last-child{color:#bbb}
.cta{display:inline-block;background:#f5c418;color:#000;font-weight:800;padding:12px 26px;border-radius:8px;text-decoration:none;font-size:15px;margin:10px 0}
.coupon{background:#0e0900;border:2px dashed #f5c418;border-radius:10px;padding:20px 26px;margin:18px 0;text-align:center}
.coupon .label{margin:0 0 6px;font-size:10px;color:#666;font-family:monospace;letter-spacing:2px;text-transform:uppercase}
.coupon .code{font-size:28px;font-weight:900;color:#f5c418;letter-spacing:3px;margin:0}
.coupon .fine{margin:6px 0 0;font-size:12px;color:#555}
.ftr{padding:14px 30px;border-top:1px solid #1a1a1a;background:#0a0a0a}
.ftr p{margin:0;font-size:11px;color:#333}
</style></head>
<body><div class="wrap">
<div class="hdr"><h1>DYLA ARCHERY</h1><p>Custom Arrow Builders</p></div>
<div class="bdy">${content}</div>
<div class="ftr"><p>Dyla Archery &mdash; Custom Arrow Builds &mdash; Questions? Reply to this email.</p></div>
</div></body></html>`;
}

export type BuildLabels = {
  shaft: string;
  cutMode: string;
  cutLength: number | null;
  wrap: string;
  vane: string;
  insert: string;
  point: string;
  nock: string;
  quantity: number;
};

export async function sendOrderConfirmation(
  env: any,
  opts: { to: string; name: string; orderId: number; build: BuildLabels; total: number }
) {
  const { to, name, orderId, build: b, total } = opts;
  const rows = [
    ["Shaft", b.shaft],
    ["Cut", b.cutMode === "cut" && b.cutLength ? `${b.cutLength}"` : "Uncut"],
    ["Wrap", b.wrap || "None"],
    ["Vanes", b.vane || "None"],
    ["Insert", b.insert || "None"],
    ["Point", b.point || "None"],
    ["Nock", b.nock || "None"],
    ["Qty", `${b.quantity} arrows`],
  ].map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join("");

  const html = shell(`
    <p>Hey ${name || "there"},</p>
    <p>Your order <strong>#${orderId}</strong> is confirmed. We've got it and will be in touch as your arrows are built.</p>
    <div class="box"><table>${rows}</table></div>
    <p><strong>Total: $${total.toFixed(2)}</strong></p>
    <p>We'll send updates as your build progresses. Reply to this email with any questions.</p>
    <p>&mdash; The Dyla Archery Team</p>
  `);

  return send(env, { from: ORDER_FROM, to, subject: `Order #${orderId} Confirmed — Dyla Archery`, html });
}

export async function sendOrderMessage(
  env: any,
  opts: { to: string; name: string; orderId: number; subject: string; body: string }
) {
  const { to, name, orderId, subject, body } = opts;
  const bodyHtml = body
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");

  const html = shell(`
    <p>Hey ${name || "there"},</p>
    ${bodyHtml}
    <p style="margin-top:22px;font-size:12px;color:#444;font-family:monospace">RE: ORDER #${orderId} &mdash; DYLA ARCHERY</p>
  `);

  return send(env, { from: ORDER_FROM, to, subject: `Re: Order #${orderId} — ${subject}`, html });
}

export async function sendWelcomeEmail(
  env: any,
  opts: { to: string; name: string }
) {
  const { to, name } = opts;
  const html = shell(`
    <p>Hey ${name || "there"},</p>
    <p>Thanks for joining the Dyla Archery list. We'll keep it simple — no spam, just the occasional update when something worth sharing comes up.</p>
    <p>In the meantime, if you want to see how we build or put together a custom set, the builder is ready for you:</p>
    <p><a href="https://dylaarchery.com/builder" class="cta">Build Your Arrows &rarr;</a></p>
    <p style="margin-top:24px">&mdash; Ryan &amp; the Dyla Archery Team</p>
  `);
  return send(env, {
    from: ORDER_FROM,
    to,
    subject: "You're on the Dyla Archery list",
    html,
  });
}

export async function sendWelcomeDiscount(
  env: any,
  opts: { to: string; name: string; code: string; discountAmount: number; siteOrigin: string }
) {
  const { to, name, code, discountAmount, siteOrigin } = opts;
  const html = shell(`
    <p>Hey ${name || "there"},</p>
    <p>Thanks for your interest in Dyla Archery — here's your discount code, good for <strong>$${discountAmount.toFixed(0)} off</strong> your first order:</p>
    <div class="coupon">
      <p class="label">Your Discount Code</p>
      <p class="code">${code}</p>
      <p class="fine">$${discountAmount.toFixed(0)} off &bull; single use &bull; expires in 30 days</p>
    </div>
    <p>Enter it at checkout when you're ready to build:</p>
    <p><a href="${siteOrigin}/builder" class="cta">Build Your Arrows &rarr;</a></p>
    <p style="font-size:13px;color:#555">Questions? Just reply to this email.</p>
    <p>&mdash; Ryan &amp; the Dyla Archery Team</p>
  `);
  return send(env, {
    from: MARKETING_FROM,
    to,
    subject: "Your Dyla Archery discount code",
    html,
  });
}

export async function sendAbandonedCartEmail(
  env: any,
  opts: {
    to: string;
    name: string;
    cartSnapshot: any;
    couponCode: string;
    discountAmount: number;
    siteOrigin: string;
  }
) {
  const { to, name, cartSnapshot, couponCode, discountAmount, siteOrigin } = opts;
  const returnUrl = `${siteOrigin}/builder?coupon=${encodeURIComponent(couponCode)}`;

  let buildRows = "";
  if (cartSnapshot?.shaft) {
    const rows = [
      ["Shaft", cartSnapshot.shaft],
      cartSnapshot.quantity ? ["Qty", `${cartSnapshot.quantity} arrows`] : null,
    ]
      .filter(Boolean)
      .map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`)
      .join("");
    if (rows) buildRows = `<div class="box"><table>${rows}</table></div>`;
  }

  const html = shell(`
    <p>Hey ${name || "there"},</p>
    <p>You were putting together a custom arrow build at Dyla Archery but didn't quite finish. We thought we'd reach out&mdash;and sweeten the deal.</p>
    ${buildRows}
    <p>Here's <strong>$${discountAmount.toFixed(0)} off</strong> your order:</p>
    <div class="coupon">
      <p class="label">Your Discount Code</p>
      <p class="code">${couponCode}</p>
      <p class="fine">$${discountAmount.toFixed(0)} off &bull; single use &bull; expires in 30 days</p>
    </div>
    <p><a href="${returnUrl}" class="cta">Complete My Build &rarr;</a></p>
    <p style="font-size:13px;color:#555">Or visit <a href="${siteOrigin}/builder" style="color:#888">${siteOrigin}/builder</a> and enter code <strong style="color:#f5c418">${couponCode}</strong> at checkout.</p>
  `);

  return send(env, {
    from: MARKETING_FROM,
    to,
    subject: `You left your build behind — here's $${discountAmount.toFixed(0)} off`,
    html,
  });
}
