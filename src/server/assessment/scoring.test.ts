import { describe, expect, it } from "vitest";
import {
  buildResultSummary,
  calculateGaps,
  calculateScore,
  emptyAnswers,
} from "./scoring";
import { generateAccessToken, hashAccessToken, tokensMatch } from "./token";
import {
  __resetAssessmentRateLimitStoreForTests,
  checkAssessmentRateLimit,
} from "./rate-limit";
import { assessmentAnswersSchema, leadCaptureSchema } from "./types";

describe("stack assessment scoring", () => {
  it("scores a strong stack near 100", () => {
    const answers = {
      ...emptyAnswers(),
      registration: "sec" as const,
      adviserCount: "6-15" as const,
      complianceModel: "internal" as const,
      archive: "yes" as const,
      crm: "yes" as const,
      meetings: "yes" as const,
      policyCentral: "yes" as const,
      commReview: "automated" as const,
      reviewEvidence: "single" as const,
      issueTracking: "workflow" as const,
      examRetrieval: "minutes" as const,
      biggestPain: "finding" as const,
      priority: "time" as const,
    };

    expect(calculateScore(answers)).toBe(100);
    const summary = buildResultSummary(answers);
    expect(summary.headline).toContain("Strong foundation");
    expect(summary.salesContext.stackFragmentation).toBe("Low");
    expect(summary.salesContext.supervisoryEvidence).toBe("Covered");
  });

  it("surfaces archive and evidence gaps for weak answers", () => {
    const answers = {
      ...emptyAnswers(),
      archive: "no" as const,
      crm: "no" as const,
      meetings: "no" as const,
      policyCentral: "no" as const,
      commReview: "none" as const,
      reviewEvidence: "undocumented" as const,
      issueTracking: "none" as const,
      examRetrieval: "days" as const,
    };

    expect(calculateScore(answers)).toBe(0);
    const gaps = calculateGaps(answers);
    expect(gaps[0]?.title).toMatch(/retention foundation/i);
    expect(buildResultSummary(answers).salesContext.stackFragmentation).toBe("High");
  });
});

describe("access tokens", () => {
  it("hashes and verifies opaque tokens", () => {
    const token = generateAccessToken();
    const hash = hashAccessToken(token);
    expect(tokensMatch(token, hash)).toBe(true);
    expect(tokensMatch("wrong-token-value-xxxxxxxxxxxxxxxxxxxx", hash)).toBe(false);
  });
});

describe("assessment rate limit", () => {
  it("blocks after the configured max", () => {
    __resetAssessmentRateLimitStoreForTests();
    const ip = "203.0.113.10";
    expect(checkAssessmentRateLimit(ip, "test-bucket", 2, 60_000).allowed).toBe(true);
    expect(checkAssessmentRateLimit(ip, "test-bucket", 2, 60_000).allowed).toBe(true);
    expect(checkAssessmentRateLimit(ip, "test-bucket", 2, 60_000).allowed).toBe(false);
  });
});

describe("input schemas", () => {
  it("rejects invalid lead emails", () => {
    expect(() =>
      leadCaptureSchema.parse({
        accessToken: "a".repeat(32),
        email: "not-an-email",
      }),
    ).toThrow();
  });

  it("accepts partial answer patches with empty strings", () => {
    const parsed = assessmentAnswersSchema.parse({
      ...emptyAnswers(),
      archive: "yes",
    });
    expect(parsed.archive).toBe("yes");
  });
});
