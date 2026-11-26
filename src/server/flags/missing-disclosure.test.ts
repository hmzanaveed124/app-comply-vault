import { describe, expect, it } from "vitest";
import { detectMissingDisclosureFlags } from "./missing-disclosure";
import type { ExtractionData } from "~/server/extraction/types";
import type { DisclosureCategoryStatus } from "../../../generated/prisma";

const baseExtraction: ExtractionData = {
  topics: [],
  recommendations: [
    {
      text: "I recommend you increase equity exposure significantly.",
      startTime: 100,
      endTime: 120,
      snippet: "recommend equity",
    },
  ],
  disclosures: [],
  decisions: [],
  followUps: [],
  evidenceMap: [],
  extractedAt: new Date().toISOString(),
  provider: "test",
  processingTime: 1,
};

function profile(
  entries: Array<[string, DisclosureCategoryStatus]>,
  evidence?: Array<[string, string]>,
) {
  return {
    statusBySlug: new Map(entries),
    suppressionEvidenceBySlug: new Map(evidence ?? []),
  };
}

describe("detectMissingDisclosureFlags two-stage pipeline", () => {
  it("raises flag when no profile", () => {
    const flags = detectMissingDisclosureFlags(baseExtraction);
    expect(flags.length).toBeGreaterThanOrEqual(1);
  });

  it("retains potential concerns even when a legacy category was suppressed", () => {
    const extraction: ExtractionData = {
      ...baseExtraction,
      recommendations: [
        {
          text: "Given your risk tolerance, this allocation is suitable for you.",
          startTime: 10,
          endTime: 20,
          snippet: "suitability",
        },
      ],
    };
    const flags = detectMissingDisclosureFlags(extraction, {
      profile: profile([["suitability", "SUPPRESSING"]]),
    });
    expect(flags).toHaveLength(1);
    expect(flags[0]?.severity).toBe("WARN");
    expect(flags[0]?.evidence.limitations).toContain(
      "not a confirmed deficiency",
    );
  });

  it("does not flag when valid nearby disclosure exists", () => {
    const extraction: ExtractionData = {
      ...baseExtraction,
      disclosures: [
        {
          text: "There is risk of loss and no guarantee of returns.",
          startTime: 90,
          endTime: 99,
          snippet: "risk disclosure",
        },
      ],
    };
    const flags = detectMissingDisclosureFlags(extraction, {
      profile: profile([["risk-of-loss", "SUPPRESSING"]]),
    });
    expect(flags).toHaveLength(0);
  });

  it("includes matchedCategories for mixed profile", () => {
    const extraction: ExtractionData = {
      ...baseExtraction,
      recommendations: [
        {
          text: "Given the conflict of interest and our fee schedule, we recommend this allocation.",
          startTime: 10,
          endTime: 20,
          snippet: "conflict fees",
        },
      ],
    };
    const flags = detectMissingDisclosureFlags(extraction, {
      profile: profile(
        [
          ["fees-compensation", "SUPPRESSING"],
          ["conflicts-of-interest", "NEVER_SUPPRESS"],
        ],
        [["fees-compensation", "ADV Part 2A Item 5"]],
      ),
    });
    expect(flags).toHaveLength(1);
    expect(flags[0]?.evidence.matchedCategories).toBeDefined();
    expect(flags[0]?.evidence.suppressedCategories).toContain(
      "fees-compensation",
    );
  });
});
