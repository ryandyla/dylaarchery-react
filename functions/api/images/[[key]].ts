// functions/api/images/[...key].ts
// Public R2 image streaming endpoint
// GET /api/images/<key...>
// Example: /api/images/796892.jpg

export const onRequestGet: PagesFunction = async ({ env, request }) => {
  // Parse the R2 key directly from the URL so it works whether the path
  // uses real slashes (/api/images/products/points/1/x.jpg) or the old
  // %2F-encoded form (/api/images/products%2Fpoints%2F1%2Fx.jpg).
  const url = new URL(request.url);
  const prefix = "/api/images/";
  const rawKey = url.pathname.startsWith(prefix) ? url.pathname.slice(prefix.length) : null;
  const key = rawKey ? decodeURIComponent(rawKey) : null;

  if (!key) {
    return new Response("Missing image key", { status: 400 });
  }

  const obj = await env.PRODUCT_IMAGES?.get(key);
  if (!obj) {
    return new Response("Not found", { status: 404 });
  }

  // Handle conditional requests
  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && obj.httpEtag && ifNoneMatch === obj.httpEtag) {
    return new Response(null, { status: 304 });
  }

  const headers = new Headers();
  obj.writeHttpMetadata(headers);

  // Ensure caching + etag
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=86400, immutable");

  // If content-type wasn't set on upload, set a fallback by extension
  if (!headers.get("content-type")) {
    const lower = key.toLowerCase();
    if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) headers.set("content-type", "image/jpeg");
    else if (lower.endsWith(".png")) headers.set("content-type", "image/png");
    else if (lower.endsWith(".webp")) headers.set("content-type", "image/webp");
    else headers.set("content-type", "application/octet-stream");
  }

  return new Response(obj.body, { headers });
};
