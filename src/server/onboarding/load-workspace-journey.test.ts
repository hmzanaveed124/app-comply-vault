import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../../generated/prisma";
import { loadWorkspaceJourney } from "./load-workspace-journey";
function fixture(role: "OWNER_CCO" | "MEMBER" | "ADVISOR" = "OWNER_CCO") {
  const db = {
    userWorkspace: {
      findFirst: vi.fn().mockResolvedValue({
        role,
        onboardingDismissedAt: null,
        workspace: { name: "Firm A", mediaPosture: "RETAIN" },
      }),
    },
    meeting: {
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    recordSeal: { count: vi.fn().mockResolvedValue(0) },
    communicationThread: { count: vi.fn().mockResolvedValue(0) },
    integrationCredential: { count: vi.fn().mockResolvedValue(0) },
  };
  return { db, client: db as unknown as PrismaClient };
}
describe("workspace-scoped onboarding facts", () => {
  it("does not load any records without an active membership", async () => {
    const { db, client } = fixture();
    db.userWorkspace.findFirst.mockResolvedValueOnce(null);
    expect(await loadWorkspaceJourney(client, "user-a", "firm-a")).toBeNull();
    expect(db.meeting.count).not.toHaveBeenCalled();
    expect(db.meeting.findFirst).not.toHaveBeenCalled();
    expect(db.userWorkspace.findFirst.mock.calls[0]?.[0].where).toMatchObject({
      workspaceId: "firm-a",
      userId: "user-a",
      removedAt: null,
    });
  });
  it("uses lifetime workspace facts rather than the dashboard's date filter", async () => {
    const { db, client } = fixture();
    await loadWorkspaceJourney(client, "user-a", "firm-a");
    expect(db.meeting.count.mock.calls[0]?.[0].where).toEqual({
      workspaceId: "firm-a",
      supersededById: null,
    });
    expect(db.recordSeal.count).toHaveBeenCalledWith({
      where: { workspaceId: "firm-a" },
    });
  });
  it.each([
    ["ADVISOR", ["DRAFT_READY"]],
    ["MEMBER", ["ADVISOR_CERTIFIED"]],
    [
      "OWNER_CCO",
      ["DRAFT_READY", "ADVISOR_CERTIFIED", "CM_REVIEWED", "CCO_SIGNED_OFF"],
    ],
  ] as const)(
    "only suggests a review stage available to %s",
    async (role, statuses) => {
      const { db, client } = fixture(role);
      await loadWorkspaceJourney(client, "user-a", "firm-a");
      expect(db.meeting.findFirst.mock.calls[0]?.[0].where).toEqual({
        workspaceId: "firm-a",
        supersededById: null,
        status: { in: [...statuses] },
      });
    },
  );
});
