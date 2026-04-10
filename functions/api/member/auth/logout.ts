// POST /api/member/auth/logout
// Deletes the session from DB and clears the cookie.

import { parseSessionCookie, clearSessionCookie, json } from "../../../_utils/member-auth";

export const onRequestPost = async ({ request, env }: any) => {
  const token = parseSessionCookie(request.headers.get("Cookie"));
  if (token) {
    await env.DB.prepare(`DELETE FROM member_sessions WHERE token = ?`).bind(token).run();
  }
  return json({ ok: true }, {
    headers: { "Set-Cookie": clearSessionCookie() },
  });
};
