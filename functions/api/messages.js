import { verifySession, json, unauthorized } from "./_auth.js";

/* GET /api/messages — everything, newest first, with replies attached */
export async function onRequestGet({ request, env }) {
  if (!await verifySession(request, env.SESSION_SECRET)) return unauthorized();

  // is_test = 0 keeps any seeded rows out of her view.
  const { results: messages } = await env.DB.prepare(
    `SELECT id, name, email, phone, city, project, body, status, created_at
       FROM messages
      WHERE is_test = 0
      ORDER BY created_at DESC, id DESC
      LIMIT 500`
  ).all();

  const { results: replies } = await env.DB.prepare(
    `SELECT id, message_id, body, delivery_status, created_at
       FROM replies
      ORDER BY created_at ASC, id ASC`
  ).all();

  const byMessage = new Map();
  for (const r of replies) {
    if (!byMessage.has(r.message_id)) byMessage.set(r.message_id, []);
    byMessage.get(r.message_id).push(r);
  }

  return json({
    ok: true,
    messages: messages.map(m => ({ ...m, replies: byMessage.get(m.id) || [] })),
  });
}
