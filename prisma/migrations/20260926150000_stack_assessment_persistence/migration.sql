-- Migration: Stack assessment persistence + optional lead capture
-- Created at: 2026-09-26T15:00:00.000Z
-- Abandonment is derived from lastActivityAt (not a persisted status).

CREATE TYPE "StackAssessmentStatus" AS ENUM ('STARTED', 'IN_PROGRESS', 'COMPLETED', 'LEAD_CAPTURED');

CREATE TABLE "StackAssessment" (
    "id" TEXT NOT NULL,
    "accessTokenHash" TEXT NOT NULL,
    "status" "StackAssessmentStatus" NOT NULL DEFAULT 'STARTED',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "score" INTEGER,
    "resultSummary" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "landingPath" TEXT,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StackAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StackAssessmentLead" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firmName" TEXT,
    "role" TEXT,
    "detailedReviewRequested" BOOLEAN NOT NULL DEFAULT true,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StackAssessmentLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StackAssessment_status_startedAt_idx" ON "StackAssessment"("status", "startedAt");
CREATE INDEX "StackAssessment_lastActivityAt_idx" ON "StackAssessment"("lastActivityAt");
CREATE INDEX "StackAssessment_utmSource_idx" ON "StackAssessment"("utmSource");
CREATE INDEX "StackAssessment_completedAt_idx" ON "StackAssessment"("completedAt");

CREATE UNIQUE INDEX "StackAssessmentLead_assessmentId_key" ON "StackAssessmentLead"("assessmentId");
CREATE INDEX "StackAssessmentLead_email_idx" ON "StackAssessmentLead"("email");
CREATE INDEX "StackAssessmentLead_createdAt_idx" ON "StackAssessmentLead"("createdAt");

ALTER TABLE "StackAssessmentLead" ADD CONSTRAINT "StackAssessmentLead_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "StackAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
