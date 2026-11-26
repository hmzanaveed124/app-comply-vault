import { requireAppAccess } from "~/server/auth/guards";
import { db } from "~/server/db";
import { z } from "zod";
import {
  isComplianceActor,
  meetingAllowsCmTriage,
} from "~/lib/meeting-workflow";
import { isEmailIntelligenceEnabled } from "~/lib/feature-flags";

export const runtime = "nodejs";

const triageSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("resolve"),
    resolutionNote: z
      .string()
      .trim()
      .min(
        30,
        "Explain why no further action is required (minimum 30 characters)",
      ),
    closureBasis: z.enum([
      "FALSE_POSITIVE",
      "NOT_APPLICABLE",
      "EVIDENCE_SUFFICIENT",
    ]),
    evidenceReference: z.string().trim().min(10),
    noFurtherActionRequired: z.literal(true),
    /** Optional remediation evidence link (meeting or communication id). */
    linkedEvidence: z
      .object({
        type: z.enum(["MEETING", "COMMUNICATION", "THREAD"]),
        id: z.string().min(1),
      })
      .optional(),
  }),
  z.object({
    action: z.literal("note"),
    cmTriageNote: z.string().min(10, "Note required"),
  }),
  z.object({
    action: z.literal("escalate"),
    escalationReason: z.string().min(10, "Escalation reason required"),
  }),
]);

export async function POST(
  request: Request,
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

    if (!isComplianceActor(session.user.role)) {
      return Response.json(
        {
          success: false,
          error: "Only compliance manager or owner can triage flags",
        },
        { status: 403 },
      );
    }

    const { id: flagId } = await params;
    const body = triageSchema.parse(await request.json());

    const flag = await db.flag.findFirst({
      where: { id: flagId, workspaceId },
      include: { resolutionRecord: true },
    });

    if (!flag) {
      return Response.json(
        { success: false, error: "Flag not found" },
        { status: 404 },
      );
    }

    const sourceType = flag.sourceType ?? "MEETING";
    let meetingIdForAudit: string | null = flag.meetingId;

    if (sourceType === "EMAIL") {
      if (!isEmailIntelligenceEnabled()) {
        return Response.json(
          { success: false, error: "Feature disabled" },
          { status: 404 },
        );
      }
    } else {
      if (!flag.meetingId) {
        return Response.json(
          { success: false, error: "Flag missing meeting" },
          { status: 400 },
        );
      }
      const meeting = await db.meeting.findFirst({
        where: { id: flag.meetingId, workspaceId },
      });
      if (!meeting || !meetingAllowsCmTriage(meeting.status)) {
        return Response.json(
          {
            success: false,
            error:
              "CM triage is only allowed when the meeting is ADVISOR_CERTIFIED",
          },
          { status: 400 },
        );
      }
      meetingIdForAudit = meeting.id;
    }

    if (flag.cmDisposition !== "NONE" && flag.cmDisposition !== "NOTED") {
      return Response.json(
        { success: false, error: "This flag has already been triaged" },
        { status: 400 },
      );
    }

    if (flag.status !== "OPEN") {
      return Response.json(
        {
          success: false,
          error:
            "Only open flags can use quick triage; use remediation for in-progress items",
        },
        { status: 400 },
      );
    }

    if (flag.resolutionRecord) {
      return Response.json(
        {
          success: false,
          error:
            "Flag already has a remediation record; use remediation workflow",
        },
        { status: 400 },
      );
    }

    const now = new Date();

    if (body.action === "resolve") {
      if (
        /\b(will|plan to|going to|intend to|awaiting|pending|to be sent)\b/i.test(
          body.resolutionNote,
        )
      ) {
        return Response.json(
          {
            error:
              "Planned or pending actions cannot close a concern. Start remediation with an owner, due date and completion evidence.",
          },
          { status: 422 },
        );
      }
      if (body.linkedEvidence) {
        const linked =
          body.linkedEvidence.type === "MEETING"
            ? await db.meeting.findFirst({
                where: { id: body.linkedEvidence.id, workspaceId },
                select: { id: true },
              })
            : body.linkedEvidence.type === "COMMUNICATION"
              ? await db.communication.findFirst({
                  where: {
                    id: body.linkedEvidence.id,
                    thread: { workspaceId },
                  },
                  select: { id: true },
                })
              : await db.communicationThread.findFirst({
                  where: { id: body.linkedEvidence.id, workspaceId },
                  select: { id: true },
                });
        if (!linked)
          return Response.json(
            { error: "Evidence is not available in this firm" },
            { status: 404 },
          );
      }
      const updated = await db.$transaction(async (tx) => {
        const f = await tx.flag.update({
          where: { id: flagId },
          data: {
            status: "CLOSED",
            resolutionType: "DISMISSED_WITH_REASON",
            resolutionNote: body.resolutionNote,
            resolvedAt: now,
            resolvedByUserId: session.user.id,
            cmDisposition: "RESOLVED",
            cmTriagedAt: now,
            cmTriagedByUserId: session.user.id,
          },
        });
        await tx.auditEvent.create({
          data: {
            workspaceId,
            userId: session.user.id,
            action: "REMEDIATION_UPDATE",
            resourceType: "flag",
            resourceId: flag.id,
            meetingId: meetingIdForAudit,
            metadata: {
              cmTriage: "resolve",
              flagId: flag.id,
              sourceType,
              linkedEvidence: body.linkedEvidence ?? null,
              closureBasis: body.closureBasis,
              evidenceReference: body.evidenceReference,
              rationale: body.resolutionNote,
              noFurtherActionRequired: true,
            },
          },
        });
        return f;
      });
      return Response.json({
        success: true,
        data: { flag: { id: updated.id, status: updated.status } },
      });
    }

    if (body.action === "note") {
      const updated = await db.$transaction(async (tx) => {
        const f = await tx.flag.update({
          where: { id: flagId },
          data: {
            cmDisposition: "NOTED",
            cmTriageNote: body.cmTriageNote,
            cmTriagedAt: now,
            cmTriagedByUserId: session.user.id,
          },
        });
        await tx.auditEvent.create({
          data: {
            workspaceId,
            userId: session.user.id,
            action: "REMEDIATION_UPDATE",
            resourceType: "flag",
            resourceId: flag.id,
            meetingId: meetingIdForAudit,
            metadata: {
              cmTriage: "note",
              flagId: flag.id,
              sourceType,
              note: body.cmTriageNote,
            },
          },
        });
        return f;
      });
      return Response.json({
        success: true,
        data: { flag: { id: updated.id, status: updated.status } },
      });
    }

    // escalate
    const updated = await db.$transaction(async (tx) => {
      const rr = await tx.resolutionRecord.create({
        data: {
          workspaceId: flag.workspaceId,
          meetingId: flag.meetingId,
          flagId: flag.id,
          resolutionType: "DISMISSED_WITH_REASON",
          rationale: body.escalationReason,
          createdByUserId: session.user.id,
          submittedForVerificationAt: now,
          metadata: { cmEscalation: true, sourceType },
        },
      });

      const f = await tx.flag.update({
        where: { id: flagId },
        data: {
          status: "PENDING_VERIFICATION",
          cmDisposition: "ESCALATED",
          escalationReason: body.escalationReason,
          cmTriagedAt: now,
          cmTriagedByUserId: session.user.id,
        },
      });

      await tx.auditEvent.create({
        data: {
          workspaceId,
          userId: session.user.id,
          action: "REMEDIATION_START",
          resourceType: "flag",
          resourceId: flag.id,
          meetingId: meetingIdForAudit,
          metadata: {
            cmTriage: "escalate",
            escalationReason: body.escalationReason,
            flagId: flag.id,
            resolutionRecordId: rr.id,
            sourceType,
          },
        },
      });

      return f;
    });

    return Response.json({
      success: true,
      data: { flag: { id: updated.id, status: updated.status } },
    });
  } catch (e) {
    console.error("cm-triage:", e);
    if (e instanceof z.ZodError) {
      return Response.json(
        { success: false, error: "Invalid input", details: e.errors },
        { status: 400 },
      );
    }
    return Response.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
