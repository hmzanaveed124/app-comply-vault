/**
 * Guards public assessment API payloads so lead PII never leaks.
 * Used in tests and as documentation of the public contract.
 *
 * Note: POST /api/assessments may return `accessToken` once at create time.
 * Subsequent GET/PATCH/lead responses must never include tokens or lead fields.
 */

const FORBIDDEN_PUBLIC_KEYS = new Set([
  "email",
  "firmName",
  "role",
  "lead",
  "accessTokenHash",
  "phone",
]);

export function isAllowedPublicAssessmentPayload(
  payload: Record<string, unknown>,
  options?: { allowOneTimeAccessToken?: boolean },
): boolean {
  for (const key of Object.keys(payload)) {
    if (FORBIDDEN_PUBLIC_KEYS.has(key)) return false;
    if (key === "accessToken" && !options?.allowOneTimeAccessToken) return false;
  }
  const serialized = JSON.stringify(payload);
  // Defensive: no email-shaped strings in public JSON
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(serialized)) {
    return false;
  }
  return true;
}
