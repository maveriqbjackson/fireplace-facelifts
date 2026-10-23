import { verifySession, json, unauthorized } from "./_auth.js";

/* Customer reviews.
   Anyone can submit one; nothing appears on the site until she approves it
   in the dashboard. That ordering matters — an open review form on a small
   business site is a spam magnet otherwise. */

/* ---- public read, and her full list ------------------------------------- */
export async function onRequestGet({ request, env }) {
  const signedIn = await verifySession(request, env.SESSION_SECRET);

  try {
    const { results } = signedIn
      ? await env.DB.prepare(
          `SELECT id, name, town, body, rating, status, created_at
             FROM reviews ORDER BY created_at DESC LIMIT 200`).all()
      : await env.DB.prepare(
          `SELECT id, name, town, body, rating, created_at
             FROM reviews WHERE status = 'approved'
            ORDER BY created_at DESC LIMIT 24`).all();

    return json({ ok: true, reviews: results || [] }, 200,
      signedIn ? { "Cache-Control": "no-store" }
               : { "Cache-Control": "public, max-age=300, stale-while-revalidate=1800" });
  } catch {
    return json({ ok: true, reviews: [] });
  }
}

/* ---- a customer leaves one ---------------------------------------------- */
export async function onRequestPost({ request, env }) {
  let data;
  try { data = await request.json(); }
  catch { return json({ ok: false, error: "We couldn't read that." }, 400); }

  if (data.website) return json({ ok: true });        // honeypot

  const name = trim(data.name, 80);
  const town = trim(data.town, 80);
  const body = trim(data.body, 1500);
  let rating = Number(data.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) rating = null;

  if (name.length < 2)  return json({ ok: false, error: "Please add your name." }, 400);
  if (body.length < 10) return json({ ok: false, error: "A sentence or two, please." }, 400);

  try {
    await env.DB.prepare(
      `INSERT INTO reviews (name, town, body, rating, status) VALUES (?, ?, ?, ?, 'pending')`
    ).bind(name, town || null, body, rating).run();
  } catch {
    return json({ ok: false, error: "We couldn't save that. Try again." }, 500);
  }

  // let her know one is waiting, but never fail the submission over it
  try {
    if (env.RESEND_API_KEY && env.OWNER_EMAIL) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.FROM_EMAIL || "Fireplace Face Lifts <hello@fireplacefacelifts.net>",
          to: [env.OWNER_EMAIL],
          subject: `New review from ${name} — waiting for you to approve it`,
          text: `${name}${town ? " in " + town : ""}${rating ? ` · ${rating}/5` : ""}\n\n${body}\n\nIt will not appear on the site until you approve it in your dashboard.`,
        }),
      });
    }
  } catch { /* fine */ }

  return json({ ok: true });
}

/* ---- she approves, hides, or deletes ------------------------------------ */
export async function onRequestPatch({ request, env }) {
  if (!await verifySession(request, env.SESSION_SECRET)) return unauthorized();

  let data;
  try { data = await request.json(); } catch { data = {}; }
  const id = Number(data.id);
  const status = String(data.status || "");

  if (!id) return json({ ok: false, error: "Missing which review." }, 400);
  if (!["approved", "pending", "hidden"].includes(status)) {
    return json({ ok: false, error: "Unknown status." }, 400);
  }

  await env.DB.prepare(`UPDATE reviews SET status = ? WHERE id = ?`).bind(status, id).run();
  return json({ ok: true });
}

export async function onRequestDelete({ request, env }) {
  if (!await verifySession(request, env.SESSION_SECRET)) return unauthorized();
  let data;
  try { data = await request.json(); } catch { data = {}; }
  const id = Number(data.id);
  if (!id) return json({ ok: false, error: "Missing which review." }, 400);
  await env.DB.prepare(`DELETE FROM reviews WHERE id = ?`).bind(id).run();
  return json({ ok: true });
}

const trim = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
