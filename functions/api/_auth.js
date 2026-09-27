/* Shared session helpers.
   Signed cookie — the password is never stored in the browser. */

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

export async function verifySession(request, secret) {
  const raw = request.headers.get("Cookie") || "";
  const match = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match) return false;

  const [expires, sig] = decodeURIComponent(match[1]).split(".");
  if (!expires || !sig) return false;
  if (Number(expires) < Date.now()) return false;

  const expected = await hmac(secret, expires);
  // constant-time-ish comparison
  if (expected.length !== sig.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  return diff === 0;
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
