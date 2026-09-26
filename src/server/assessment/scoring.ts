import type {
  AssessmentAnswers,
  AssessmentResultSummary,
  AreaStatus,
  GapRecommendation,
} from "./types";

const EMPTY_ANSWERS: AssessmentAnswers = {
  registration: "",
  adviserCount: "",
  complianceModel: "",
  archive: "",
  crm: "",
  meetings: "",
  policyCentral: "",
  commReview: "",
  reviewEvidence: "",
  issueTracking: "",
  examRetrieval: "",
  biggestPain: "",
  priority: "",
};

export function emptyAnswers(): AssessmentAnswers {
  return { ...EMPTY_ANSWERS };
}

export function mergeAnswers(
  current: AssessmentAnswers,
  patch: Partial<AssessmentAnswers> | undefined,
): AssessmentAnswers {
  if (!patch) return current;
  return { ...current, ...patch };
}

function scoreArchive(v: AssessmentAnswers["archive"]): number {
  if (v === "yes") return 2;
  if (v === "unsure") return 1;
  return 0;
}

function scoreCrm(v: AssessmentAnswers["crm"]): number {
  if (v === "yes") return 2;
  if (v === "some") return 1;
  return 0;
}

function scoreMeetings(v: AssessmentAnswers["meetings"]): number {
  if (v === "yes") return 2;
  if (v === "sometimes") return 1;
  return 0;
}

function scorePolicy(v: AssessmentAnswers["policyCentral"]): number {
  if (v === "yes") return 2;
  if (v === "partial") return 1;
  return 0;
}

function scoreCommReview(v: AssessmentAnswers["commReview"]): number {
  if (v === "automated") return 2;
  if (v === "sampling" || v === "manual") return 1;
  return 0;
}

function scoreEvidence(v: AssessmentAnswers["reviewEvidence"]): number {
  if (v === "single") return 2;
  if (v === "scattered") return 1;
  return 0;
}

function scoreTracking(v: AssessmentAnswers["issueTracking"]): number {
  if (v === "workflow") return 2;
  if (v === "spreadsheet" || v === "inbox") return 1;
  return 0;
}

function scoreExam(v: AssessmentAnswers["examRetrieval"]): number {
  if (v === "minutes") return 2;
  if (v === "hours") return 1;
  return 0;
}

export function calculateScore(answers: AssessmentAnswers): number {
  const total =
    scoreArchive(answers.archive) +
    scoreCrm(answers.crm) +
    scoreMeetings(answers.meetings) +
    scorePolicy(answers.policyCentral) +
    scoreCommReview(answers.commReview) +
    scoreEvidence(answers.reviewEvidence) +
    scoreTracking(answers.issueTracking) +
    scoreExam(answers.examRetrieval);
  return Math.round((total / 16) * 100);
}

export function calculateAreaStatuses(
  answers: AssessmentAnswers,
): Record<string, AreaStatus> {
  return {
    archive:
      answers.archive === "yes"
        ? "covered"
        : answers.archive === "unsure"
          ? "partial"
          : "gap",
    crm:
      answers.crm === "yes" ? "covered" : answers.crm === "some" ? "partial" : "gap",
    meetings:
      answers.meetings === "yes"
        ? "covered"
        : answers.meetings === "sometimes"
          ? "partial"
          : "gap",
    policies:
      answers.policyCentral === "yes"
        ? "covered"
        : answers.policyCentral === "partial"
          ? "partial"
          : "gap",
    communications:
      answers.commReview === "automated"
        ? "covered"
        : answers.commReview === "sampling" || answers.commReview === "manual"
          ? "partial"
          : "gap",
    evidence:
      answers.reviewEvidence === "single" && answers.issueTracking === "workflow"
        ? "covered"
        : answers.reviewEvidence === "undocumented" ||
            answers.issueTracking === "none"
          ? "gap"
          : "partial",
    exam:
      answers.examRetrieval === "minutes"
        ? "covered"
        : answers.examRetrieval === "hours"
          ? "partial"
          : "effort",
  };
}

export function calculateGaps(answers: AssessmentAnswers): GapRecommendation[] {
  const gaps: GapRecommendation[] = [];

  if (answers.archive !== "yes") {
    gaps.push({
      title: "Confirm your communications retention foundation",
      body:
        answers.archive === "no"
          ? "A compliant archive is foundational. Put retention and retrieval in place before adding another supervisory layer."
          : "Confirm what your current archive retains, for how long, and how quickly your team can retrieve it before adding more tools.",
      priority: 1,
    });
  }

  if (
    answers.reviewEvidence !== "single" ||
    answers.issueTracking !== "workflow" ||
    answers.examRetrieval !== "minutes"
  ) {
    gaps.push({
      title: "Create one supervisory evidence trail",
      body: "Bring the source item, reviewer judgement, follow-up and final resolution into one traceable workflow so the story does not need to be rebuilt later.",
      product: answers.archive !== "no",
      priority: 2,
    });
  }

  if (answers.commReview === "manual" || answers.commReview === "none") {
    gaps.push({
      title: "Reduce manual communications review",
      body: "Start with a narrow risk set and surface only items that genuinely need human judgement. More alerts are not the goal; better-qualified review is.",
      product: answers.archive !== "no",
      priority: 3,
    });
  }

  if (answers.examRetrieval === "days" || answers.examRetrieval === "hours") {
    gaps.push({
      title: "Map your exam-retrieval path",
      body: "Choose one representative client or issue and document every system your team must search to reconstruct the evidence. That map usually exposes the highest-friction handoffs.",
      priority: 4,
    });
  }

  if (answers.policyCentral !== "yes") {
    gaps.push({
      title: "Centralize the current policy set",
      body: "Make it obvious which policy version is current, who owns it and where supporting attestations or review evidence live.",
      priority: 5,
    });
  }

  if (gaps.length === 0) {
    gaps.push({
      title: "Stress-test retrieval, not just storage",
      body: "Your foundation looks well covered. Test it with a realistic request: can someone unfamiliar with the matter reproduce the evidence and review history quickly?",
      product: true,
      priority: 6,
    });
  }

  return gaps.sort((a, b) => a.priority - b.priority).slice(0, 4);
}

function headlineForScore(score: number): { title: string; body: string } {
  if (score >= 80) {
    return {
      title: "Strong foundation. Focus on supervisory leverage.",
      body: "Your core stack appears well covered. The next question is whether your team can turn retained information into clear, reviewable evidence without adding unnecessary manual work.",
    };
  }
  if (score >= 55) {
    return {
      title: "The foundation is there, but the workflow is fragmented.",
      body: "You have several important systems in place. The main opportunity is reducing the handoffs between finding an issue, reviewing it, recording judgement and producing evidence later.",
    };
  }
  return {
    title: "Manual friction is doing too much of the work.",
    body: "Your answers point to important gaps or high-effort workflows. Prioritize the underlying retention and evidence foundations before layering on more software.",
  };
}

const REGISTRATION_LABEL: Record<string, string> = {
  sec: "SEC registered",
  state: "State registered",
  mixed: "Mixed / multi-firm",
  other: "Other / unsure",
};

const MODEL_LABEL: Record<string, string> = {
  internal: "Internal team",
  outsourced: "Outsourced / fractional",
  shared: "Shared",
  owner: "Principal / owner",
};

const PAIN_LABEL: Record<string, string> = {
  finding: "Finding information",
  reviewing: "Review noise",
  evidence: "Proving decisions",
  exam: "Exam preparation",
};

const PRIORITY_LABEL: Record<string, string> = {
  time: "Reduce review time",
  visibility: "Supervisory visibility",
  exam: "Exam readiness",
  scale: "Scale efficiently",
};

function statusLabel(status: AreaStatus): string {
  if (status === "covered") return "Covered";
  if (status === "partial") return "Partial";
  if (status === "effort") return "High friction";
  return "Gap";
}

function fragmentationLabel(score: number): string {
  if (score >= 80) return "Low";
  if (score >= 55) return "Moderate";
  return "High";
}

export function buildResultSummary(
  answers: AssessmentAnswers,
): AssessmentResultSummary {
  const score = calculateScore(answers);
  const statuses = calculateAreaStatuses(answers);
  const headline = headlineForScore(score);
  const gaps = calculateGaps(answers);

  const areaDetails: AssessmentResultSummary["areaDetails"] = [
    {
      label: "Communications archive",
      status: statuses.archive ?? "gap",
      detail:
        answers.archive === "yes"
          ? "Retention system in place"
          : answers.archive === "unsure"
            ? "Coverage needs confirming"
            : "No archive reported",
    },
    {
      label: "CRM / client record",
      status: statuses.crm ?? "gap",
      detail:
        answers.crm === "yes"
          ? "Primary CRM in use"
          : answers.crm === "some"
            ? "Client information is split"
            : "No consistent CRM reported",
    },
    {
      label: "Meeting capture",
      status: statuses.meetings ?? "gap",
      detail:
        answers.meetings === "yes"
          ? "Meetings are routinely captured"
          : answers.meetings === "sometimes"
            ? "Capture is inconsistent"
            : "Meeting evidence is largely manual",
    },
    {
      label: "Communications review",
      status: statuses.communications ?? "gap",
      detail:
        answers.commReview === "automated"
          ? "Risk-based or automated review"
          : answers.commReview === "sampling"
            ? "Sampling-based review"
            : answers.commReview === "manual"
              ? "Mostly manual review"
              : "No consistent review workflow",
    },
    {
      label: "Supervisory evidence",
      status: statuses.evidence ?? "gap",
      detail:
        answers.reviewEvidence === "single" && answers.issueTracking === "workflow"
          ? "Decision trail is centralized"
          : "Review evidence spans multiple places",
    },
    {
      label: "Policy management",
      status: statuses.policies ?? "gap",
      detail:
        answers.policyCentral === "yes"
          ? "Current policy set is centralized"
          : answers.policyCentral === "partial"
            ? "Some version/control friction"
            : "Policies are spread across locations",
    },
    {
      label: "Exam retrieval",
      status: statuses.exam ?? "effort",
      detail:
        answers.examRetrieval === "minutes"
          ? "Typical evidence retrieval is measured in minutes"
          : answers.examRetrieval === "hours"
            ? "Typical retrieval takes hours"
            : "Typical retrieval can take a day or more",
    },
  ];

  return {
    score,
    headline: headline.title,
    body: headline.body,
    areaStatuses: statuses,
    areaDetails,
    gaps,
    profile: {
      registration: REGISTRATION_LABEL[answers.registration] ?? "—",
      adviserCount: answers.adviserCount || "—",
      complianceModel: MODEL_LABEL[answers.complianceModel] ?? "—",
      biggestPain: PAIN_LABEL[answers.biggestPain] ?? "—",
      priority: PRIORITY_LABEL[answers.priority] ?? "—",
    },
    salesContext: {
      supervisoryEvidence: statusLabel(statuses.evidence ?? "gap"),
      communicationsCoverage: statusLabel(statuses.communications ?? "gap"),
      examRetrieval: statusLabel(statuses.exam ?? "effort"),
      stackFragmentation: fragmentationLabel(score),
    },
  };
}
