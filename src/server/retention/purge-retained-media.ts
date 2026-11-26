/**
 * RETAIN → DISCARD follow-up: a separate, explicitly audited purge action.
 *
 * Switching posture to DISCARD never deletes anything by itself — that would
 * be silent retroactive deletion. But leaving media in place under a policy
 * that says the firm does not retain it is an inconsistency an examiner pulls
 * on. This action is offered to the CCO after the switch, as its own audited
 * step, never bundled into the posture change.
 *
 * Every deletion goes through the CV-TR-07 readback gate: hash the persisted
 * transcript, re-read, recompute, compare, then delete. Meetings without a
 * verified transcript are skipped and reported — their media is the only
 * record, and purging it would destroy evidence.
 */

import type { WorkspaceRole } from "../../../generated/prisma";
import { db } from "~/server/db";
import { secureTranscript } from "./secure-transcript";

export type PurgeSummary = {
  eligible: number;
  purged: number;
  skippedNoTranscript: number;
  failed: number;
};

export type PurgeResult =
  | { success: true; data: PurgeSummary }
  | { success: false; status: number; error: string };

/** Meetings still holding media that a DISCARD-posture purge would touch. */
export async function countRetainedMedia(workspaceId: string): Promise<number> {
  return db.meeting.count({
    where: { workspaceId, fileUrl: { not: null } },
  });
}

export async function purgeRetainedMedia(args: {
  workspaceId: string;
  userId: string;
  actorRole: WorkspaceRole | null | undefined;
}): Promise<PurgeResult> {
  if (args.actorRole !== "OWNER_CCO") {
    return {
      success: false,
      status: 403,
      error: "Only the workspace CCO can purge retained media.",
    };
  }

  const workspace = await db.workspace.findUnique({
    where: { id: args.workspaceId },
    select: { mediaPosture: true, legalHold: true },
  });
  if (!workspace) {
    return { success: false, status: 404, error: "Workspace not found" };
  }
  if (workspace.legalHold) {
    return {
      success: false,
      status: 409,
      error: "Legal hold is active. Source media cannot be purged.",
    };
  }
  if (workspace.mediaPosture !== "DISCARD") {
    return {
      success: false,
      status: 409,
      error: "Purge is only available while the posture is DISCARD.",
    };
  }

  const meetings = await db.meeting.findMany({
    where: { workspaceId: args.workspaceId, fileUrl: { not: null } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  const summary: PurgeSummary = {
    eligible: meetings.length,
    purged: 0,
    skippedNoTranscript: 0,
    failed: 0,
  };

  for (const meeting of meetings) {
    // secureTranscript runs the full hash + readback gate and discards under
    // DISCARD posture; the actor is the CCO who requested the purge.
    const result = await secureTranscript({
      meetingId: meeting.id,
      workspaceId: args.workspaceId,
      actorUserId: args.userId,
    });

    if (result.secured && result.mediaDiscarded) {
      summary.purged += 1;
    } else if (!result.secured && result.reason === "no_transcript") {
      summary.skippedNoTranscript += 1;
    } else {
      summary.failed += 1;
    }
  }

  await db.auditEvent.create({
    data: {
      workspaceId: args.workspaceId,
      userId: args.userId,
      action: "MEDIA_DISCARDED",
      resourceType: "workspace",
      resourceId: args.workspaceId,
      metadata: {
        action: "retained_media_purge",
        eligible: summary.eligible,
        purged: summary.purged,
        skippedNoTranscript: summary.skippedNoTranscript,
        failed: summary.failed,
        note: "Explicit CCO-initiated purge of media retained before the DISCARD posture took effect.",
      },
    },
  });

  return { success: true, data: summary };
}
