import { json } from "./db";

function getCookie(req: Request, name: string) {
  const raw = req.headers.get("cookie") || "";
  const parts = raw.split(";").map((s) => s.trim());
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const k = p.slice(0, eq);
    const v = p.slice(eq + 1);
    if (k === name) return v;
  }
  return null;
}

/**
 * Cloudflare Access guard for Pages Functions.
 * - Works for browser sessions (CF_Authorization cookie)
 * - Works for service tokens (CF-Access-Client-Id/Secret)
 * - Uses /cdn-cgi/access/get-identity to confirm authentication
 */
export async function requireAccess(request: Request, extraHeaders: Record<string,string> = {}) {
  // 1) Service Token auth path (for curl/Postman)
  const clientId = request.headers.get("cf-access-client-id");
  const clientSecret = request.headers.get("cf-access-client-secret");
  if (clientId && clientSecret) {
    // If Access is configured to allow service tokens on this app,
    // Cloudflare will accept these when we call get-identity below.
    // Continue to validation step.
  }

  // 2) Browser session cookie path
  const cfAuth = getCookie(request, "CF_Authorization");

  // If neither is present, it’s definitely not authenticated.
  if (!cfAuth && !(clientId && clientSecret)) {
    return json({ ok: false, message: "Unauthorized (Cloudflare Access required)." }, 401, extraHeaders);
  }
  // Validate via get-identity (best practice; avoids trusting mere cookie existence)
  // Use SAME host as the incoming request so it hits the same Access app.
  const url = new URL(request.url);
  const identityUrl = `${url.origin}/cdn-cgi/access/get-identity`;

  const res = await fetch(identityUrl, {
    method: "GET",
    headers: {
      // Forward cookies for browser auth
      cookie: request.headers.get("cookie") || "",
      // Forward service token headers if provided
      "cf-access-client-id": clientId || "",
      "cf-access-client-secret": clientSecret || "",
    },
  });

 if (!res.ok) {
    return json({ ok: false, message: "Unauthorized (Cloudflare Access required)." }, 401, extraHeaders);
  }

  // Optional: you can read identity JSON here if you want email-based authorization
  // const ident = await res.json();

  return null; // allowed
}
