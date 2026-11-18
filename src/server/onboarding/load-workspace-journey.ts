import type { PrismaClient, MeetingStatus } from "../../../generated/prisma";
import { activeUserWorkspaceWhere } from "~/lib/user-workspace-filters";
import { buildWorkspaceJourney } from "~/lib/onboarding/journey";

/** All progress comes from existing workspace records, never manually checked boxes. */
export async function loadWorkspaceJourney(
  db: PrismaClient,
  userId: string,
  workspaceId: string,
) {
  const membership = await db.userWorkspace.findFirst({
    where: { userId, workspaceId, ...activeUserWorkspaceWhere },
    select: {
      role: true,
      onboardingDismissedAt: true,
      workspace: { select: { name: true, mediaPosture: true } },
    },
  });
  if (!membership) return null;
  const role = membership.role;
  const available: MeetingStatus[] =
    role === "OWNER_CCO"
      ? ["DRAFT_READY", "ADVISOR_CERTIFIED", "CM_REVIEWED", "CCO_SIGNED_OFF"]
      : role === "MEMBER"
        ? ["ADVISOR_CERTIFIED"]
        : ["DRAFT_READY"];
  const base = { workspaceId, supersededById: null };
  const [
    meetingCount,
    reviewedCount,
    finishedCount,
    connectedCount,
    nextRecord,
    processingRecord,
    correspondenceCount,
  ] = await Promise.all([
    db.meeting.count({ where: base }),
    db.meeting.count({
      where: {
        ...base,
        ...(role === "ADVISOR"
          ? { advisorCertifiedByUserId: userId }
          : role === "MEMBER"
            ? { cmReviewedByUserId: userId }
            : {
                status: {
                  in: [
                    "ADVISOR_CERTIFIED",
                    "CM_REVIEWED",
                    "CCO_SIGNED_OFF",
                    "FINALIZED",
                  ],
                },
              }),
      },
    }),
    role === "OWNER_CCO"
      ? db.recordSeal.count({ where: { workspaceId } })
      : db.meeting.count({
          where: {
            ...base,
            ...(role === "ADVISOR"
              ? { advisorCertifiedByUserId: userId }
              : { cmReviewedByUserId: userId }),
          },
        }),
    db.integrationCredential.count({
      where: { workspaceId, status: "CONNECTED" },
    }),
    db.meeting.findFirst({
      where: { ...base, status: { in: available } },
      orderBy: [{ status: "desc" }, { meetingDate: "asc" }],
      select: { id: true, status: true },
    }),
    db.meeting.findFirst({
      where: { ...base, status: { in: ["UPLOADING", "PROCESSING"] } },
      orderBy: { createdAt: "asc" },
      select: { id: true, heldReason: true },
    }),
    db.communicationThread.count({ where: { workspaceId } }),
  ]);
  return buildWorkspaceJourney({
    workspaceId,
    workspaceName: membership.workspace.name,
    userId,
    role,
    dismissed: membership.onboardingDismissedAt !== null,
    mediaReady: membership.workspace.mediaPosture !== null,
    meetingCount,
    hasCorrespondence: correspondenceCount > 0,
    reviewedCount,
    finishedCount,
    connected: connectedCount > 0,
    nextRecord,
    processingRecord: processingRecord
      ? {
          id: processingRecord.id,
          failed: processingRecord.heldReason === "PROCESSING_FAILED",
        }
      : null,
  });
}
