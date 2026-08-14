// Resolve the public origin for absolute URLs (meta tags, redirects, snap targets).
// Production must set PUBLIC_BASE_URL; never derive a public URL from
// attacker-controlled Host or X-Forwarded-* headers.
export function getPublicOrigin(req) {
  const override = process.env.PUBLIC_BASE_URL;
  if (override) return override.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") return null;

  const host = req?.get?.("host");
  if (!host) return null;

  const forwardedProto = req?.get?.("x-forwarded-proto");
  const proto = forwardedProto ? forwardedProto.split(",")[0].trim() : req?.protocol || "http";
  return `${proto}://${host}`;
}
