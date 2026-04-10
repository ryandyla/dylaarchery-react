// GET /api/member/auth/verify?token=XXX
// Validates the magic link token, creates a session, sets cookie, redirects.

import { createSession, makeSessionCookie, json } from "../../../_utils/member-auth";

export const onRequestGet = async ({ request, env }: any) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) return redirect(url.origin, "/member?error=invalid");

  const now = new Date().toISOString();
  const DB = env.DB;

  const link = await DB.prepare(
    `SELECT id, member_id, expires_at, used_at FROM magic_links WHERE token = ? LIMIT 1`
  ).bind(token).first() as { id: number; member_id: number; expires_at: string; used_at: string | null } | null;

  if (!link) return redirect(url.origin, "/member?error=invalid");
  if (link.used_at) return redirect(url.origin, "/member?error=used");
  if (link.expires_at < now) return redirect(url.origin, "/member?error=expired");

  // Mark link as used
  await DB.prepare(`UPDATE magic_links SET used_at = ? WHERE id = ?`).bind(now, link.id).run();

  // Create session
  const sessionToken = await createSession(link.member_id, env);
  const cookie = makeSessionCookie(sessionToken);

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${url.origin}/member/dashboard`,
      "Set-Cookie": cookie,
    },
  });
};

function redirect(origin: string, path: string) {
  return new Response(null, { status: 302, headers: { Location: `${origin}${path}` } });
}
