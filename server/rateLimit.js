const buckets = new Map();

/**
 * Rate limiter that prefers shared Supabase storage when available,
 * and falls back to in-memory state only when the database is unavailable.
 */
export function rateLimit({ keyFn, limit, windowMs, storage }) {
  return async (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();

    if (storage?.hit) {
      try {
        const result = await storage.hit({ key, now, windowMs, limit });
        if (!result.allowed) {
          return res.status(429).json({
            error: "rate_limited",
            retryAfterMs: result.retryAfterMs,
          });
        }
        return next();
      } catch {
        // fall through to in-memory fallback
      }
    }

    const windowStart = now - windowMs;
    const arr = buckets.get(key) || [];
    const pruned = arr.filter((t) => t > windowStart);
    pruned.push(now);
    buckets.set(key, pruned);

    if (pruned.length > limit) {
      return res.status(429).json({
        error: "rate_limited",
        retryAfterMs: pruned[0] + windowMs - now,
      });
    }

    next();
  };
}
