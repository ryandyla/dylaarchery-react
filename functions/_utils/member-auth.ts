// Shared auth helpers for member-facing API routes

export type Member = {
  id: number;
  email: string;
  name: string | null;
  interests: string | null; // raw JSON string
};

export type AuthedContext = {
  member: Member;
  sessionToken: string;
};

const SESSION_COOKIE = "member_session";
const SESSION_DAYS = 30;

// ── Cookie helpers ────────────────────────────────────────────────────────────

export function parseSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [k, v] = part.trim().split("=");
    if (k === SESSION_COOKIE && v) return decodeURIComponent(v);
  }
  return null;
}

export function makeSessionCookie(token: string): string {
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toUTCString();
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expires}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

// ── Session lookup ────────────────────────────────────────────────────────────

export async function getMember(request: Request, env: any): Promise<AuthedContext | null> {
  const token = parseSessionCookie(request.headers.get("Cookie"));
  if (!token) return null;

  const now = new Date().toISOString();
  const row = await env.DB.prepare(
    `SELECT s.token as session_token, m.id, m.email, m.name, m.interests
     FROM member_sessions s
     JOIN members m ON m.id = s.member_id
     WHERE s.token = ? AND s.expires_at > ?
     LIMIT 1`
  ).bind(token, now).first() as (Member & { session_token: string }) | null;

  if (!row) return null;
  return {
    member: { id: row.id, email: row.email, name: row.name, interests: row.interests },
    sessionToken: row.session_token,
  };
}

// ── Session creation ─────────────────────────────────────────────────────────

export async function createSession(memberId: number, env: any): Promise<string> {
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO member_sessions (member_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)`
  ).bind(memberId, token, expiresAt, now).run();
  return token;
}

// ── JSON helpers ─────────────────────────────────────────────────────────────

export function json(data: any, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers || {}) },
  });
}

export function unauthorized() {
  return json({ ok: false, error: "Not authenticated" }, { status: 401 });
}
