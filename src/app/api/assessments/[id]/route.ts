import { db } from "~/server/db";
import { z } from "zod";
import { StackAssessmentStatus } from "../../../../../generated/prisma";
import { updateAssessmentSchema } from "~/server/assessment/types";
import { buildResultSummary, mergeAnswers } from "~/server/assessment/scoring";
import { tokensMatch } from "~/server/assessment/token";
import {
  checkAssessmentRateLimit,
  getClientIp,
} from "~/server/assessment/rate-limit";
import { corsPreflight, withCors } from "~/server/assessment/cors";
import { answersFromJson, toInputJson } from "~/server/assessment/json";

type RouteContext = { params: Promise<{ id: string }> };

function extractAccessToken(request: Request, bodyToken?: string): string | null {
  if (bodyToken) return bodyToken;
  const header = request.headers.get("x-assessment-token");
  if (header) return header;
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return null;
}

export function OPTIONS(request: Request): Response {
  return corsPreflight(request);
}

/**
 * GET /api/assessments/[id]
 * Resume an assessment. Requires access token. Never returns lead PII.
 */
export async function GET(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const { id } = await context.params;
    const token = extractAccessToken(request);
    if (!token) {
      return withCors(
        request,
        Response.json({ success: false, error: "Unauthorized" }, { status: 401 }),
      );
    }

    const assessment = await db.stackAssessment.findUnique({
      where: { id },
      select: {
        id: true,
        accessTokenHash: true,
        status: true,
        currentStep: true,
        answers: true,
        score: true,
        resultSummary: true,
        startedAt: true,
        completedAt: true,
        lastActivityAt: true,
      },
    });

    if (!assessment || !tokensMatch(token, assessment.accessTokenHash)) {
      return withCors(
        request,
        Response.json({ success: false, error: "Not found" }, { status: 404 }),
      );
    }

    return withCors(
      request,
      Response.json({
        success: true,
        data: {
          assessmentId: assessment.id,
          status: assessment.status,
          currentStep: assessment.currentStep,
          answers: answersFromJson(assessment.answers),
          score: assessment.score,
          resultSummary: assessment.resultSummary,
          startedAt: assessment.startedAt.toISOString(),
          completedAt: assessment.completedAt?.toISOString() ?? null,
          lastActivityAt: assessment.lastActivityAt.toISOString(),
        },
      }),
    );
  } catch (error) {
    console.error("Error loading stack assessment:", error);
    return withCors(
      request,
      Response.json({ success: false, error: "Internal server error" }, { status: 500 }),
    );
  }
}

/**
 * PATCH /api/assessments/[id]
 * Persist progress / completion. Requires access token.
 */
export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<Response> {
  try {
    const ip = getClientIp(request);
    const rate = checkAssessmentRateLimit(ip, "assessment-update", 120, 60 * 60 * 1000);
    if (!rate.allowed) {
      return withCors(
        request,
        Response.json({ success: false, error: "Rate limit exceeded" }, { status: 429 }),
      );
    }

    const { id } = await context.params;
    const body: unknown = await request.json();
    const validated = updateAssessmentSchema.parse(body);
    const token = extractAccessToken(request, validated.accessToken);
    if (!token) {
      return withCors(
        request,
        Response.json({ success: false, error: "Unauthorized" }, { status: 401 }),
      );
    }

    const existing = await db.stackAssessment.findUnique({
      where: { id },
      select: {
        id: true,
        accessTokenHash: true,
        status: true,
        answers: true,
        score: true,
        resultSummary: true,
        completedAt: true,
      },
    });

    if (!existing || !tokensMatch(token, existing.accessTokenHash)) {
      return withCors(
        request,
        Response.json({ success: false, error: "Not found" }, { status: 404 }),
      );
    }

    // Do not allow mutating after lead capture except abandon is ignored
    if (existing.status === StackAssessmentStatus.LEAD_CAPTURED) {
      return withCors(
        request,
        Response.json({
          success: true,
          data: {
            assessmentId: existing.id,
            status: existing.status,
            score: existing.score,
            resultSummary: existing.resultSummary,
          },
        }),
      );
    }

    const merged = mergeAnswers(answersFromJson(existing.answers), validated.answers);
    const now = new Date();
    let nextStatus: StackAssessmentStatus = existing.status;
    let score = existing.score;
    let completedAt = existing.completedAt;
    let nextResultSummary: ReturnType<typeof toInputJson> | undefined;

    if (validated.status === "COMPLETED") {
      const summary = buildResultSummary(merged);
      score = summary.score;
      nextResultSummary = toInputJson(summary);
      completedAt = now;
      nextStatus = StackAssessmentStatus.COMPLETED;
    } else if (
      existing.status === StackAssessmentStatus.STARTED ||
      existing.status === StackAssessmentStatus.IN_PROGRESS
    ) {
      nextStatus = StackAssessmentStatus.IN_PROGRESS;
    }

    const updated = await db.stackAssessment.update({
      where: { id },
      data: {
        answers: toInputJson(merged),
        currentStep: validated.currentStep ?? undefined,
        status: nextStatus,
        score: score ?? undefined,
        resultSummary: nextResultSummary,
        completedAt: completedAt ?? undefined,
        lastActivityAt: now,
      },
      select: {
        id: true,
        status: true,
        currentStep: true,
        score: true,
        resultSummary: true,
        completedAt: true,
        lastActivityAt: true,
      },
    });

    return withCors(
      request,
      Response.json({
        success: true,
        data: {
          assessmentId: updated.id,
          status: updated.status,
          currentStep: updated.currentStep,
          score: updated.score,
          resultSummary: updated.resultSummary,
          completedAt: updated.completedAt?.toISOString() ?? null,
          lastActivityAt: updated.lastActivityAt.toISOString(),
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
    console.error("Error updating stack assessment");
    return withCors(
      request,
      Response.json({ success: false, error: "Internal server error" }, { status: 500 }),
    );
  }
}
