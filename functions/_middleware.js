/* Working notes (README, setup guides, the database schema) live in the repo
   for whoever builds on it next, but they are never served on the live site.
   _routes.json sends only these paths and /api/* through Functions, so normal
   pages and photos never pay for this check. */
const PRIVATE = new Set(['/README.md', '/SETUP.md', '/CLOUDFLARE-BRIEF.md', '/schema.sql']);

export async function onRequest({ request, next }) {
  const path = new URL(request.url).pathname;
  if (PRIVATE.has(path)) return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  return next();
}
