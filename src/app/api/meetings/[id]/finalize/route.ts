import { requireAppAccess } from "~/server/auth/guards";
import { db } from "~/server/db";
import { z } from "zod";
import { sealAndFinalizeMeeting } from "~/server/seal/seal-meeting";

const finalizeSchema = z.object({
  finalizeReason: z.enum([
    "COMPLETE_REVIEW",
    "REQUIRED_CHANGES_ADDRESSED",
    "EXCEPTION_APPROVED",
    "OTHER",
  ]),
  finalizeNote: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await requireAppAccess();
    if (!access.ok) {
      return Response.json({ error: access.error }, { status: access.status });
    }
    const { session, workspaceId } = access;

    // Verify user has OWNER_CCO role
    if (session.user.role !== "OWNER_CCO") {
      return Response.json(
        {
          error: "Forbidden: Only workspace owners (CCO) can finalize meetings",
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { finalizeReason, finalizeNote } = finalizeSchema.parse(body);

    // Find the meeting
    const meeting = await db.meeting.findFirst({
      where: {
        id,
        workspaceId: workspaceId,
      },
    });

    if (!meeting) {
      return Response.json({ error: "Meeting not found" }, { status: 404 });
    }

    // Three-layer workflow: finalize only after CCO_SIGNED_OFF
    if (meeting.status !== "CCO_SIGNED_OFF") {
      // Idempotent: already sealed+finalized
      if (meeting.status === "FINALIZED") {
        const seal = await db.recordSeal.findUnique({
          where: {
            workspaceId_meetingId: { workspaceId, meetingId: id },
          },
        });
        if (seal) {
          return Response.json({
            success: true,
            meeting: {
              id: meeting.id,
              status: meeting.status,
              finalizedAt: meeting.finalizedAt,
              finalizedBy: meeting.finalizedBy,
              timeToFinalize: meeting.timeToFinalize,
              finalizeReason: meeting.finalizeReason,
              finalizeNote: meeting.finalizeNote,
            },
            seal: {
              sealId: seal.id,
              packHash: seal.packHash,
              sealedAt: seal.sealedAt.toISOString(),
              expiresAt: seal.expiresAt.toISOString(),
              storageUri: seal.storageUri,
            },
          });
        }
      }
      return Response.json(
        {
          error: `Meeting must be CCO_SIGNED_OFF to finalize. Current status: ${meeting.status}`,
        },
        { status: 400 },
      );
    }

    if (
      (finalizeReason === "OTHER" || finalizeReason === "EXCEPTION_APPROVED") &&
      !finalizeNote?.trim()
    ) {
      return Response.json(
        { error: "Finalize note is required for this reason" },
        { status: 400 },
      );
    }

    const outstandingFlags = await db.flag.findMany({
      where: {
        workspaceId,
        meetingId: meeting.id,
        status: { in: ["OPEN", "IN_REMEDIATION", "PENDING_VERIFICATION"] },
      },
      select: { id: true, status: true, type: true },
    });
    if (outstandingFlags.length) {
      return Response.json(
        {
          error:
            "Outstanding concerns require a documented disposition and completed verification before finalization. A finalize note does not close remediation.",
          flags: outstandingFlags,
        },
        { status: 409 },
      );
    }

    let timeToFinalize: number | null = null;
    const now = new Date();
    if (meeting.draftReadyAt) {
      const diffMs = now.getTime() - meeting.draftReadyAt.getTime();
      timeToFinalize = Math.floor(diffMs / 1000);
    }

    // CV-TR-01: seal to Object Lock before (and as the gate for) FINALIZED.
    const sealed = await sealAndFinalizeMeeting({
      meetingId: id,
      workspaceId,
      sealedByUserId: session.user.id,
      finalizeReason,
      finalizeNote,
      timeToFinalize,
      now,
    });

    if (!sealed.success) {
      return Response.json({ error: sealed.error }, { status: 500 });
    }

    const responseBody = {
      success: true,
      meeting: sealed.meeting,
      seal: {
        sealId: sealed.sealId,
        packHash: sealed.packHash,
        sealedAt: sealed.sealedAt,
        expiresAt: sealed.expiresAt,
        storageUri: sealed.storageUri,
        retentionMode: sealed.retentionMode,
      },
    };

    // CV-TR-18: deposit only after seal commits; failure must not un-finalize.
    const spCred = await db.integrationCredential.findUnique({
      where: {
        workspaceId_provider: { workspaceId, provider: "SHAREPOINT" },
      },
    });
    if (spCred?.status === "CONNECTED") {
      const { publishSharePointDepositJob } = await import("~/server/qstash");
      void publishSharePointDepositJob({ meetingId: id, workspaceId }).catch(
        (e) => {
          console.error("SharePoint deposit enqueue failed:", e);
        },
      );
    }

    return Response.json(responseBody);
  } catch (error) {
    console.error("Error finalizing meeting:", error);
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 },
      );
    }
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 },
    );
  }
}
