import { z } from "zod";

export const assessmentAnswersSchema = z.object({
  registration: z.enum(["", "sec", "state", "mixed", "other"]),
  adviserCount: z.enum(["", "1-5", "6-15", "16-50", "50+"]),
  complianceModel: z.enum(["", "internal", "outsourced", "shared", "owner"]),
  archive: z.enum(["", "yes", "unsure", "no"]),
  crm: z.enum(["", "yes", "some", "no"]),
  meetings: z.enum(["", "yes", "sometimes", "no"]),
  policyCentral: z.enum(["", "yes", "partial", "no"]),
  commReview: z.enum(["", "automated", "sampling", "manual", "none"]),
  reviewEvidence: z.enum(["", "single", "scattered", "undocumented"]),
  issueTracking: z.enum(["", "workflow", "spreadsheet", "inbox", "none"]),
  examRetrieval: z.enum(["", "minutes", "hours", "days"]),
  biggestPain: z.enum(["", "finding", "reviewing", "evidence", "exam"]),
  priority: z.enum(["", "time", "visibility", "exam", "scale"]),
});

export type AssessmentAnswers = z.infer<typeof assessmentAnswersSchema>;

export const attributionSchema = z.object({
  landingPath: z.string().max(500).optional(),
  referrer: z.string().max(1000).optional(),
  utmSource: z.string().max(200).optional(),
  utmMedium: z.string().max(200).optional(),
  utmCampaign: z.string().max(200).optional(),
  utmContent: z.string().max(200).optional(),
  utmTerm: z.string().max(200).optional(),
});

export type AssessmentAttribution = z.infer<typeof attributionSchema>;

export const createAssessmentSchema = attributionSchema.extend({
  answers: assessmentAnswersSchema.partial().optional(),
  currentStep: z.number().int().min(0).max(3).optional(),
});

export const updateAssessmentSchema = z.object({
  accessToken: z.string().min(32).max(128),
  answers: assessmentAnswersSchema.partial().optional(),
  currentStep: z.number().int().min(0).max(3).optional(),
  status: z.enum(["IN_PROGRESS", "COMPLETED"]).optional(),
});

export const leadCaptureSchema = z.object({
  accessToken: z.string().min(32).max(128),
  email: z.string().email().max(320),
  firmName: z.string().trim().max(200).optional(),
  role: z.string().trim().max(120).optional(),
});

export type AreaStatus = "covered" | "partial" | "gap" | "effort";

export type GapRecommendation = {
  title: string;
  body: string;
  priority: number;
  product?: boolean;
};

export type AssessmentResultSummary = {
  score: number;
  headline: string;
  body: string;
  areaStatuses: Record<string, AreaStatus>;
  areaDetails: Array<{ label: string; status: AreaStatus; detail: string }>;
  gaps: GapRecommendation[];
  profile: {
    registration: string;
    adviserCount: string;
    complianceModel: string;
    biggestPain: string;
    priority: string;
  };
  salesContext: {
    supervisoryEvidence: string;
    communicationsCoverage: string;
    examRetrieval: string;
    stackFragmentation: string;
  };
};
