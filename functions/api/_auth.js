/* Shared sign-in helpers. Sign-in is by email code (Cloudflare Access). */
import { accessEmail, OWNERS } from "../_shared/access.js";

const COOKIE = "ff_session";
const TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days — she shouldn't have to sign in constantly

const enc = new TextEncoder();

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function makeSession(secret) {
  const expires = Date.now() + TTL_SECONDS * 1000;
  const sig = await hmac(secret, String(expires));
  return `${expires}.${sig}`;
}

/* Signed in = Cloudflare Access emailed them a code, and their email is Mav's,
   or has a Fireplace Facelifts role on the People screen in Ash HQ
   (aetherandash.digital/hq). No password. Needs ACCESS_TEAM_DOMAIN, ACCESS_AUD
   and TEAM_SYNC_KEY on this site. */
let teamCache = { at: 0, people: null };
async function fireplaceTeam(env) {
  if (teamCache.people && Date.now() - teamCache.at < 60e3) return teamCache.people;
  if (!env.TEAM_SYNC_KEY) return [];
  try {
    const r = await fetch("https://aetherandash.digital/api/team/roles?area=fireplace", { headers: { "x-team-key": env.TEAM_SYNC_KEY } });
    if (!r.ok) return teamCache.people || [];
    const j = await r.json();
    teamCache = { at: Date.now(), people: j.people || [] };
    return teamCache.people;
  } catch { return teamCache.people || []; }
}
export async function signedInEmail(request, env) {
  const email = await accessEmail(request, env);
  if (!email) return null;
  if (OWNERS.includes(email)) return email;
  return (await fireplaceTeam(env)).some((p) => String(p.email).toLowerCase() === email) ? email : null;
}
export async function verifySession(request, env) {
  return !!(await signedInEmail(request, env));
}

export function sessionCookie(value, maxAge = TTL_SECONDS) {
  return `${COOKIE}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function clearCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

export function unauthorized() {
  return json({ ok: false, error: "Not signed in." }, 401);
}
