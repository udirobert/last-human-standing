// Resolve the public origin for absolute URLs (meta tags, redirects, snap targets).
// Priority: PUBLIC_BASE_URL env override (e.g. behind a CDN/proxy or for staging).
// Fallback: infer from the incoming request. Prefers x-forwarded-proto when present.
export function getPublicOrigin(req) {
  const override = process.env.PUBLIC_BASE_URL;
  if (override) return override.replace(/\/+$/, "");

  const host = req?.get?.("host");
  if (!host) return null;

  const forwardedProto = req?.get?.("x-forwarded-proto");
  const proto = forwardedProto ? forwardedProto.split(",")[0].trim() : req?.protocol || "https";
  return `${proto}://${host}`;
}
