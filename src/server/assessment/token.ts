import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 32 cryptographically random bytes → ~256 bits of entropy (base64url). */
export function generateAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashAccessToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function tokensMatch(token: string, hash: string): boolean {
  const candidate = Buffer.from(hashAccessToken(token), "utf8");
  const expected = Buffer.from(hash, "utf8");
  if (candidate.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(candidate, expected);
}
