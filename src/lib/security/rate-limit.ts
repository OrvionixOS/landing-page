/**
 * In-process fixed-window rate limiter.
 *
 * This is intentionally simple and dependency-free, which is appropriate for
 * a single-instance deployment. It is NOT safe across multiple server
 * instances (each instance keeps its own counters). When this app scales
 * horizontally, replace the `store` map below with a shared Redis-backed
 * limiter (e.g. Upstash `@upstash/ratelimit`) behind the same `rateLimit()`
 * function signature so call sites never change.
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

// Periodically sweep expired buckets so the map can't grow unbounded.
const SWEEP_INTERVAL_MS = 60_000;
if (!(globalThis as Record<string, unknown>).__rateLimitSweepStarted) {
  (globalThis as Record<string, unknown>).__rateLimitSweepStarted = true;
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of store) {
      if (bucket.resetAt <= now) store.delete(key);
    }
  }, SWEEP_INTERVAL_MS).unref?.();
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Allows `limit` calls per `windowMs` for the given key.
 * Key should combine the route name and an identity (user id, org id, or IP).
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { success: true, limit, remaining: limit - 1, resetAt };
  }

  if (existing.count >= limit) {
    return { success: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { success: true, limit, remaining: limit - existing.count, resetAt: existing.resetAt };
}

export function getClientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
