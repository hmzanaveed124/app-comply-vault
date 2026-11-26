/**
 * POST /api/meetings/[id]/integration-sync/retry
 * Epic 6 Story 6.7: Manual retry for failed integration writes
 */

import { requireAppAccess } from "~/server/auth/guards";
import { db } from "~/server/db";
import {
  publishSharePointDepositJob,
  publishZohoCrmNoteJob,
} from "~/server/qstash";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await requireAppAccess();
  if (!access.ok) {
    return new Response(access.error, { status: access.status });
  }

  const { id: meetingId } = await params;

  const meeting = await db.meeting.findFirst({
    where: { id: meetingId, workspaceId: access.workspaceId },
  });

  if (!meeting) {
    return new Response("Meeting not found", { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { provider, action } = body as { provider?: string; action?: string };

  if (!provider || !action) {
    return new Response("provider and action required", { status: 400 });
  }

  const config = await db.integrationConfig.findFirst({
    where: { workspaceId: access.workspaceId, provider: provider as "ZOOM" },
  });

  if (!config) {
    return new Response("Integration not connected", { status: 400 });
  }

  if (!["OWNER_CCO", "MEMBER"].includes(access.session.user.role ?? ""))
    return new Response("Compliance access required", { status: 403 });
  const payload = { workspaceId: access.workspaceId, meetingId };
  let jobId: string | null;
  if (provider === "SHAREPOINT" && action === "sharepoint_upload") {
    if (meeting.status !== "FINALIZED")
      return new Response(
        "Finalize the meeting before depositing its evidence pack",
        { status: 409 },
      );
    jobId = await publishSharePointDepositJob(payload);
  } else if (provider === "ZOHO_CRM" && action === "zoho_crm_note") {
    if (meeting.status !== "DRAFT_READY")
      return new Response(
        "CRM draft notes can only be posted while the meeting is draft ready",
        { status: 409 },
      );
    jobId = await publishZohoCrmNoteJob(payload);
  } else {
    return new Response(
      "No supported delivery action for this provider. No delivery was attempted.",
      { status: 422 },
    );
  }

  if (!jobId) {
    return new Response("Queue not available", { status: 503 });
  }

  return Response.json({ success: true, jobId });
}
