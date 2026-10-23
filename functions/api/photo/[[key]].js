/* Serves an image out of R2.

   Public on purpose — these are gallery photos meant to be seen. The keys
   are only ever handed out by /api/photos, which filters to published rows,
   and nothing else lives in this bucket. */

export async function onRequestGet({ params, env, request }) {
  if (!env.PHOTOS) return new Response("Not found", { status: 404 });

  const key = Array.isArray(params.key) ? params.key.join("/") : String(params.key || "");
  // keep this bucket to the one prefix the uploader writes
  if (!key.startsWith("work/") || key.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const obj = await env.PHOTOS.get(key);
  if (!obj) return new Response("Not found", { status: 404 });

  // honour the browser's cache so repeat visits don't re-download
  const etag = obj.httpEtag;
  if (request.headers.get("If-None-Match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata?.contentType || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": etag,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
