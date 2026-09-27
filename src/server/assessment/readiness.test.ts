import { describe, expect, it } from "vitest";
import {
  buildDetailedReviewEmail,
  detectDuplicationSignals,
  prioritizedObservations,
  strongestCoverage,
} from "./detailed-review";
import { buildResultSummary, emptyAnswers, isCompleteAnswers } from "./scoring";
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
    expect(email.text).toContain("Brief for your CCO or operations meeting");
    expect(email.text).toContain("Evidence to put on the table");
    expect(email.text).toContain("Ask to see: The reviewer, decision date, rationale");
    expect(email.text).toContain("Proposed order of work");
    expect(email.text).toMatch(/not legal advice/i);
    expect(email.text).toMatch(/20-minute Stack Review/i);
    expect(email.text).not.toMatch(/Apollo/i);
    // Sample for human review in test output / CI logs when needed:
    // console.log(email.text)
    expect(email.html).toContain('src="https://app.complyvault.co/ComplyVaultLogo.png"');
    expect(email.html).toContain('src="https://app.complyvault.co/stack-review-email-artwork.jpg"');
    expect(email.html.indexOf("stack-review-email-artwork.jpg")).toBeLessThan(email.html.indexOf("YOUR STACK REVIEW"));
    expect(email.html).toContain('width="36" height="36"');
    expect(email.html).toContain('alt=""');
    expect(email.html).toContain("Your next evidence bottleneck");
    expect(email.html).toContain("Where the stack holds together");
    expect(email.html).toContain("Brief for your CCO or operations meeting");
    expect(email.html).toContain("Evidence to put on the table");
    expect(email.html).toContain("Run this evidence drill this week");
    expect(email.html).toContain('href="https://www.complyvault.co/#cta"');
    expect(email.html).toContain("request form; our team will follow up to schedule");
    expect(email.html).not.toContain("ABC Wealth");
    expect(email.text).toContain("The score uses eight weighted answers");
    expect(email.text).toContain("Run this evidence drill this week");
    expect(email.text).toContain("These are questionnaire responses, not verified findings");
  });

  it("makes urgency and the first action depend on reported retrieval and archive", () => {
    const slow = { ...realisticAnswers, examRetrieval: "days" as const };
    const slowEmail = buildDetailedReviewEmail({ answers: slow, result: buildResultSummary(slow) });
    expect(slowEmail.text).toContain("a day or more");
    expect(slowEmail.text).toMatch(/time the exercise/i);

    const withoutArchive = { ...slow, archive: "no" as const };
    const foundationEmail = buildDetailedReviewEmail({
      answers: withoutArchive,
      result: buildResultSummary(withoutArchive),
    });
    expect(foundationEmail.text).toContain("first confirm which communication channels are retained");
    expect(foundationEmail.text).not.toContain("Pick one closed client issue");
  });

  it("adapts the report for strong, missing-archive, uncertain, and multi-firm cases", () => {
    const cases = [
      {
        name: "strong",
        answers: { ...realisticAnswers, archive: "yes" as const, crm: "yes" as const, meetings: "yes" as const, policyCentral: "yes" as const, commReview: "automated" as const, reviewEvidence: "single" as const, issueTracking: "workflow" as const, examRetrieval: "minutes" as const },
        title: "Stress-test a strong foundation",
      },
      {
        name: "no archive",
        answers: { ...realisticAnswers, archive: "no" as const, examRetrieval: "days" as const },
        title: "Confirm what is retained first",
      },
      {
        name: "uncertain archive",
        answers: { ...realisticAnswers, archive: "unsure" as const },
        title: "Confirm your archive coverage",
      },
      {
        name: "outsourced multi-firm",
        answers: { ...realisticAnswers, registration: "mixed" as const, complianceModel: "outsourced" as const },
        title: "Your next evidence bottleneck",
      },
    ];
    for (const { name, answers, title } of cases) {
      expect(isCompleteAnswers(answers), name).toBe(true);
      const summary = buildResultSummary(answers);
      const email = buildDetailedReviewEmail({ answers, result: summary });
      expect(email.html, name).toContain(title);
      expect(email.html, name).toContain("Evidence to put on the table");
      expect(email.text, name).toContain("Communications archive:");
      expect(email.text, name).toContain("Exam retrieval:");
      expect(email.text, name).not.toContain("undefined");
      expect(email.html, name).not.toContain("undefined");
      if (name === "outsourced multi-firm") {
        expect(email.text).toContain("one firm in the portfolio");
      }
    }
  });

  it("rejects empty and invalid answers before a result can be emailed", () => {
    expect(isCompleteAnswers(emptyAnswers())).toBe(false);
    expect(isCompleteAnswers({ ...realisticAnswers, priority: "" })).toBe(false);
    expect(isCompleteAnswers({ ...realisticAnswers, archive: "invalid" as "yes" })).toBe(false);
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
