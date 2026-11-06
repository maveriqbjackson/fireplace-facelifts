import { json, signedInEmail } from "./_auth.js";

/* Sign-in is by email code now (Cloudflare Access). No password.
   GET  /api/login  -> who is signed in, or 401
   POST /api/login  -> no longer used */
export async function onRequestGet({ request, env }) {
  const email = await signedInEmail(request, env);
  return email ? json({ ok: true, email }) : json({ ok: false, error: "Not signed in." }, 401);
}
export async function onRequestPost() {
  return json({ ok: false, error: "Sign-in is by email code now. Reload the page." }, 410);
}
export async function onRequestDelete() {
  return json({ ok: true, signout: "/cdn-cgi/access/logout" });
}
