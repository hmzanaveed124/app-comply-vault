/**
 * CV-TR-07 — canonical transcript hash + readback-gated media discard.
 *
 * The hash is computed over `canonicalTranscriptText`, the same serialisation
 * the audit pack renders as 04_Transcript.txt. One serialisation, one hash.
 *
 * Media is only ever deleted after a readback: the persisted transcript is
 * re-read from the database, re-hashed, and compared to the stored hash.
 * A write that did not land can therefore never cost the source media.
 */

import { createHash } from "crypto";
import { db } from "~/server/db";
import { canonicalTranscriptText } from "~/server/export/txt";
import type { TranscriptSegment } from "~/server/transcription/types";

export function hashCanonicalTranscript(segments: TranscriptSegment[]): string {
  return createHash("sha256")
    .update(Buffer.from(canonicalTranscriptText(segments), "utf-8"))
    .digest("hex");
}

function extractSegments(transcript: unknown): TranscriptSegment[] | null {
  if (!transcript || typeof transcript !== "object") return null;
  const value = transcript as { error?: unknown; segments?: unknown };
  if (value.error) return null;
  if (!Array.isArray(value.segments) || value.segments.length === 0)
    return null;
  return value.segments as TranscriptSegment[];
}

export type SecureTranscriptResult =
  | { secured: true; transcriptSha256: string; mediaDiscarded: boolean }
  | {
      secured: false;
      reason: "meeting_not_found" | "no_transcript" | "readback_mismatch";
    };

/**
 * Persist the canonical transcript hash for a meeting, then — only under
 * DISCARD posture, and only after the readback verifies — delete the source
 * media. Safe to call from every path that stores a transcript; on
 * transcript-only paths it just records the hash.
 */
export async function secureTranscript(args: {
  meetingId: string;
  workspaceId: string;
  /** Actor recorded on the discard audit event; defaults to "system". */
  actorUserId?: string;
}): Promise<SecureTranscriptResult> {
  const { meetingId, workspaceId } = args;

  // Hash what is actually persisted, never an in-memory copy.
  const meeting = await db.meeting.findFirst({
    where: { id: meetingId, workspaceId },
    select: { id: true, transcript: true },
  });
  if (!meeting) return { secured: false, reason: "meeting_not_found" };

  const segments = extractSegments(meeting.transcript);
  if (!segments) return { secured: false, reason: "no_transcript" };

  const transcriptSha256 = hashCanonicalTranscript(segments);
  await db.meeting.update({
    where: { id: meetingId },
    data: { transcriptSha256 },
  });

  // Readback gate: re-read the persisted transcript and stored hash,
  // recompute, and require an exact match before any delete.
  const readback = await db.meeting.findFirst({
    where: { id: meetingId, workspaceId },
    select: {
      id: true,
      transcript: true,
      transcriptSha256: true,
      fileUrl: true,
    },
  });
  const readbackSegments = readback
    ? extractSegments(readback.transcript)
    : null;
  const recomputed = readbackSegments
    ? hashCanonicalTranscript(readbackSegments)
    : null;

  if (
    !readback ||
    readback.transcriptSha256 !== transcriptSha256 ||
    recomputed !== transcriptSha256
  ) {
    await db.auditEvent.create({
      data: {
        workspaceId,
        userId: args.actorUserId ?? "system",
        action: "MEDIA_DISCARDED",
        resourceType: "meeting",
        resourceId: meetingId,
        meetingId,
        metadata: {
          action: "media_discard_readback_failed",
          expectedSha256: transcriptSha256,
          recomputedSha256: recomputed,
          note: "Transcript readback did not match the stored hash. Source media was NOT deleted.",
        },
      },
    });
    return { secured: false, reason: "readback_mismatch" };
  }

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { mediaPosture: true, legalHold: true },
  });

  if (
    workspace?.legalHold ||
    workspace?.mediaPosture !== "DISCARD" ||
    !readback.fileUrl
  ) {
    return { secured: true, transcriptSha256, mediaDiscarded: false };
  }

  const discarded = await discardMediaObject({
    workspaceId,
    meetingId,
    fileUrl: readback.fileUrl,
    transcriptSha256,
    actorUserId: args.actorUserId,
    context: "post_transcription",
  });

  return { secured: true, transcriptSha256, mediaDiscarded: discarded };
}

/**
 * Delete a verified meeting's source media object and record the audit trail.
 * Callers must have passed the readback gate first. Returns false (media
 * retained) if the storage delete fails — never leaves the record claiming a
 * discard that did not happen.
 */
export async function discardMediaObject(args: {
  workspaceId: string;
  meetingId: string;
  fileUrl: string;
  transcriptSha256: string;
  actorUserId?: string;
  context: "post_transcription" | "retained_media_purge";
}): Promise<boolean> {
  // Serialize deletion against changes to legalHold on the same workspace row.
  // A hold committed before this lock is acquired always prevents disposal.
  return db.$transaction(
    async (tx) => {
      const rows = await tx.$queryRaw<
        Array<{ legalHold: boolean; mediaPosture: string | null }>
      >`
      SELECT "legalHold", "mediaPosture" FROM "Workspace" WHERE id = ${args.workspaceId} FOR UPDATE
    `;
      const workspace = rows[0];
      const meeting = await tx.meeting.findFirst({
        where: { id: args.meetingId, workspaceId: args.workspaceId },
        select: { fileUrl: true },
      });
      if (
        !workspace ||
        workspace.legalHold ||
        workspace.mediaPosture !== "DISCARD" ||
        meeting?.fileUrl !== args.fileUrl
      )
        return false;
      const { deleteFile } = await import("~/server/storage");
      const discardedAt = new Date();
      try {
        await deleteFile(args.fileUrl);
      } catch (error) {
        await tx.auditEvent.create({
          data: {
            workspaceId: args.workspaceId,
            userId: args.actorUserId ?? "system",
            action: "MEDIA_DISCARDED",
            resourceType: "meeting",
            resourceId: args.meetingId,
            meetingId: args.meetingId,
            metadata: {
              action: "media_discard_failed",
              objectUri: args.fileUrl,
              error: error instanceof Error ? error.message : "Unknown error",
              note: "Storage deletion failed; media remains pending disposal.",
            },
          },
        });
        return false;
      }
      await tx.meeting.update({
        where: { id: args.meetingId },
        data: { fileUrl: null, mediaDiscardedAt: discardedAt },
      });
      await tx.auditEvent.create({
        data: {
          workspaceId: args.workspaceId,
          userId: args.actorUserId ?? "system",
          action: "MEDIA_DISCARDED",
          resourceType: "meeting",
          resourceId: args.meetingId,
          meetingId: args.meetingId,
          metadata: {
            action: "media_discarded_by_policy",
            context: args.context,
            objectUri: args.fileUrl,
            transcriptSha256: args.transcriptSha256,
            discardedAt: discardedAt.toISOString(),
          },
        },
      });
      return true;
    },
    { timeout: 30000 },
  );
}
