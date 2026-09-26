import { db } from "~/server/db";
import { z } from "zod";
import { createAssessmentSchema } from "~/server/assessment/types";
import { emptyAnswers, mergeAnswers } from "~/server/assessment/scoring";
import { generateAccessToken, hashAccessToken } from "~/server/assessment/token";
import {
  checkAssessmentRateLimit,
  getClientIp,
} from "~/server/assessment/rate-limit";
import { corsPreflight, withCors } from "~/server/assessment/cors";
import { toInputJson } from "~/server/assessment/json";

export function OPTIONS(request: Request): Response {
  return corsPreflight(request);
}

/**
 * POST /api/assessments
 * Create an anonymous stack assessment session.
 * Returns assessmentId + accessToken (token shown once; store client-side).
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const ip = getClientIp(request);
    const rate = checkAssessmentRateLimit(ip, "assessment-create", 30, 60 * 60 * 1000);
    if (!rate.allowed) {
      return withCors(
        request,
        Response.json(
          {
            success: false,
            error: "Rate limit exceeded",
          },
          { status: 429 },
        ),
      );
    }

    const body: unknown = await request.json().catch(() => ({}));
    const validated = createAssessmentSchema.parse(body ?? {});
    const answers = mergeAnswers(emptyAnswers(), validated.answers);
    const accessToken = generateAccessToken();
    const now = new Date();

    const assessment = await db.stackAssessment.create({
      data: {
        accessTokenHash: hashAccessToken(accessToken),
        status: "STARTED",
        currentStep: validated.currentStep ?? 0,
        answers: toInputJson(answers),
        lastActivityAt: now,
        landingPath: validated.landingPath,
        referrer: validated.referrer,
        utmSource: validated.utmSource,
        utmMedium: validated.utmMedium,
        utmCampaign: validated.utmCampaign,
        utmContent: validated.utmContent,
        utmTerm: validated.utmTerm,
      },
      select: { id: true, status: true, currentStep: true, startedAt: true },
    });

    return withCors(
      request,
      Response.json(
        {
          success: true,
          data: {
            assessmentId: assessment.id,
            accessToken,
            status: assessment.status,
            currentStep: assessment.currentStep,
            startedAt: assessment.startedAt.toISOString(),
          },
        },
        { status: 201 },
      ),
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return withCors(
        request,
        Response.json({ success: false, error: "Validation failed" }, { status: 400 }),
      );
    }
    console.error("Error creating stack assessment");
    return withCors(
      request,
      Response.json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      ),
    );
  }
}
