import { describe, expect, it, vi, beforeEach } from "vitest";
import { createAssessmentSchema, leadCaptureSchema, updateAssessmentSchema } from "./types";
import { hashAccessToken, generateAccessToken, tokensMatch } from "./token";

describe("assessment API contracts", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requires a strong access token on updates and lead capture", () => {
    expect(() =>
      updateAssessmentSchema.parse({
        accessToken: "short",
        status: "COMPLETED",
      }),
    ).toThrow();

    const token = generateAccessToken();
    const parsed = updateAssessmentSchema.parse({
      accessToken: token,
      currentStep: 2,
      status: "IN_PROGRESS",
      answers: { archive: "yes" },
    });
    expect(parsed.currentStep).toBe(2);
    expect(tokensMatch(token, hashAccessToken(token))).toBe(true);
  });

  it("accepts attribution on create without requiring PII", () => {
    const parsed = createAssessmentSchema.parse({
      utmSource: "linkedin",
      utmMedium: "social",
      utmCampaign: "cco-outreach",
      landingPath: "/tools/ria-compliance-stack-assessment",
      referrer: "https://www.linkedin.com/",
    });
    expect(parsed.utmSource).toBe("linkedin");
    expect("email" in parsed).toBe(false);
  });

  it("requires work email for lead capture and keeps phone out of schema", () => {
    const token = generateAccessToken();
    const parsed = leadCaptureSchema.parse({
      accessToken: token,
      email: "cco@example.com",
      firmName: "ABC Wealth",
      role: "CCO",
    });
    expect(parsed.email).toBe("cco@example.com");
    expect(Object.keys(parsed)).not.toContain("phone");
  });
});
