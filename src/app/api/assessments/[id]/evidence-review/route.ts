import { db } from "~/server/db";
import { z } from "zod";
import { StackAssessmentStatus } from "../../../../../../generated/prisma";
import { leadCaptureSchema } from "~/server/assessment/types";
import { buildResultSummary } from "~/server/assessment/scoring";
import { tokensMatch } from "~/server/assessment/token";
import { checkAssessmentRateLimit, getClientIp } from "~/server/assessment/rate-limit";
import { corsPreflight, withCors } from "~/server/assessment/cors";
import { answersFromJson, toInputJson } from "~/server/assessment/json";
import { sendStackAssessmentLeadNotification } from "~/server/assessment/email";

type RouteContext = { params: Promise<{ id: string }> };

export function OPTIONS(request: Request): Response {
  return corsPreflight(request);
}

/** Records a request to discuss a paid review of real evidence. No record access is granted. */
export async function POST(request: Request, context: RouteContext): Promise<Response> {
  try {
    const rate = checkAssessmentRateLimit(getClientIp(request), "evidence-review", 10, 60 * 60 * 1000);
    if (!rate.allowed) {
      return withCors(request, Response.json({ success: false, error: "Rate limit exceeded" }, { status: 429 }));
    }

    const { id } = await context.params;
    const validated = leadCaptureSchema.parse(await request.json() as unknown);
    const assessment = await db.stackAssessment.findUnique({ where: { id }, include: { lead: true } });
    if (!assessment || !tokensMatch(validated.accessToken, assessment.accessTokenHash)) {
      return withCors(request, Response.json({ success: false, error: "Not found" }, { status: 404 }));
    }
    if (!assessment.completedAt && assessment.status !== StackAssessmentStatus.COMPLETED && assessment.status !== StackAssessmentStatus.LEAD_CAPTURED) {
      return withCors(request, Response.json({ success: false, error: "Assessment not completed" }, { status: 409 }));
    }

    const answers = answersFromJson(assessment.answers);
    const summary = buildResultSummary(answers);
    const now = new Date();
    const email = validated.email.trim().toLowerCase();
    const firmName = validated.firmName?.trim() || null;
    const role = validated.role?.trim() || null;
    const firstRequest = !assessment.lead?.evidenceReviewRequestedAt;

    await db.$transaction(async (tx) => {
      await tx.stackAssessmentLead.upsert({
        where: { assessmentId: id },
        create: { assessmentId: id, email, firmName, role, detailedReviewRequested: false, evidenceReviewRequestedAt: now },
        update: { email, firmName, role, evidenceReviewRequestedAt: assessment.lead?.evidenceReviewRequestedAt ?? now },
      });
      await tx.stackAssessment.update({
        where: { id },
        data: { status: StackAssessmentStatus.LEAD_CAPTURED, score: summary.score, resultSummary: toInputJson(summary), completedAt: assessment.completedAt ?? now, lastActivityAt: now },
      });
    });

    if (firstRequest) {
      await sendStackAssessmentLeadNotification({
        email, firmName: firmName ?? undefined, role: role ?? undefined,
        assessmentId: id, answers, result: summary, evidenceReviewRequested: true,
        attribution: { utmSource: assessment.utmSource, utmMedium: assessment.utmMedium, utmCampaign: assessment.utmCampaign },
      }).catch(() => console.error("Error notifying of evidence review request"));
    }

    return withCors(request, Response.json({ success: true, data: { message: "Request received" } }));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withCors(request, Response.json({ success: false, error: "Validation failed" }, { status: 400 }));
    }
    console.error("Error capturing evidence review request");
    return withCors(request, Response.json({ success: false, error: "Internal server error" }, { status: 500 }));
  }
}
