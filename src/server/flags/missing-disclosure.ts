import {
  controlMatchesRecommendation,
  type ContextualControl,
} from "~/lib/contextual-control";
import type { DisclosureCategoryStatus } from "../../../generated/prisma";
import type {
  ExtractionData,
  ExtractedRecommendation,
  ExtractedDisclosure,
} from "~/server/extraction/types";
import {
  getImplicatedCategorySlugs,
  getSuppressedSlugsFromMixed,
  resolveProfileSkip,
} from "./category-mapping";
import { DISCLOSURE_CATEGORY_CATALOG } from "~/lib/disclosure-categories";

const DISCLOSURE_PATTERNS: RegExp[] = [
  /risk/i,
  /no guarantee/i,
  /may lose/i,
  /past performance/i,
  /conflict/i,
  /fees?/i,
  /compensation/i,
  /fiduciary/i,
  /suitability/i,
  /not tax advice/i,
  /not legal advice/i,
];

const DEFAULT_TIME_WINDOW_SECONDS = 180;

export type DisclosureProfileInput = {
  statusBySlug: Map<string, DisclosureCategoryStatus>;
  suppressionEvidenceBySlug: Map<string, string>;
  controls?: Array<{
    slug: string;
    config: ContextualControl;
    approvedAt: string;
    approvedByUserId: string | null;
  }>;
};

export interface MissingDisclosureFlagEvidence {
  recommendation: {
    text: string;
    startTime: number;
    endTime: number;
    snippet: string;
    confidence: number | undefined;
  };
  matchedDisclosure?: {
    text: string;
    startTime: number;
    endTime: number;
    snippet: string;
  };
  rule: {
    timeWindowSeconds: number;
    disclosurePatterns: string[];
  };
  observation?: string;
  limitations?: string;
  controlSnapshots?: DisclosureProfileInput["controls"];
  recommendationText?: string;
  matchedCategories?: string[];
  suppressedCategories?: string[];
  activeCategories?: string[];
  suppressionEvidence?: Record<string, string>;
}

export interface MissingDisclosureFlag {
  type: "MISSING_DISCLOSURE";
  severity: "WARN";
  evidence: MissingDisclosureFlagEvidence;
}

function matchesDisclosurePatterns(disclosure: ExtractedDisclosure): boolean {
  const text = `${disclosure.text ?? ""} ${disclosure.snippet ?? ""}`.trim();
  if (!text) {
    return false;
  }
  return DISCLOSURE_PATTERNS.some((pattern) => pattern.test(text));
}

function findRelevantDisclosure(
  recommendation: ExtractedRecommendation,
  disclosures: ExtractedDisclosure[],
  timeWindowSeconds: number,
): ExtractedDisclosure | null {
  if (!disclosures.length) {
    return null;
  }

  const windowStart = Math.max(
    0,
    (recommendation.startTime ?? 0) - timeWindowSeconds,
  );
  const windowEnd = (recommendation.endTime ?? 0) + timeWindowSeconds;

  const candidates = disclosures.filter((disclosure) => {
    const start = disclosure.startTime ?? 0;
    const end = disclosure.endTime ?? 0;
    return start <= windowEnd && end >= windowStart;
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates.find(matchesDisclosurePatterns) ?? candidates[0] ?? null;
}

function buildBaseEvidence(
  rec: ExtractedRecommendation,
  matchedDisclosure: ExtractedDisclosure | null,
  timeWindowSeconds: number,
): MissingDisclosureFlagEvidence {
  return {
    recommendation: {
      text: rec.text!,
      startTime: rec.startTime!,
      endTime: rec.endTime!,
      snippet: rec.snippet ?? "",
      confidence: rec.confidence,
    },
    matchedDisclosure: matchedDisclosure
      ? {
          text: matchedDisclosure.text ?? "",
          startTime: matchedDisclosure.startTime ?? 0,
          endTime: matchedDisclosure.endTime ?? 0,
          snippet: matchedDisclosure.snippet ?? "",
        }
      : undefined,
    rule: {
      timeWindowSeconds,
      disclosurePatterns: DISCLOSURE_PATTERNS.map((pattern) => pattern.source),
    },
    recommendationText: rec.text,
  };
}

export function detectMissingDisclosureFlags(
  extraction: ExtractionData,
  options?: {
    timeWindowSeconds?: number;
    profile?: DisclosureProfileInput | null;
  },
): MissingDisclosureFlag[] {
  const recommendations = extraction.recommendations ?? [];
  const disclosures = extraction.disclosures ?? [];
  const timeWindowSeconds =
    options?.timeWindowSeconds ?? DEFAULT_TIME_WINDOW_SECONDS;
  const profileMap = options?.profile?.statusBySlug ?? null;
  const evidenceMap =
    options?.profile?.suppressionEvidenceBySlug ?? new Map<string, string>();

  if (recommendations.length === 0) {
    return [];
  }

  const flags: MissingDisclosureFlag[] = [];
  for (const rec of recommendations) {
    if (
      !rec.text ||
      typeof rec.startTime !== "number" ||
      typeof rec.endTime !== "number"
    )
      continue;

    const matchedDisclosure = findRelevantDisclosure(
      rec,
      disclosures,
      timeWindowSeconds,
    );
    const disclosureIsValid = matchedDisclosure
      ? matchesDisclosurePatterns(matchedDisclosure)
      : false;

    const matchedControls =
      options?.profile?.controls?.filter((control) =>
        controlMatchesRecommendation(control.config, rec.text!),
      ) ?? [];
    const implicated = getImplicatedCategorySlugs(rec.text);
    const disclosureText = `${matchedDisclosure?.text ?? ""} ${matchedDisclosure?.snippet ?? ""}`;
    const categoryCoverage = implicated.every((slug) =>
      DISCLOSURE_CATEGORY_CATALOG.find(
        (category) => category.slug === slug,
      )?.patterns.some((pattern) => pattern.test(disclosureText)),
    );
    // A generic risk/fee sentence does not clear a different concern. Configured
    // controls need human assessment of their external sources and exceptions.
    if (
      matchedDisclosure &&
      disclosureIsValid &&
      categoryCoverage &&
      matchedControls.length === 0
    )
      continue;

    const implicatedSlugs = getImplicatedCategorySlugs(rec.text);
    const decision = resolveProfileSkip(implicatedSlugs, profileMap);

    const evidence = buildBaseEvidence(
      rec,
      matchedDisclosure,
      timeWindowSeconds,
    );
    evidence.observation = matchedControls.length
      ? "A firm-configured control requires contextual evidence review."
      : "Supporting disclosure evidence was not found in the available transcript window.";
    evidence.limitations =
      "This is an automated observation, not a confirmed deficiency. Review applicability, full context and relevant external disclosures. Legacy category suppression does not establish compliance.";
    evidence.controlSnapshots = matchedControls;
    evidence.matchedCategories = implicatedSlugs;

    if (decision === "raise-mixed" && implicatedSlugs.length > 0) {
      const suppressed = getSuppressedSlugsFromMixed(
        implicatedSlugs,
        profileMap,
      );
      const active = implicatedSlugs.filter((slug) => {
        const status = profileMap?.get(slug) ?? "ACTIVE";
        return status === "ACTIVE" || status === "NEVER_SUPPRESS";
      });
      const suppressionEvidence: Record<string, string> = {};
      for (const slug of suppressed) {
        const ev = evidenceMap.get(slug);
        if (ev) suppressionEvidence[slug] = ev;
      }
      evidence.matchedCategories = implicatedSlugs;
      evidence.suppressedCategories = suppressed;
      evidence.activeCategories = active;
      if (Object.keys(suppressionEvidence).length > 0) {
        evidence.suppressionEvidence = suppressionEvidence;
      }
    }

    flags.push({
      type: "MISSING_DISCLOSURE",
      severity: "WARN",
      evidence,
    });
  }
  return flags;
}

/** Generic patterns used in stage-1 disclosure gate (exported for tests). */
export function getGenericDisclosurePatterns(): RegExp[] {
  return DISCLOSURE_PATTERNS;
}

/** Catalog slug count for posture ring. */
export function getDisclosureCategoryCount(): number {
  return DISCLOSURE_CATEGORY_CATALOG.length;
}
