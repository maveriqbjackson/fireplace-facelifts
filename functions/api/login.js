import { makeSession, sessionCookie, clearCookie, json } from "./_auth.js";

/* POST /api/login — sign in */
export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) {
    return json({ ok: false, error: "The dashboard isn't set up yet." }, 500);
  }

  let data;
  try { data = await request.json(); }
  catch { return json({ ok: false, error: "We couldn't read that." }, 400); }

  const given = String(data.password || "");
  const real  = String(env.ADMIN_PASSWORD);

  // constant-time comparison
  let diff = given.length ^ real.length;
  for (let i = 0; i < Math.max(given.length, real.length); i++) {
    diff |= (given.charCodeAt(i) || 0) ^ (real.charCodeAt(i) || 0);
  }
  if (diff !== 0) {
    await new Promise(r => setTimeout(r, 400)); // slow down guessing
    return json({ ok: false, error: "That password didn't work." }, 401);
  }

  const token = await makeSession(env.SESSION_SECRET);
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(token) });
}

/* DELETE /api/login — sign out */
export async function onRequestDelete() {
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
}
