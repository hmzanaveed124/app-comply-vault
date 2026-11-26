import { describe, expect, it } from "vitest";
import { remediationReadinessError } from "./closure-evidence";
describe("closure evidence gate", () => {
  it("rejects a note or arbitrary metadata as proof of outreach", () => {
    expect(
      remediationReadinessError({
        resolutionType: "FOLLOW_UP_REQUIRED",
        tasks: [],
        evidence: [
          { type: "OUTREACH_PROOF", metadata: { note: "We will send it" } },
        ],
      }),
    ).toBeTruthy();
  });
  it("does not substitute a transcript quotation for completed outreach", () => {
    expect(
      remediationReadinessError({
        resolutionType: "FOLLOW_UP_REQUIRED",
        tasks: [],
        evidence: [
          {
            type: "TRANSCRIPT_SNIPPET",
            metadata: { startTime: 14, snippet: "recommendation" },
          },
        ],
      }),
    ).toBeTruthy();
  });
  it("requires acknowledgement when the recorded policy requires it", () => {
    expect(
      remediationReadinessError({
        resolutionType: "FOLLOW_UP_REQUIRED",
        metadata: { requireAcknowledgement: true },
        tasks: [],
        evidence: [
          { type: "OUTREACH_PROOF", url: "https://archive.example/sent/1" },
        ],
      }),
    ).toContain("Acknowledgement");
  });
  it("allows completed and evidenced outreach to proceed to human verification", () => {
    expect(
      remediationReadinessError({
        resolutionType: "FOLLOW_UP_REQUIRED",
        metadata: { requireAcknowledgement: false },
        tasks: [{ required: true, status: "COMPLETED" }],
        evidence: [
          { type: "OUTREACH_PROOF", url: "https://archive.example/sent/1" },
        ],
      }),
    ).toBeNull();
  });
});
