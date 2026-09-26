import { describe, expect, it } from "vitest";
import {
  buildDetailedReviewEmail,
  detectDuplicationSignals,
  prioritizedObservations,
  strongestCoverage,
} from "./detailed-review";
import { buildResultSummary, emptyAnswers } from "./scoring";
import { summarizeFunnel, isStaleIncomplete } from "./funnel";
import { generateAccessToken, hashAccessToken, tokensMatch } from "./token";
import {
  createAssessmentSchema,
  leadCaptureSchema,
  updateAssessmentSchema,
} from "./types";

const realisticAnswers = {
  ...emptyAnswers(),
  registration: "sec" as const,
  adviserCount: "6-15" as const,
  complianceModel: "internal" as const,
  archive: "yes" as const,
  crm: "some" as const,
  meetings: "sometimes" as const,
  policyCentral: "partial" as const,
  commReview: "manual" as const,
  reviewEvidence: "scattered" as const,
  issueTracking: "spreadsheet" as const,
  examRetrieval: "hours" as const,
  biggestPain: "evidence" as const,
  priority: "visibility" as const,
};

describe("production readiness: auth + contracts", () => {
  it("uses high-entropy tokens and constant-time hash compare", () => {
    const token = generateAccessToken();
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(tokensMatch(token, hashAccessToken(token))).toBe(true);
    expect(tokensMatch(generateAccessToken(), hashAccessToken(token))).toBe(false);
  });

  it("rejects abandoned status writes and accepts progress/completion only", () => {
    // ABANDONED is derived from lastActivityAt — never accepted as a write status
    expect(() =>
      updateAssessmentSchema.parse({
        accessToken: "a".repeat(32),
        status: "ABANDONED",
      }),
    ).toThrow();

    const parsed = updateAssessmentSchema.parse({
      accessToken: "a".repeat(32),
      status: "COMPLETED",
      currentStep: 3,
    });
    expect(parsed.status).toBe("COMPLETED");
  });

  it("allows attribution-free anonymous create", () => {
    const parsed = createAssessmentSchema.parse({});
    expect(parsed.utmSource).toBeUndefined();
  });

  it("captures attribution when present without PII fields", () => {
    const parsed = createAssessmentSchema.parse({
      utmSource: "linkedin",
      utmMedium: "social",
      utmCampaign: "cco-outreach",
      referrer: "https://www.linkedin.com/",
    });
    expect(parsed.utmSource).toBe("linkedin");
    expect("email" in parsed).toBe(false);
  });

  it("requires email for lead capture and omits phone", () => {
    expect(() =>
      leadCaptureSchema.parse({
        accessToken: "a".repeat(32),
        email: "bad",
      }),
    ).toThrow();

    const parsed = leadCaptureSchema.parse({
      accessToken: "a".repeat(32),
      email: "cco@abcwealth.com",
      firmName: "ABC Wealth",
      role: "CCO",
    });
    expect(Object.keys(parsed)).not.toContain("phone");
  });
});

describe("production readiness: scoring + detailed email", () => {
  it("recomputes server-side score for the realistic fragmented stack", () => {
    const summary = buildResultSummary(realisticAnswers);
    expect(summary.score).toBeGreaterThan(0);
    expect(summary.score).toBeLessThan(80);
    expect(summary.salesContext.stackFragmentation).toBe("Moderate");
    expect(strongestCoverage(summary).some((a) => a.label.includes("archive"))).toBe(
      true,
    );
    expect(detectDuplicationSignals(realisticAnswers).length).toBeGreaterThanOrEqual(2);
    expect(prioritizedObservations(realisticAnswers, summary).length).toBeGreaterThanOrEqual(3);
  });

  it("builds a detailed review email with extra value beyond the basic snapshot", () => {
    const summary = buildResultSummary(realisticAnswers);
    const email = buildDetailedReviewEmail({
      answers: realisticAnswers,
      result: summary,
      firmName: "ABC Wealth",
    });

    expect(email.subject).toMatch(/detailed/i);
    expect(email.text).toMatch(/Strongest coverage/i);
    expect(email.text).toMatch(/Key gaps and friction areas/i);
    expect(email.text).toMatch(/Duplication/i);
    expect(email.text).toMatch(/Supervisory \/ evidence friction/i);
    expect(email.text).toMatch(/Prioritized observations/i);
    expect(email.text).toMatch(/not legal advice/i);
    expect(email.text).toMatch(/20-minute Stack Review/i);
    expect(email.text).not.toMatch(/Apollo/i);
    // Sample for human review in test output / CI logs when needed:
    // console.log(email.text)
    expect(email.html).toContain("ABC Wealth");
  });
});

describe("production readiness: funnel / abandonment", () => {
  it("derives stale incomplete from lastActivityAt, not unload events", () => {
    const now = new Date("2026-09-26T12:00:00.000Z");
    expect(
      isStaleIncomplete({
        status: "IN_PROGRESS",
        lastActivityAt: new Date("2026-09-01T12:00:00.000Z"),
        now,
      }),
    ).toBe(true);
    expect(
      isStaleIncomplete({
        status: "COMPLETED",
        lastActivityAt: new Date("2026-09-01T12:00:00.000Z"),
        now,
      }),
    ).toBe(false);

    const funnel = summarizeFunnel(
      [
        {
          status: "STARTED",
          currentStep: 0,
          lastActivityAt: new Date("2026-09-01T12:00:00.000Z"),
        },
        {
          status: "IN_PROGRESS",
          currentStep: 2,
          lastActivityAt: new Date("2026-09-25T12:00:00.000Z"),
        },
        {
          status: "COMPLETED",
          currentStep: 3,
          lastActivityAt: new Date("2026-09-25T12:00:00.000Z"),
        },
        {
          status: "LEAD_CAPTURED",
          currentStep: 3,
          lastActivityAt: new Date("2026-09-25T12:00:00.000Z"),
        },
      ],
      now,
    );

    expect(funnel.starts).toBe(4);
    expect(funnel.completions).toBe(2);
    expect(funnel.leadCaptures).toBe(1);
    expect(funnel.staleIncomplete).toBe(1);
    expect(funnel.dropOffByStep[0]).toBe(1);
    expect(funnel.dropOffByStep[2]).toBe(1);
    expect(funnel.completionRate).toBe(0.5);
    expect(funnel.leadConversionRate).toBe(0.5);
  });
});
