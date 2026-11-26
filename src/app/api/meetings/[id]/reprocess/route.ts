import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { z } from "zod";
import { extractFields } from "~/server/extraction";
import {
  toExtractionData,
  validateEvidenceCoverage,
} from "~/server/extraction/evidence";
import { detectMissingDisclosureFlags } from "~/server/flags";
import { getDisclosureProfileForWorkspace } from "~/server/firm-profile/get-disclosure-profile-for-workspace";
import { generateSearchableText } from "~/server/search/index";
import type { Transcript } from "~/server/transcription/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.workspaceId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find the meeting
    const meeting = await db.meeting.findFirst({
      where: {
        id,
        workspaceId: session.user.workspaceId,
      },
    });

    if (!meeting) {
      return Response.json({ error: "Meeting not found" }, { status: 404 });
    }

    const { assertSupersessionAllowsMutation } =
      await import("~/server/meetings/supersession-guards");
    const chainGate = assertSupersessionAllowsMutation(meeting);
    if (!chainGate.ok) {
      return Response.json(
        { error: chainGate.error },
        { status: chainGate.status },
      );
    }

    // Check if meeting is finalized (read-only) - return 403 Forbidden
    if (meeting.status === "FINALIZED") {
      return Response.json(
        { error: "Meeting is finalized and cannot be reprocessed" },
        { status: 403 },
      );
    }

    if (!["DRAFT", "DRAFT_READY", "PROCESSING"].includes(meeting.status)) {
      return Response.json(
        {
          error:
            "Certified records cannot be reprocessed. Create a superseding record to preserve review history.",
        },
        { status: 409 },
      );
    }

    // Check if meeting has a transcript
    const transcript = meeting.transcript as
      | {
          segments: Array<{
            startTime: number;
            endTime: number;
            text: string;
            speaker: string;
          }>;
        }
      | null
      | undefined;

    if (
      !transcript ||
      !transcript.segments ||
      transcript.segments.length === 0
    ) {
      return Response.json(
        {
          error:
            "Meeting does not have a transcript. Please wait for transcription to complete.",
        },
        { status: 400 },
      );
    }

    // Update status to PROCESSING
    await db.meeting.update({
      where: { id: meeting.id },
      data: { status: "PROCESSING" },
    });

    // Log reprocess start
    await db.auditEvent.create({
      data: {
        workspaceId: session.user.workspaceId,
        userId: session.user.id,
        action: "EDIT", // Using EDIT for reprocess action
        resourceType: "meeting",
        resourceId: meeting.id,
        metadata: {
          action: "reprocess_extraction_started",
        },
      },
    });

    try {
      // Convert transcript to Transcript format
      const transcriptForExtraction: Transcript = {
        segments: transcript.segments.map((seg) => ({
          startTime: seg.startTime,
          endTime: seg.endTime,
          speaker: seg.speaker || "Unknown",
          text: seg.text,
        })),
        duration: transcript.segments[transcript.segments.length - 1]?.endTime,
      };

      // Extract structured fields using LLM
      console.log(`Reprocessing extraction for meeting ${meeting.id}...`);
      const extractionResult = await extractFields(transcriptForExtraction);

      // Create evidence map and validate coverage
      const extractionData = toExtractionData(
        extractionResult,
        transcriptForExtraction,
      );
      const evidenceValidation = validateEvidenceCoverage(
        extractionData.evidenceMap,
      );

      if (!evidenceValidation.valid) {
        console.warn(
          `⚠️ Evidence coverage below 90% for meeting ${meeting.id}: ${(evidenceValidation.coverage * 100).toFixed(1)}% (${evidenceValidation.validClaims}/${evidenceValidation.totalClaims} valid claims)`,
        );
      } else {
        console.log(
          `✅ Evidence coverage: ${(evidenceValidation.coverage * 100).toFixed(1)}% (${evidenceValidation.validClaims}/${evidenceValidation.totalClaims} valid claims)`,
        );
      }

      // Generate searchable text for indexing (Story 7.4)
      const searchableText = generateSearchableText(
        transcriptForExtraction,
        extractionData,
      );

      // Store extraction data, searchable text, and update status to DRAFT_READY
      await db.meeting.update({
        where: { id: meeting.id },
        data: {
          extraction: extractionData as any, // Prisma JSON type
          searchableText, // Regenerate indexed text
          status: "DRAFT_READY",
          draftReadyAt: new Date(),
          zohoCrmNotePostedAt: null,
        },
      });

      // Generate missing disclosure flags (profile-aware)
      const disclosureProfile = await getDisclosureProfileForWorkspace(
        session.user.workspaceId!,
      );
      const missingDisclosureFlags = detectMissingDisclosureFlags(
        extractionData,
        {
          profile: disclosureProfile,
        },
      );
      const { persistDisclosureObservations } =
        await import("~/server/flags/persist-observations");
      await persistDisclosureObservations({
        workspaceId: session.user.workspaceId!,
        meetingId: meeting.id,
        flags: missingDisclosureFlags,
      });

      // Log extraction completion
      await db.auditEvent.create({
        data: {
          workspaceId: session.user.workspaceId,
          userId: session.user.id,
          action: "EDIT",
          resourceType: "meeting",
          resourceId: meeting.id,
          metadata: {
            action: "reprocess_extraction_complete",
            provider: extractionResult.provider,
            processingTime: extractionResult.processingTime,
            topicsCount: extractionData.topics.length,
            recommendationsCount: extractionData.recommendations.length,
            disclosuresCount: extractionData.disclosures.length,
            decisionsCount: extractionData.decisions.length,
            followUpsCount: extractionData.followUps.length,
            evidenceCoverage: evidenceValidation.coverage,
            evidenceValid: evidenceValidation.valid,
          },
        },
      });

      try {
        const { enqueueZohoCrmNoteIfConnected } =
          await import("~/server/integrations/zoho/enqueue-note");
        void enqueueZohoCrmNoteIfConnected(
          session.user.workspaceId!,
          meeting.id,
        );
      } catch {
        // non-blocking
      }

      return Response.json({
        success: true,
        meetingId: meeting.id,
        status: "DRAFT_READY",
        extraction: {
          topicsCount: extractionData.topics.length,
          recommendationsCount: extractionData.recommendations.length,
          disclosuresCount: extractionData.disclosures.length,
          decisionsCount: extractionData.decisions.length,
          followUpsCount: extractionData.followUps.length,
          evidenceCoverage: evidenceValidation.coverage,
        },
      });
    } catch (extractionError) {
      // Handle extraction errors
      const errorMessage =
        extractionError instanceof Error
          ? extractionError.message
          : "Unknown error";
      console.error(
        `Extraction failed for meeting ${meeting.id}:`,
        extractionError,
      );

      // Update meeting to show error (keep status as PROCESSING for now)
      await db.meeting.update({
        where: { id: meeting.id },
        data: {
          extraction: {
            error: true,
            message: errorMessage,
          },
        },
      });

      // Log extraction failure
      await db.auditEvent.create({
        data: {
          workspaceId: session.user.workspaceId,
          userId: session.user.id,
          action: "EDIT",
          resourceType: "meeting",
          resourceId: meeting.id,
          metadata: {
            action: "reprocess_extraction_failed",
            error: errorMessage,
          },
        },
      });

      return Response.json(
        {
          success: false,
          error: "Extraction failed",
          message: errorMessage,
        },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("Error reprocessing meeting:", error);
    return Response.json(
      { error: "Failed to reprocess meeting" },
      { status: 500 },
    );
  }
}
