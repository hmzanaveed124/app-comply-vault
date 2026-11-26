import { afterEach, describe, expect, it, vi } from "vitest";
const verify = vi.hoisted(() => vi.fn());
vi.mock("@upstash/qstash/nextjs", () => ({ verifySignatureAppRouter: verify }));
import { signedJob } from "./signed-job";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("production job authentication", () => {
  it("rejects jobs without signing keys without invoking the write handler", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "");
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const response = await signedJob(handler)(
      new Request("https://example.com") as never,
      {},
    );
    expect(response.status).toBe(503);
    expect(handler).not.toHaveBeenCalled();
  });
  it("does not fall back to unsigned writes if verification initialization fails", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("QSTASH_CURRENT_SIGNING_KEY", "test-current");
    vi.stubEnv("QSTASH_NEXT_SIGNING_KEY", "test-next");
    verify.mockImplementation(() => {
      throw new Error("Invalid configuration");
    });
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const response = await signedJob(handler)(
      new Request("https://example.com") as never,
      {},
    );
    expect(response.status).toBe(503);
    expect(handler).not.toHaveBeenCalled();
  });
});
