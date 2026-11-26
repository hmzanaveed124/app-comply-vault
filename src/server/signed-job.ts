import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

/** Production evidence-processing jobs must never fall back to unsigned writes. */
export function signedJob(
  handler: Parameters<typeof verifySignatureAppRouter>[0],
) {
  if (process.env.NODE_ENV !== "production") return handler;
  const unavailable = async () =>
    Response.json(
      {
        error:
          "Signed job processing is unavailable: configure both QStash signing keys.",
      },
      { status: 503 },
    );
  if (
    !process.env.QSTASH_CURRENT_SIGNING_KEY ||
    !process.env.QSTASH_NEXT_SIGNING_KEY
  )
    return unavailable;
  try {
    return verifySignatureAppRouter(handler);
  } catch {
    return unavailable;
  }
}
