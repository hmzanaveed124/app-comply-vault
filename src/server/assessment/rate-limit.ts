/**
 * In-memory sliding-window rate limit for public assessment write endpoints.
 * Keyed by IP + route bucket. Survives a single serverless isolate only —
 * sufficient as a basic abuse brake (same pattern as /api/trial/request).
 */

type RateRecord = { count: number; resetAt: number };

const store = new Map<string, RateRecord>();

export type RateLimitResult = {
  allowed: boolean;
  resetAt?: Date;
  remaining?: number;
};

export function checkAssessmentRateLimit(
  ipAddress: string | null,
  bucket: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  if (!ipAddress) {
    return { allowed: true };
  }

  const key = `${bucket}:${ipAddress}`;
  const now = Date.now();
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, resetAt: new Date(resetAt), remaining: maxRequests - 1 };
  }

  if (current.count >= maxRequests) {
    return { allowed: false, resetAt: new Date(current.resetAt), remaining: 0 };
  }

  current.count += 1;
  store.set(key, current);
  return {
    allowed: true,
    resetAt: new Date(current.resetAt),
    remaining: maxRequests - current.count,
  };
}

export function getClientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    null
  );
}

/** Test helper — clears the in-memory store */
export function __resetAssessmentRateLimitStoreForTests(): void {
  store.clear();
}
