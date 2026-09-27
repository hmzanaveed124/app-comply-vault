import { db } from "~/server/db";
import { z } from "zod";
import { StackAssessmentStatus } from "../../../../../../generated/prisma";
import { leadCaptureSchema } from "~/server/assessment/types";
import { buildResultSummary, isCompleteAnswers } from "~/server/assessment/scoring";
import { tokensMatch } from "~/server/assessment/token";
import {
  checkAssessmentRateLimit,
  getClientIp,
} from "~/server/assessment/rate-limit";
import { corsPreflight, withCors } from "~/server/assessment/cors";
import { answersFromJson, toInputJson } from "~/server/assessment/json";
import {
  sendDetailedStackReviewEmail,
  sendStackAssessmentLeadNotification,
} from "~/server/assessment/email";

type RouteContext = { params: Promise<{ id: string }> };

export function OPTIONS(request: Request): Response {
  return corsPreflight(request);
}

/**
 * POST /api/assessments/[id]/lead
 * Optional detailed-review lead capture. Requires assessment access token.
 * Never returns lead PII. Email failures do not roll back lead persistence.
 */
export async function POST(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const ip = getClientIp(request);
    const rate = checkAssessmentRateLimit(ip, "assessment-lead", 10, 60 * 60 * 1000);
    if (!rate.allowed) {
      return withCors(
        request,
        Response.json({ success: false, error: "Rate limit exceeded" }, { status: 429 }),
      );
    }

    const { id } = await context.params;
    const body: unknown = await request.json();
    const validated = leadCaptureSchema.parse(body);

    const assessment = await db.stackAssessment.findUnique({
      where: { id },
      include: { lead: true },
    });

    if (!assessment || !tokensMatch(validated.accessToken, assessment.accessTokenHash)) {
      return withCors(
        request,
        Response.json({ success: false, error: "Not found" }, { status: 404 }),
      );
    }

    const isComplete =
      assessment.status === StackAssessmentStatus.COMPLETED ||
      assessment.status === StackAssessmentStatus.LEAD_CAPTURED ||
      Boolean(assessment.completedAt);

    if (!isComplete) {
      return withCors(
        request,
        Response.json(
          { success: false, error: "Assessment not completed" },
          { status: 409 },
        ),
      );
    }

    const answers = answersFromJson(assessment.answers);
    if (!isCompleteAnswers(answers)) {
      return withCors(
        request,
        Response.json({ success: false, error: "Complete all assessment questions" }, { status: 409 }),
      );
    }
    // Recompute from validated answers so an older stored summary cannot stale the email.
    const summary = buildResultSummary(answers);

    const now = new Date();
    const email = validated.email.trim().toLowerCase();
    const firmName = validated.firmName?.trim() || null;
    const role = validated.role?.trim() || null;

    await db.$transaction(async (tx) => {
      await tx.stackAssessmentLead.upsert({
        where: { assessmentId: id },
        create: {
          assessmentId: id,
          email,
          firmName,
          role,
          detailedReviewRequested: true,
        },
        update: {
          email,
          firmName,
          role,
          detailedReviewRequested: true,
        },
      });

      await tx.stackAssessment.update({
        where: { id },
        data: {
          status: StackAssessmentStatus.LEAD_CAPTURED,
          score: summary.score,
          resultSummary: toInputJson(summary),
          completedAt: assessment.completedAt ?? now,
          lastActivityAt: now,
        },
      });
    });

    // Fire-and-forget emails — lead row already committed
    void Promise.all([
      sendDetailedStackReviewEmail({
        email,
        firmName: firmName ?? undefined,
        role: role ?? undefined,
        assessmentId: id,
        answers,
        result: summary,
        attribution: {
          utmSource: assessment.utmSource,
          utmMedium: assessment.utmMedium,
          utmCampaign: assessment.utmCampaign,
        },
      }).then(async (sent) => {
        if (sent.success) {
          await db.stackAssessmentLead.update({
            where: { assessmentId: id },
            data: { emailSentAt: new Date() },
          });
        }
      }),
      sendStackAssessmentLeadNotification({
        email,
        firmName: firmName ?? undefined,
        role: role ?? undefined,
        assessmentId: id,
        answers,
        result: summary,
        attribution: {
          utmSource: assessment.utmSource,
          utmMedium: assessment.utmMedium,
          utmCampaign: assessment.utmCampaign,
        },
      }),
    ]).catch(() => {
      console.error("Error sending assessment lead emails");
    });

    return withCors(
      request,
      Response.json({
        success: true,
        data: {
          message:
            "Thanks - your detailed Stack Review is on its way to your inbox.",
        },
      }),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withCors(
        request,
        Response.json({ success: false, error: "Validation failed" }, { status: 400 }),
      );
    }
    console.error("Error capturing assessment lead");
    return withCors(
      request,
      Response.json({ success: false, error: "Internal server error" }, { status: 500 }),
    );
  }
}
