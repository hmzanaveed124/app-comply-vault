import { describe, expect, it } from "vitest";
import { buildWorkspaceJourney, type JourneyInput } from "./journey";
const base: JourneyInput = {
  workspaceId: "firm-a",
  workspaceName: "Example firm",
  userId: "user-a",
  role: "OWNER_CCO",
  dismissed: false,
  mediaReady: true,
  meetingCount: 0,
  reviewedCount: 0,
  finishedCount: 0,
  connected: false,
  nextRecord: null,
  processingRecord: null,
};
describe("workspace journey priorities", () => {
  it("gates the first upload on the existing media policy", () => {
    const result = buildWorkspaceJourney({ ...base, mediaReady: false });
    expect(result.next.href).toBe("/settings/media-posture");
    expect(result.steps.find((step) => step.id === "meeting")?.href).toBeNull();
    expect(result.completed).toBe(0);
  });
  it("does not offer owner settings to an advisor or compliance manager", () => {
    for (const role of ["ADVISOR", "MEMBER"] as const) {
      const result = buildWorkspaceJourney({
        ...base,
        role,
        mediaReady: false,
      });
      expect(result.next.kind).toBe("waiting");
      expect(result.next.href).toBeNull();
      expect(result.steps[0]?.href).toBeNull();
    }
  });
  it("makes one recording the first outcome without requiring an integration", () => {
    expect(buildWorkspaceJourney(base).next).toMatchObject({
      kind: "upload",
      href: "/upload",
    });
    expect(buildWorkspaceJourney({ ...base, connected: true }).next.href).toBe(
      "/upload",
    );
  });
  it("continues an actual actionable record ahead of uploading more", () => {
    const result = buildWorkspaceJourney({
      ...base,
      meetingCount: 1,
      nextRecord: { id: "meeting-1", status: "CM_REVIEWED" },
    });
    expect(result.next).toMatchObject({
      kind: "review",
      title: "Review for sign-off",
      href: "/meetings/meeting-1",
    });
    expect(result.steps.find((step) => step.id === "finish")?.complete).toBe(
      false,
    );
  });
  it("distinguishes processing failures from a recording still processing", () => {
    const result = buildWorkspaceJourney({
      ...base,
      meetingCount: 1,
      processingRecord: { id: "record-a", failed: true },
    });
    expect(result.next.title).toContain("attention");
    expect(result.next.description).not.toContain("being prepared");
    expect(result.next.href).toBe("/meetings/record-a");
  });
  it("does not equate no available review with a completed review", () => {
    const result = buildWorkspaceJourney({
      ...base,
      role: "MEMBER",
      meetingCount: 2,
    });
    expect(result.next.kind).toBe("ready");
    expect(result.next.description).toContain("another reviewer");
    expect(result.steps.find((step) => step.id === "finish")?.complete).toBe(
      false,
    );
  });
  it("keeps the next action even after a user hides setup guidance", () => {
    expect(buildWorkspaceJourney({ ...base, dismissed: true }).next.href).toBe(
      "/upload",
    );
  });
  it("derives completed progress only from recorded work", () => {
    const result = buildWorkspaceJourney({
      ...base,
      meetingCount: 1,
      reviewedCount: 1,
      finishedCount: 1,
    });
    expect(result.completed).toBe(4);
    expect(result.steps.every((step) => step.complete)).toBe(true);
    expect(result.next.href).toBe("/interaction-log");
  });
  it("keeps existing correspondence useful before a first meeting", () => {
    const result = buildWorkspaceJourney({ ...base, hasCorrespondence: true });
    expect(result.next.href).toBe("/communications");
    expect(result.steps.find((step) => step.id === "meeting")?.complete).toBe(
      false,
    );
  });
  it("allows a pending review even when recording ingestion needs setup", () => {
    const result = buildWorkspaceJourney({
      ...base,
      mediaReady: false,
      meetingCount: 1,
      nextRecord: { id: "existing-record", status: "DRAFT_READY" },
    });
    expect(result.next.kind).toBe("review");
    expect(result.steps.find((step) => step.id === "meeting")?.href).toBeNull();
  });
});
