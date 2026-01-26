import { createRemoteJWKSet, jwtVerify } from "jose";

type AccessPayload = {
  aud?: string | string[];
  email?: string;
  sub?: string;
  exp?: number;
  iss?: string;
  [k: string]: any;
};

function getAudOk(payload: AccessPayload, aud: string) {
  const a = payload.aud;
  if (!a) return false;
  return Array.isArray(a) ? a.includes(aud) : a === aud;
}

// cache JWKS per teamDomain
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string) {
  const key = teamDomain.replace(/\/+$/, ""); // strip trailing slash
  const cached = jwksCache.get(key);
  if (cached) return cached;

  const jwks = createRemoteJWKSet(new URL(`${key}/cdn-cgi/access/certs`));
  jwksCache.set(key, jwks);
  return jwks;
}

export async function requireAccess(req: Request, env: any) {
  const token = req.headers.get("CF-Access-Jwt-Assertion");
  if (!token) {
    return { ok: false as const, res: new Response("Missing Access token", { status: 401 }) };
  }

  const teamDomainRaw = env.CF_ACCESS_TEAM_DOMAIN; // "https://rdyla.cloudflareaccess.com"
  const audience = env.CF_ACCESS_AUD;

  if (!teamDomainRaw || !audience) {
    return { ok: false as const, res: new Response("Access config missing", { status: 500 }) };
  }

  const teamDomain = String(teamDomainRaw).replace(/\/+$/, "");
  const jwks = getJwks(teamDomain);

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: teamDomain,
    });

    if (!getAudOk(payload as any, String(audience))) {
      return { ok: false as const, res: new Response("Invalid audience", { status: 403 }) };
    }

    return { ok: true as const, user: payload as any };
  } catch {
    return { ok: false as const, res: new Response("Invalid Access token", { status: 401 }) };
  }
}
