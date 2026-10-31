/* GET /ash-status — whether Ash is switched on. Booleans only; kept out of
   search results by the header. Lives outside /api/ only so it can be checked
   from outside without opening /api/ to crawlers. */
export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({ ok: true, ai: !!env.AI, session: !!env.SESSION_SECRET }), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
