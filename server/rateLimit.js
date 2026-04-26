const buckets = new Map();

/**
 * Super-lightweight in-memory rate limiter.
 * For production: replace with Redis-backed limiter.
 */
export function rateLimit({ keyFn, limit, windowMs }) {
  return (req, res, next) => {
    const key = keyFn(req);
    const now = Date.now();
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

