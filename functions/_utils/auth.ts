// functions/_utils/auth.ts
export function requireAccessIdentity(request: Request) {
  // Present only when request passed through Cloudflare Access
  const email =
    request.headers.get("cf-access-authenticated-user-email") ||
    request.headers.get("Cf-Access-Authenticated-User-Email");

  // Optional extras if you want them
  const userId =
    request.headers.get("cf-access-authenticated-user-uuid") ||
    request.headers.get("Cf-Access-Authenticated-User-UUID");

  if (!email) {
    return {
      ok: false as const,
      status: 401,
      message: "Unauthorized (Cloudflare Access required).",
    };
  }

  return { ok: true as const, email, userId };
}

// functions/_utils/auth.ts
export function requireAccessEmail(request: Request) {
  const email =
    request.headers.get("cf-access-authenticated-user-email") ||
    request.headers.get("Cf-Access-Authenticated-User-Email");

  if (!email) {
    return { ok: false as const, status: 401, message: "Unauthorized (Cloudflare Access required)." };
  }

  return { ok: true as const, email };
}
