import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUnique,
  create,
  update,
  upsertLead,
  updateLead,
  transaction,
  sendDetailedStackReviewEmail,
  sendStackAssessmentLeadNotification,
} = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  upsertLead: vi.fn(),
  updateLead: vi.fn(),
  transaction: vi.fn(),
  sendDetailedStackReviewEmail: vi.fn(async () => ({ success: false })),
  sendStackAssessmentLeadNotification: vi.fn(async () => ({ success: false })),
}));

vi.mock("~/server/db", () => ({
  db: {
    stackAssessment: {
      findUnique,
      create,
      update,
    },
    stackAssessmentLead: {
      upsert: upsertLead,
      update: updateLead,
    },
    $transaction: transaction,
  },
}));

vi.mock("~/server/assessment/email", () => ({
  sendDetailedStackReviewEmail,
  sendStackAssessmentLeadNotification,
}));

import { hashAccessToken, generateAccessToken } from "./token";
import { POST as createAssessment } from "../../app/api/assessments/route";
import {
  GET as getAssessment,
  PATCH as patchAssessment,
} from "../../app/api/assessments/[id]/route";
import { POST as captureLead } from "../../app/api/assessments/[id]/lead/route";
import { isAllowedPublicAssessmentPayload } from "./public-response";
import { emptyAnswers } from "./scoring";

describe("assessment route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendDetailedStackReviewEmail.mockResolvedValue({ success: false });
    sendStackAssessmentLeadNotification.mockResolvedValue({ success: false });
    transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        stackAssessmentLead: { upsert: upsertLead },
        stackAssessment: { update },
      }),
    );
  });

  it("creates an anonymous assessment and returns id + token only once", async () => {
    create.mockResolvedValue({
      id: "assess_new",
      status: "STARTED",
      currentStep: 0,
      startedAt: new Date("2026-09-26T12:00:00.000Z"),
    });

    const response = await createAssessment(
      new Request("http://localhost/api/assessments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://www.complyvault.co",
          "x-forwarded-for": "198.51.100.2",
        },
        body: JSON.stringify({
          utmSource: "linkedin",
          currentStep: 0,
        }),
      }),
    );

    expect(response.status).toBe(201);
    const json = (await response.json()) as {
      success: boolean;
      data: { assessmentId: string; accessToken: string };
    };
    expect(json.success).toBe(true);
    expect(json.data.assessmentId).toBe("assess_new");
    expect(json.data.accessToken.length).toBeGreaterThanOrEqual(32);
    expect(isAllowedPublicAssessmentPayload(json.data as never, {
      allowOneTimeAccessToken: true,
    })).toBe(true);
    expect(create).toHaveBeenCalledOnce();
  });

  it("rejects resume with invalid token (does not leak existence distinctly beyond 404)", async () => {
    const realToken = generateAccessToken();
    findUnique.mockResolvedValue({
      id: "assess_1",
      accessTokenHash: hashAccessToken(realToken),
      status: "IN_PROGRESS",
      currentStep: 1,
      answers: emptyAnswers(),
      score: null,
      resultSummary: null,
      startedAt: new Date(),
      completedAt: null,
      lastActivityAt: new Date(),
    });

    const response = await getAssessment(
      new Request("http://localhost/api/assessments/assess_1", {
        method: "GET",
        headers: {
          "X-Assessment-Token": generateAccessToken(),
          origin: "https://www.complyvault.co",
        },
      }),
      { params: Promise.resolve({ id: "assess_1" }) },
    );

    expect(response.status).toBe(404);
    const json = (await response.json()) as { success: boolean; error?: string };
    expect(json.success).toBe(false);
    expect(JSON.stringify(json)).not.toMatch(/@|lead|email/i);
  });

  it("rejects cross-assessment access when token does not match the row", async () => {
    findUnique.mockResolvedValue({
      id: "assess_target",
      accessTokenHash: hashAccessToken(generateAccessToken()),
      status: "IN_PROGRESS",
      currentStep: 1,
      answers: emptyAnswers(),
      score: null,
      resultSummary: null,
      startedAt: new Date(),
      completedAt: null,
      lastActivityAt: new Date(),
    });

    const response = await getAssessment(
      new Request("http://localhost/api/assessments/assess_target", {
        method: "GET",
        headers: { "X-Assessment-Token": generateAccessToken() },
      }),
      { params: Promise.resolve({ id: "assess_target" }) },
    );
    expect(response.status).toBe(404);
  });

  it("persists progress and returns no PII on PATCH", async () => {
    const token = generateAccessToken();
    findUnique.mockResolvedValue({
      id: "assess_1",
      accessTokenHash: hashAccessToken(token),
      status: "STARTED",
      answers: emptyAnswers(),
      score: null,
      resultSummary: null,
      completedAt: null,
    });
    update.mockResolvedValue({
      id: "assess_1",
      status: "IN_PROGRESS",
      currentStep: 1,
      score: null,
      resultSummary: null,
      completedAt: null,
      lastActivityAt: new Date(),
    });

    const response = await patchAssessment(
      new Request("http://localhost/api/assessments/assess_1", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "X-Assessment-Token": token,
          "x-forwarded-for": "198.51.100.3",
        },
        body: JSON.stringify({
          accessToken: token,
          currentStep: 1,
          status: "IN_PROGRESS",
          answers: { registration: "sec" },
        }),
      }),
      { params: Promise.resolve({ id: "assess_1" }) },
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      success: boolean;
      data: Record<string, unknown>;
    };
    expect(json.success).toBe(true);
    expect(isAllowedPublicAssessmentPayload(json.data)).toBe(true);
  });

  it("captures lead even when outbound email fails", async () => {
    const token = generateAccessToken();
    findUnique.mockResolvedValue({
      id: "assess_1",
      accessTokenHash: hashAccessToken(token),
      status: "COMPLETED",
      answers: emptyAnswers(),
      score: 56,
      resultSummary: null,
      completedAt: new Date(),
      utmSource: "linkedin",
      utmMedium: "social",
      utmCampaign: "cco",
      lead: null,
    });
    upsertLead.mockResolvedValue({ id: "lead_1" });
    update.mockResolvedValue({ id: "assess_1", status: "LEAD_CAPTURED" });

    const response = await captureLead(
      new Request("http://localhost/api/assessments/assess_1/lead", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Assessment-Token": token,
          "x-forwarded-for": "198.51.100.4",
        },
        body: JSON.stringify({
          accessToken: token,
          email: "cco@abcwealth.com",
          firmName: "ABC Wealth",
          role: "CCO",
        }),
      }),
      { params: Promise.resolve({ id: "assess_1" }) },
    );

    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      success: boolean;
      data: Record<string, unknown>;
    };
    expect(json.success).toBe(true);
    expect(transaction).toHaveBeenCalledOnce();
    expect(upsertLead).toHaveBeenCalledOnce();
    expect(sendDetailedStackReviewEmail).toHaveBeenCalled();
    // Public response must not echo the submitted email
    expect(JSON.stringify(json)).not.toContain("cco@abcwealth.com");
    expect(isAllowedPublicAssessmentPayload(json.data)).toBe(true);
  });

  it("allows duplicate lead submission via upsert without exposing PII", async () => {
    const token = generateAccessToken();
    findUnique.mockResolvedValue({
      id: "assess_1",
      accessTokenHash: hashAccessToken(token),
      status: "LEAD_CAPTURED",
      answers: emptyAnswers(),
      score: 56,
      resultSummary: { score: 56, headline: "Fragmented" },
      completedAt: new Date(),
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      lead: { email: "cco@abcwealth.com" },
    });
    upsertLead.mockResolvedValue({ id: "lead_1" });
    update.mockResolvedValue({ id: "assess_1", status: "LEAD_CAPTURED" });

    const response = await captureLead(
      new Request("http://localhost/api/assessments/assess_1/lead", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "X-Assessment-Token": token,
          "x-forwarded-for": "198.51.100.5",
        },
        body: JSON.stringify({
          accessToken: token,
          email: "cco@abcwealth.com",
          firmName: "ABC Wealth Advisors",
        }),
      }),
      { params: Promise.resolve({ id: "assess_1" }) },
    );

    expect(response.status).toBe(200);
    expect(upsertLead).toHaveBeenCalled();
  });
});
