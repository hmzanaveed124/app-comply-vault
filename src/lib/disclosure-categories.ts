/**
 * Single source of truth for disclosure category slugs, display names,
 * sections, never-suppress flags, and regex patterns (UI + flag engine).
 */

export type DisclosureCategorySection = "core" | "regulatory" | "operational";

export type DisclosureCategoryDefinition = {
  slug: string;
  displayName: string;
  section: DisclosureCategorySection;
  neverSuppress: boolean;
  /** Standard Part 2A Item reference until live brochure parse (Epic 4). */
  advItemRef: string;
  description: string;
  patterns: RegExp[];
};

const pattern = (sources: string[]): RegExp[] =>
  sources.map((s) => new RegExp(s, "i"));

export const DISCLOSURE_CATEGORY_CATALOG: readonly DisclosureCategoryDefinition[] =
  [
    {
      slug: "fees-compensation",
      displayName: "Fees & Compensation",
      section: "core",
      neverSuppress: false,
      advItemRef: "Part 2A · Item 5",
      description:
        "Advisory fees, billing practices, and compensation arrangements.",
      patterns: pattern(["fees?", "compensat", "billing", "advisory fee"]),
    },
    {
      slug: "risk-of-loss",
      displayName: "Risk of Loss",
      section: "core",
      neverSuppress: false,
      advItemRef: "Part 2A · Item 8",
      description: "Investment risk and potential for loss of principal.",
      patterns: pattern([
        "risk of loss",
        "may lose",
        "past performance",
        "principal",
      ]),
    },
    {
      slug: "no-guarantee",
      displayName: "No Guarantee",
      section: "core",
      neverSuppress: false,
      advItemRef: "Part 2A · Item 8",
      description: "No guarantee of investment performance or returns.",
      patterns: pattern(["no guarantee", "not guaranteed", "cannot guarantee"]),
    },
    {
      slug: "fiduciary-duty",
      displayName: "Fiduciary Duty",
      section: "core",
      neverSuppress: false,
      advItemRef: "Part 2A · Item 13",
      description: "Fiduciary status and obligations under Advisers Act.",
      patterns: pattern(["fiduciar", "best interest", "206"]),
    },
    {
      slug: "suitability",
      displayName: "Suitability",
      section: "core",
      neverSuppress: false,
      advItemRef: "Part 2A · Item 13",
      description: "Client suitability and investment policy considerations.",
      patterns: pattern(["suitabilit", "risk tolerance", "investment policy"]),
    },
    {
      slug: "custody",
      displayName: "Custody",
      section: "core",
      neverSuppress: false,
      advItemRef: "Part 2A · Item 15",
      description: "Custody arrangements, SLOA, and fee deduction practices.",
      patterns: pattern(["custod", "sloa", "fee deduction"]),
    },
    {
      slug: "conflicts-of-interest",
      displayName: "Conflicts of Interest",
      section: "regulatory",
      neverSuppress: true,
      advItemRef: "Part 2A · Item 10",
      description:
        "Material conflicts assessed in the context of the advisory relationship and relevant recommendations.",
      patterns: pattern(["conflict", "dual.hat", "rollover", "affiliate"]),
    },
    {
      slug: "insurance-comp",
      displayName: "Insurance Comp.",
      section: "regulatory",
      neverSuppress: true,
      advItemRef: "Part 2A · Item 10",
      description: "Insurance commissions and non-cash compensation.",
      patterns: pattern(["insurance commission", "non.cash", "bonus", "trip"]),
    },
    {
      slug: "disciplinary-history",
      displayName: "Disciplinary History",
      section: "regulatory",
      neverSuppress: true,
      advItemRef: "Part 2A · Item 9",
      description: "Disciplinary history and regulatory sanctions.",
      patterns: pattern([
        "disciplinar",
        "consent order",
        "sanction",
        "penalty",
      ]),
    },
    {
      slug: "brokerage-practices",
      displayName: "Brokerage Practices",
      section: "operational",
      neverSuppress: false,
      advItemRef: "Part 2A · Item 12",
      description: "Best execution, soft dollars, and share class selection.",
      patterns: pattern(["best execution", "soft dollar", "share class"]),
    },
    {
      slug: "code-of-ethics",
      displayName: "Code of Ethics",
      section: "operational",
      neverSuppress: false,
      advItemRef: "Part 2A · Item 11",
      description: "Personal trading, access persons, and IPO pre-approval.",
      patterns: pattern([
        "personal trading",
        "access person",
        "ipo pre.approv",
      ]),
    },
    {
      slug: "referral-comp",
      displayName: "Referral Comp.",
      section: "operational",
      neverSuppress: false,
      advItemRef: "Part 2A · Item 14",
      description: "Referral arrangements, promoters, and solicitors.",
      patterns: pattern(["referral", "promoter", "solicitor"]),
    },
  ] as const;

export const NEVER_SUPPRESS_SLUGS = DISCLOSURE_CATEGORY_CATALOG.filter(
  (c) => c.neverSuppress,
).map((c) => c.slug);

export function getCategoryBySlug(
  slug: string,
): DisclosureCategoryDefinition | undefined {
  return DISCLOSURE_CATEGORY_CATALOG.find((c) => c.slug === slug);
}

export function getCategoriesBySection(
  section: DisclosureCategorySection,
): DisclosureCategoryDefinition[] {
  return DISCLOSURE_CATEGORY_CATALOG.filter((c) => c.section === section);
}

export function resolveAdvItemRef(
  storedRef: string | null,
  slug: string,
): string | null {
  if (storedRef) {
    return storedRef;
  }
  return getCategoryBySlug(slug)?.advItemRef ?? null;
}

export function iapdFirmSummaryUrl(crdNumber: string): string {
  return `https://adviserinfo.sec.gov/firm/summary/${encodeURIComponent(crdNumber.trim())}`;
}
