import { requireAppAccess } from "~/server/auth/guards";
import { db } from "~/server/db";
import {
  hasPendingCcoEscalations,
  isCcoActor,
  meetingAllowsCcoSignOff,
} from "~/lib/meeting-workflow";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const access = await requireAppAccess();
    if (!access.ok) {
      return Response.json(
        { success: false, error: access.error },
        { status: access.status },
      );
    }
    const { session, workspaceId } = access;

    if (!isCcoActor(session.user.role)) {
      return Response.json(
        {
          success: false,
          error:
            "Only the CCO (workspace owner) can sign off compliance review",
        },
        { status: 403 },
      );
    }

    const { id } = await params;
    const meeting = await db.meeting.findFirst({
      where: { id, workspaceId },
      include: { flags: true },
    });

    if (!meeting) {
      return Response.json(
        { success: false, error: "Meeting not found" },
        { status: 404 },
      );
    }

    if (!meetingAllowsCcoSignOff(meeting.status)) {
      return Response.json(
        {
          success: false,
          error: `Meeting must be CM_REVIEWED. Current: ${meeting.status}`,
        },
        { status: 400 },
      );
    }

    if (
      meeting.flags.some(
        (flag) => !["CLOSED", "CLOSED_ACCEPTED_RISK"].includes(flag.status),
      )
    ) {
      return Response.json(
        {
          success: false,
          error:
            "Complete remediation and verification, or document a no-finding / accepted-risk decision for every concern before CCO sign-off",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const updated = await db.$transaction(async (tx) => {
      const m = await tx.meeting.update({
        where: { id },
        data: {
          status: "CCO_SIGNED_OFF",
          ccoSignedOffAt: now,
          ccoSignedOffByUserId: session.user.id,
        },
      });

      await tx.auditEvent.create({
        data: {
          workspaceId,
          userId: session.user.id,
          action: "CCO_SIGNED_OFF",
          resourceType: "meeting",
          resourceId: meeting.id,
          meetingId: meeting.id,
          metadata: {
            signedAt: now.toISOString(),
            attestation:
              "Regulatory review complete (does not attest to meeting record accuracy — advisor certified).",
          },
        },
      });

      const nextVersion =
        ((
          await tx.version.findFirst({
            where: { meetingId: meeting.id },
            orderBy: { version: "desc" },
          })
        )?.version ?? 0) + 1;

      await tx.version.create({
        data: {
          meetingId: meeting.id,
          version: nextVersion,
          editorId: session.user.id,
          whatChanged: "workflow: CCO signed off compliance review",
          reason: "CCO_SIGNED_OFF",
        },
      });

      return m;
    });

    return Response.json({
      success: true,
      data: {
        meeting: {
          id: updated.id,
          status: updated.status,
          ccoSignedOffAt: updated.ccoSignedOffAt?.toISOString() ?? null,
        },
      },
    });
  } catch (e) {
    console.error("cco-signoff:", e);
    return Response.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
