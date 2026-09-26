import { Prisma } from "../../../generated/prisma";
import type { AssessmentAnswers } from "./types";
import { emptyAnswers } from "./scoring";

export function answersFromJson(value: Prisma.JsonValue | null | undefined): AssessmentAnswers {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyAnswers();
  }
  return { ...emptyAnswers(), ...(value as Partial<AssessmentAnswers>) };
}

export function toInputJson(
  value: AssessmentAnswers | Record<string, unknown>,
): Prisma.InputJsonValue {
  // CAST: Prisma JSON input accepts plain objects; AssessmentAnswers is JSON-serializable
  return value as Prisma.InputJsonValue;
}
