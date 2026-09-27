import { verifySession, json, unauthorized } from "./_auth.js";

/* POST /api/reply — she writes back; it lands in the customer's inbox */
export async function onRequestPost({ request, env }) {
  if (!await verifySession(request, env.SESSION_SECRET)) return unauthorized();

  let data;
  try { data = await request.json(); }
  catch { return json({ ok: false, error: "We couldn't read that." }, 400); }

  const messageId = Number(data.messageId);
  const body = typeof data.body === "string" ? data.body.trim().slice(0, 8000) : "";

  if (!messageId)      return json({ ok: false, error: "Missing which message this answers." }, 400);
  if (body.length < 2) return json({ ok: false, error: "Write something first." }, 400);

  const msg = await env.DB.prepare(
    `SELECT id, name, email, body FROM messages WHERE id = ?`
  ).bind(messageId).first();

  if (!msg) return json({ ok: false, error: "We couldn't find that message." }, 404);

  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: "Email isn't connected yet." }, 500);
  }

  let deliveryStatus = "sent";
  let providerId = null;
  let errorText = null;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.FROM_EMAIL || "Fireplace Facelifts <hello@fireplacefacelifts.com>",
        to: [msg.email],
        reply_to: env.OWNER_EMAIL || undefined,
        subject: `Re: your fireplace`,
        html: replyHtml(msg, body, env),
        text: `${body}\n\n---\nYou wrote to us:\n${msg.body}`,
      }),
    });

    if (!res.ok) {
      deliveryStatus = "failed";
      errorText = (await res.text()).slice(0, 500);
    } else {
      const out = await res.json().catch(() => ({}));
      providerId = out.id || null;
    }
  } catch (err) {
    deliveryStatus = "failed";
    errorText = String(err).slice(0, 500);
  }

  await env.DB.prepare(
    `INSERT INTO replies (message_id, body, delivery_status, provider_id, error)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(messageId, body, deliveryStatus, providerId, errorText).run();

  // Only mark answered if it actually left the building.
  if (deliveryStatus === "sent") {
    await env.DB.prepare(`UPDATE messages SET status = 'answered' WHERE id = ?`)
      .bind(messageId).run();
    return json({ ok: true });
  }

  return json({ ok: false, error: "The email didn't go through." }, 502);
}

function replyHtml(msg, body, env) {
  const firstName = esc((msg.name || "").split(" ")[0]);
  return `
  <div style="background:#E9E4DA;padding:32px 16px;">
    <div style="max-width:560px;margin:0 auto;background:#FFFDF9;border-radius:16px;padding:32px;">
      <p style="margin:0 0 4px;font:600 11px/1.4 -apple-system,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#7C7368;">Fireplace Facelifts</p>
      <h1 style="margin:0 0 20px;font:300 24px/1.25 Georgia,serif;color:#2A2723;">Hi ${firstName}</h1>
      <p style="margin:0 0 26px;font:400 16px/1.7 -apple-system,sans-serif;color:#2A2723;white-space:pre-wrap;">${esc(body)}</p>
      <div style="border-top:1px solid rgba(42,39,35,.12);padding-top:18px;">
        <p style="margin:0 0 6px;font:600 11px/1.4 -apple-system,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#7C7368;">You wrote</p>
        <p style="margin:0;font:400 14px/1.6 -apple-system,sans-serif;color:#7C7368;white-space:pre-wrap;">${esc(msg.body)}</p>
      </div>
      <p style="margin:24px 0 0;font:400 13px/1.6 -apple-system,sans-serif;color:#7C7368;">
        Fireplace Facelifts · Fife, Washington<br>
        Just hit reply and it comes straight back to us.
      </p>
    </div>
  </div>`;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
