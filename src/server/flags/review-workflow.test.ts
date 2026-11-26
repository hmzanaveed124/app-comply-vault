import { beforeEach, describe, expect, it, vi } from "vitest";
const h = vi.hoisted(() => ({
  role: "OWNER_CCO",
  flag: {} as Record<string, any>,
  updates: vi.fn(),
  audit: vi.fn(),
  verify: vi.fn(),
  resolutionUpdate: vi.fn(),
}));
vi.mock("~/server/auth", () => ({
  auth: async () => ({
    user: { id: "cco", workspaceId: "firm", role: h.role },
  }),
}));
vi.mock("~/server/auth/guards", () => ({
  requireAppAccess: async () => ({
    ok: true,
    workspaceId: "firm",
    session: { user: { id: "cco", workspaceId: "firm", role: h.role } },
  }),
}));
vi.mock("~/server/db", () => {
  const tx = {
    flag: { update: h.updates },
    auditEvent: { create: h.audit },
    resolutionRecord: { update: h.resolutionUpdate },
    verification: { create: h.verify },
  };
  return {
    db: {
      ...tx,
      userWorkspace: { findFirst: async () => ({ role: h.role }) },
      flag: { ...tx.flag, findFirst: async () => h.flag },
      meeting: {
        findFirst: async () => ({ id: "meeting", status: "ADVISOR_CERTIFIED" }),
      },
      $transaction: async (f: (tx: unknown) => unknown) => f(tx),
    },
  };
});
import { POST as remediate } from "~/app/api/flags/[id]/remediation/route";
import { POST as triage } from "~/app/api/flags/[id]/cm-triage/route";
const params = { params: Promise.resolve({ id: "flag" }) };
const request = (data: unknown) =>
  new Request("https://app.example/api/flags/flag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
beforeEach(() => {
  vi.clearAllMocks();
  h.role = "OWNER_CCO";
  h.flag = {
    id: "flag",
    workspaceId: "firm",
    meetingId: "meeting",
    sourceType: "MEETING",
    status: "OPEN",
    severity: "WARN",
    cmDisposition: "NONE",
    resolutionRecord: null,
  };
  h.updates.mockImplementation(async (args) => ({ id: "flag", ...args.data }));
});
describe("evidence-based review", () => {
  it("rejects the original promise-to-email closure", async () => {
    const res = await triage(
      request({
        action: "resolve",
        resolutionNote: "We will communicate this in a separate email",
        closureBasis: "EVIDENCE_SUFFICIENT",
        evidenceReference: "Meeting timestamp 00:14",
        noFurtherActionRequired: true,
      }),
      params,
    );
    expect(res.status).toBe(422);
    expect(h.updates).not.toHaveBeenCalled();
  });
  it("requires an explicit decision and evidence reference for no finding", async () => {
    const res = await triage(
      request({
        action: "resolve",
        resolutionNote:
          "This is a sufficiently long rationale but contains no evidence reference",
      }),
      params,
    );
    expect(res.status).toBe(400);
    expect(h.updates).not.toHaveBeenCalled();
  });
  it("records the evidence reference and decision basis on an explicit no-finding decision", async () => {
    const res = await triage(
      request({
        action: "resolve",
        resolutionNote:
          "The reviewed transcript concerns a general education discussion with no client recommendation.",
        closureBasis: "NOT_APPLICABLE",
        evidenceReference: "Transcript 00:14–01:20, version 1",
        noFurtherActionRequired: true,
      }),
      params,
    );
    expect(res.status).toBe(200);
    expect(h.audit).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          metadata: expect.objectContaining({
            closureBasis: "NOT_APPLICABLE",
            evidenceReference: "Transcript 00:14–01:20, version 1",
          }),
        }),
      }),
    );
  });
  it("does not auto-close non-critical remediation", async () => {
    h.flag.status = "IN_REMEDIATION";
    h.flag.resolutionRecord = {
      id: "resolution",
      resolutionType: "FOLLOW_UP_REQUIRED",
      tasks: [{ required: true, status: "COMPLETED" }],
      evidence: [
        {
          type: "OUTREACH_PROOF",
          url: "https://archive.example/communication/1",
        },
      ],
      metadata: { requireAcknowledgement: false },
    };
    const res = await remediate(
      request({ action: "SUBMIT_FOR_VERIFICATION" }),
      params,
    );
    expect(res.status).toBe(200);
    expect(h.updates).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: "PENDING_VERIFICATION" } }),
    );
    expect(h.verify).not.toHaveBeenCalled();
  });
  it("refuses submission with uncompleted required actions", async () => {
    h.flag.status = "IN_REMEDIATION";
    h.flag.resolutionRecord = {
      tasks: [{ required: true, status: "OPEN" }],
      evidence: [],
    };
    expect(
      (await remediate(request({ action: "SUBMIT_FOR_VERIFICATION" }), params))
        .status,
    ).toBe(400);
    expect(h.updates).not.toHaveBeenCalled();
  });
  it("requires a verification rationale", async () => {
    expect(
      (await remediate(request({ action: "APPROVE" }), params)).status,
    ).toBe(400);
  });
  it("does not approve legacy queued remediation without evidence", async () => {
    h.flag.status = "PENDING_VERIFICATION";
    h.flag.resolutionRecord = { id: "resolution", tasks: [], evidence: [] };
    expect(
      (
        await remediate(
          request({
            action: "APPROVE",
            note: "I reviewed the action and its completion evidence.",
          }),
          params,
        )
      ).status,
    ).toBe(400);
    expect(h.verify).not.toHaveBeenCalled();
  });
  it("rejects an evidence label without a retrievable artefact", async () => {
    const res = await remediate(
      request({
        action: "ADD_EVIDENCE",
        evidence: { type: "OUTREACH_PROOF", label: "Email sent" },
      }),
      params,
    );
    expect(res.status).toBe(400);
    expect(h.updates).not.toHaveBeenCalled();
  });
  it("preserves finalized meeting dispositions", async () => {
    h.flag.meeting = { status: "FINALIZED" };
    expect(
      (await remediate(request({ action: "SUBMIT_FOR_VERIFICATION" }), params))
        .status,
    ).toBe(409);
  });
  it("does not allow advisers to make supervisory decisions", async () => {
    h.role = "ADVISOR";
    expect(
      (await remediate(request({ action: "SUBMIT_FOR_VERIFICATION" }), params))
        .status,
    ).toBe(403);
  });
});
