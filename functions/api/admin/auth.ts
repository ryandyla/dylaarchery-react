type AccessPayload = {
  aud?: string | string[];
  email?: string;
  sub?: string;
  exp?: number;
  iss?: string;
  [k: string]: any;
};

// Verify Cloudflare Access JWT by calling the certs endpoint and verifying signature.
// Minimal + reliable approach: use jose and cache JWKS.
import { createRemoteJWKSet, jwtVerify } from "jose";

function getAudOk(payload: AccessPayload, aud: string) {
  const a = payload.aud;
  if (!a) return false;
  if (Array.isArray(a)) return a.includes(aud);
  return a === aud;
}

export async function requireAccess(req: Request, env: any) {
  const token = req.headers.get("CF-Access-Jwt-Assertion");
  if (!token) {
    return { ok: false as const, res: new Response("Missing Access token", { status: 401 }) };
  }

  // Cloudflare Access team domain, example:
  // https://<your-team-name>.cloudflareaccess.com
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN; // e.g. "https://dylaarchery.cloudflareaccess.com"
  const audience = env.CF_ACCESS_AUD;           // Access application AUD

  if (!teamDomain || !audience) {
    return { ok: false as const, res: new Response("Access config missing", { status: 500 }) };
  }

  const jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: teamDomain,
    });

    if (!getAudOk(payload as any, audience)) {
      return { ok: false as const, res: new Response("Invalid audience", { status: 403 }) };
    }

    return { ok: true as const, user: payload as any };
  } catch (e: any) {
    return { ok: false as const, res: new Response("Invalid Access token", { status: 401 }) };
  }
}
