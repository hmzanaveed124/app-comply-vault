import { describe, expect, it } from "vitest";
import {
  contextualControlSchema,
  controlMatchesRecommendation,
} from "./contextual-control";
const config = {
  applicability: "Advisers recommending insurance products",
  triggerKeywords: ["annuity", "rollover"],
  evidenceRequirements:
    "Review compensation disclosure and linked delivery evidence",
  policyBasis: "Firm policy section 4.2",
  exceptions: "General education without a recommendation",
  effectiveDate: "2026-11-01",
};
describe("contextual controls", () => {
  it("requires applicability, evidence, basis and exceptions", () =>
    expect(
      contextualControlSchema.safeParse({ triggerKeywords: ["annuity"] })
        .success,
    ).toBe(false));
  it("matches the approved recommendation scope without suppressing a category", () => {
    expect(
      controlMatchesRecommendation(
        config,
        "Consider an ANNUITY",
        new Date("2026-11-26"),
      ),
    ).toBe(true);
    expect(
      controlMatchesRecommendation(
        config,
        "Change your address",
        new Date("2026-11-26"),
      ),
    ).toBe(false);
  });
  it("does not apply controls before the effective date", () =>
    expect(
      controlMatchesRecommendation(config, "annuity", new Date("2026-10-31")),
    ).toBe(false));
});
