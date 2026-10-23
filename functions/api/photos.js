import { verifySession, json, unauthorized } from "./_auth.js";

/* Gallery photos.
   Images live in R2 (binding PHOTOS); their captions and order live in D1.
   GET is public so the homepage can render the gallery.
   POST and DELETE need her dashboard session. */

const MAX_BYTES = 3_500_000;          // per image, after the browser has shrunk it
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/* ---- public: what the homepage reads ------------------------------------ */
export async function onRequestGet({ env }) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, before_key, after_key, caption, town, alt_before, alt_after, created_at
         FROM photos
        WHERE published = 1
        ORDER BY sort_order ASC, id DESC
        LIMIT 40`
    ).all();

    return json({ ok: true, photos: (results || []).map(shape) }, 200, {
      // short cache: new work should show up quickly, but not every visitor
      // needs to hit the database
      "Cache-Control": "public, max-age=120, stale-while-revalidate=600",
    });
  } catch {
    // An empty gallery is the correct answer when something is wrong —
    // the homepage falls back to the photos baked into the page.
    return json({ ok: true, photos: [] });
  }
}

/* ---- her dashboard: add a pair ------------------------------------------ */
export async function onRequestPost({ request, env }) {
  if (!await verifySession(request, env.SESSION_SECRET)) return unauthorized();
  if (!env.PHOTOS) return json({ ok: false, error: "Photo storage isn't connected yet." }, 500);

  let data;
  try { data = await request.json(); }
  catch { return json({ ok: false, error: "We couldn't read that." }, 400); }

  const before = decode(data.before);
  const after  = decode(data.after);
  if (!before) return json({ ok: false, error: "The before photo didn't come through." }, 400);
  if (!after)  return json({ ok: false, error: "The after photo didn't come through." }, 400);

  for (const [label, img] of [["before", before], ["after", after]]) {
    if (!ALLOWED.includes(img.type)) return json({ ok: false, error: `The ${label} photo needs to be a JPEG, PNG or WebP.` }, 400);
    if (img.bytes.length > MAX_BYTES) return json({ ok: false, error: `The ${label} photo is too large.` }, 400);
  }

  const stamp = Date.now().toString(36);
  const ext = (t) => (t === "image/png" ? "png" : t === "image/webp" ? "webp" : "jpg");
  const beforeKey = `work/${stamp}-before.${ext(before.type)}`;
  const afterKey  = `work/${stamp}-after.${ext(after.type)}`;

  try {
    await Promise.all([
      env.PHOTOS.put(beforeKey, before.bytes, { httpMetadata: { contentType: before.type, cacheControl: "public, max-age=31536000, immutable" } }),
      env.PHOTOS.put(afterKey,  after.bytes,  { httpMetadata: { contentType: after.type,  cacheControl: "public, max-age=31536000, immutable" } }),
    ]);
  } catch {
    return json({ ok: false, error: "The upload didn't finish. Try again." }, 500);
  }

  const caption = trim(data.caption, 300);
  const town    = trim(data.town, 80);

  try {
    const res = await env.DB.prepare(
      `INSERT INTO photos (before_key, after_key, caption, town, alt_before, alt_after, published, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
    ).bind(
      beforeKey, afterKey, caption || null, town || null,
      `A fireplace before refinishing${town ? " in " + town : ""}`,
      `The same fireplace after refinishing${town ? " in " + town : ""}`,
      -Date.now() / 1000 | 0,          // newest first by default
    ).run();

    return json({ ok: true, id: res.meta?.last_row_id });
  } catch {
    // don't leave files behind if the row failed
    await Promise.allSettled([env.PHOTOS.delete(beforeKey), env.PHOTOS.delete(afterKey)]);
    return json({ ok: false, error: "We couldn't save that. Try again." }, 500);
  }
}

/* ---- her dashboard: remove one ------------------------------------------ */
export async function onRequestDelete({ request, env }) {
  if (!await verifySession(request, env.SESSION_SECRET)) return unauthorized();

  let data;
  try { data = await request.json(); } catch { data = {}; }
  const id = Number(data.id);
  if (!id) return json({ ok: false, error: "Missing which photo." }, 400);

  const row = await env.DB.prepare(`SELECT before_key, after_key FROM photos WHERE id = ?`).bind(id).first();
  if (!row) return json({ ok: false, error: "We couldn't find that one." }, 404);

  await env.DB.prepare(`DELETE FROM photos WHERE id = ?`).bind(id).run();
  if (env.PHOTOS) {
    await Promise.allSettled([env.PHOTOS.delete(row.before_key), env.PHOTOS.delete(row.after_key)]);
  }
  return json({ ok: true });
}

/* ---- helpers ------------------------------------------------------------ */
function shape(r) {
  return {
    id: r.id,
    before: `/api/photo/${encodeURIComponent(r.before_key)}`,
    after:  `/api/photo/${encodeURIComponent(r.after_key)}`,
    caption: r.caption || "",
    town: r.town || "",
    altBefore: r.alt_before || "A fireplace before refinishing",
    altAfter:  r.alt_after  || "The same fireplace after refinishing",
  };
}

function decode(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const m = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!m) return null;
  try {
    const bin = atob(m[2]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { type: m[1].toLowerCase(), bytes };
  } catch { return null; }
}

const trim = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
