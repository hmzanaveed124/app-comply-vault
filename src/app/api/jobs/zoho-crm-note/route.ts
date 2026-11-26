/**
 * QStash — Epic 3.0a: create Zoho CRM Note on Contact when audit content is ready
 */

import { db } from "~/server/db";
import { signedJob } from "~/server/signed-job";
import { z } from "zod";
import { getValidZohoCrmContext } from "~/server/integrations/zoho/crm-token";
import {
  findContactIdByFullName,
  createContactNote,
} from "~/server/integrations/zoho/crm-api";
import { buildZohoCrmNoteContent } from "~/server/integrations/zoho/build-note-content";
import type { ExtractionData } from "~/server/extraction/types";
import { env } from "~/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  meetingId: z.string(),
  workspaceId: z.string(),
});

async function handler(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Validation failed" }, { status: 400 });
  }
  const { meetingId, workspaceId } = parsed.data;

  const meeting = await db.meeting.findFirst({
    where: { id: meetingId, workspaceId },
  });
  if (!meeting || meeting.status !== "DRAFT_READY") {
    return Response.json(
      { error: "Meeting not in draft-ready state" },
      { status: 400 },
    );
  }
  if (meeting.zohoCrmNotePostedAt) {
    return Response.json({ ok: true, skipped: "note_already_posted" });
  }

  const zoho = await getValidZohoCrmContext(workspaceId);
  if (!zoho) {
    const row = await db.integrationConfig.findUnique({
      where: { workspaceId_provider: { workspaceId, provider: "ZOHO_CRM" } },
    });
    await logFailure(
      workspaceId,
      meetingId,
      row?.id ?? null,
      "Zoho CRM not connected or token failed",
    );
    return Response.json({ error: "Zoho not available" }, { status: 500 });
  }

  const extraction = meeting.extraction as ExtractionData | null;
  if (!extraction) {
    return Response.json({ error: "No extraction" }, { status: 400 });
  }

  const flags = await db.flag.findMany({
    where: { meetingId },
    select: { type: true, severity: true, status: true },
  });

  let contactId = meeting.zohoCrmContactId;
  if (!contactId) {
    const found = await findContactIdByFullName({
      apiDomain: zoho.apiDomain,
      accessToken: zoho.accessToken,
      fullName: meeting.clientName,
    });
    if ("error" in found) {
      const reason =
        found.error === "none"
          ? "no_contact_for_full_name"
          : "multiple_contacts_for_full_name";
      await logFailure(
        workspaceId,
        meetingId,
        zoho.integrationConfigId,
        reason,
      );
      return Response.json({ error: reason }, { status: 422 });
    }
    contactId = found.contactId;
  }

  const baseUrl = env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const meetUrl = baseUrl
    ? `${baseUrl}/meetings/${meetingId}`
    : `/meetings/${meetingId}`;

  const noteContent = buildZohoCrmNoteContent({
    meetUrl,
    clientLabel: meeting.clientName,
    meetingType: meeting.meetingType,
    meetingDateIso: meeting.meetingDate.toISOString(),
    extraction,
    flags,
  });

  const title = `ComplyVault — ${meeting.meetingType} (${meeting.meetingDate.toLocaleDateString()})`;

  try {
    const externalId = await createContactNote({
      apiDomain: zoho.apiDomain,
      accessToken: zoho.accessToken,
      contactId,
      title,
      content: noteContent,
    });

    await db.meeting.update({
      where: { id: meetingId },
      data: { zohoCrmNotePostedAt: new Date() },
    });
    await db.integrationConfig.update({
      where: { id: zoho.integrationConfigId },
      data: {
        lastSyncAt: new Date(),
        lastErrorAt: null,
        lastErrorMessage: null,
      },
    });
    await db.integrationSyncLog.create({
      data: {
        integrationConfigId: zoho.integrationConfigId,
        meetingId,
        provider: "ZOHO_CRM",
        action: "zoho_crm_note",
        status: "success",
        externalId,
        attempts: 1,
        completedAt: new Date(),
      },
    });
    return Response.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "note_failed";
    await logFailure(workspaceId, meetingId, zoho.integrationConfigId, msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}

async function logFailure(
  _workspaceId: string,
  meetingId: string,
  integrationConfigId: string | null,
  errorMessage: string,
): Promise<void> {
  if (integrationConfigId) {
    await db.integrationConfig.update({
      where: { id: integrationConfigId },
      data: { lastErrorAt: new Date(), lastErrorMessage: errorMessage },
    });
  }
  await db.integrationSyncLog.create({
    data: {
      integrationConfigId,
      meetingId,
      provider: "ZOHO_CRM",
      action: "zoho_crm_note",
      status: "failed",
      attempts: 1,
      errorMessage,
      completedAt: new Date(),
    },
  });
}

export const POST = signedJob(handler);
