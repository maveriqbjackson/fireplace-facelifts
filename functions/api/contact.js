import { json } from "./_auth.js";

/* POST /api/contact — a visitor sends a message */
export async function onRequestPost({ request, env }) {
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ ok: false, error: "We couldn't read that." }, 400);
  }

  // Honeypot — bots fill this, people never see it.
  if (data.website) return json({ ok: true });

  const name    = trim(data.name, 120);
  const email   = trim(data.email, 200);
  const phone   = trim(data.phone, 40);
  const city    = trim(data.city, 80);
  const project = trim(data.project, 80);
  const body    = trim(data.body, 4000);

  // Up to three photos, sent as data URLs and re-attached to the email.
  const photos = Array.isArray(data.photos)
    ? data.photos.slice(0, 3)
        .filter(p => typeof p?.dataUrl === "string" && p.dataUrl.startsWith("data:image/"))
        .map((p, i) => ({
          filename: safeName(p.name, i),
          content: p.dataUrl.split(",")[1] || "",
        }))
        .filter(p => p.content.length && p.content.length < 4_000_000)
    : [];

  if (!name || name.length < 2)  return json({ ok: false, error: "Please include a name." }, 400);
  if (!isEmail(email))           return json({ ok: false, error: "That email doesn't look right." }, 400);
  if (!body || body.length < 10) return json({ ok: false, error: "Please tell us a little more." }, 400);

  // Store first. If email fails later, the message is still safe in the dashboard.
  let messageId;
  try {
    const res = await env.DB.prepare(
      `INSERT INTO messages (name, email, phone, city, project, body, status, is_test)
       VALUES (?, ?, ?, ?, ?, ?, 'new', 0)`
    ).bind(name, email, phone || null, city || null, project || null, body).run();
    messageId = res.meta?.last_row_id;
  } catch (err) {
    return json({ ok: false, error: "We couldn't save that. Please try again." }, 500);
  }

  // Notify her. Never fails the request — the message is already stored.
  try {
    await notify(env, { messageId, name, email, phone, city, project, body, photos });
  } catch { /* dashboard still has it */ }

  return json({ ok: true, id: messageId });
}

async function notify(env, m) {
  if (!env.RESEND_API_KEY || !env.OWNER_EMAIL) return;

  const site = env.SITE_URL || "https://fireplacefacelifts.com";
  const rows = [
    ["From",    m.name],
    ["Email",   m.email],
    ["Phone",   m.phone || "—"],
    ["Town",    m.city || "—"],
    ["Project", m.project || "—"],
    ["Photos",  m.photos?.length ? `${m.photos.length} attached` : "none"],
  ].map(([k, v]) =>
    `<tr>
       <td style="padding:6px 16px 6px 0;color:#7C7368;font:600 12px/1.4 -apple-system,sans-serif;letter-spacing:.08em;text-transform:uppercase;vertical-align:top;">${esc(k)}</td>
       <td style="padding:6px 0;color:#2A2723;font:400 15px/1.5 -apple-system,sans-serif;">${esc(v)}</td>
     </tr>`
  ).join("");

  const html = `
  <div style="background:#E9E4DA;padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#FFFDF9;border-radius:16px;padding:32px;">
      <p style="margin:0 0 4px;font:600 11px/1.4 -apple-system,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#7C7368;">New message</p>
      <h1 style="margin:0 0 22px;font:300 26px/1.2 Georgia,serif;color:#2A2723;">Someone asked about their fireplace</h1>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">${rows}</table>
      <div style="background:#F2EEE6;border-radius:10px;padding:18px;margin-bottom:24px;">
        <p style="margin:0;font:400 15px/1.65 -apple-system,sans-serif;color:#2A2723;white-space:pre-wrap;">${esc(m.body)}</p>
      </div>
      <a href="${site}/admin/"
         style="display:inline-block;background:#46594A;color:#F6F3EC;text-decoration:none;font:600 15px -apple-system,sans-serif;padding:13px 24px;border-radius:999px;">
        Open your dashboard
      </a>
      <p style="margin:20px 0 0;font:400 13px/1.5 -apple-system,sans-serif;color:#7C7368;">
        You can also just hit reply — it goes straight to ${esc(m.email)}.
      </p>
    </div>
  </div>`;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "Fireplace Facelifts <hello@fireplacefacelifts.com>",
      to: [env.OWNER_EMAIL],
      reply_to: m.email,
      subject: `New message from ${m.name}${m.city ? " in " + m.city : ""}`,
      html,
      ...(m.photos?.length ? { attachments: m.photos } : {}),
    }),
  });
  if (!r.ok) throw new Error(await r.text());
}

const safeName = (n, i) => {
  const base = String(n || "").replace(/[^a-zA-Z0-9._-]/g, "").slice(-40);
  return base && /\.(jpe?g|png|webp|heic)$/i.test(base) ? base : `photo-${i + 1}.jpg`;
};

const trim = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || "");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
