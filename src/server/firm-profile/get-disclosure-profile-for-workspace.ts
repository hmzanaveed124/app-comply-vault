import { parseContextualControl } from "~/lib/contextual-control";
import type { DisclosureCategoryStatus } from "../../../generated/prisma";
import { db } from "~/server/db";
import type { DisclosureProfileInput } from "~/server/flags/missing-disclosure";

export async function getDisclosureProfileForWorkspace(
  workspaceId: string,
): Promise<DisclosureProfileInput | null> {
  const profile = await db.firmProfile.findFirst({
    where: { workspaceId, deletedAt: null, status: "ACTIVE" },
    include: {
      disclosureCategories: true,
    },
  });

  if (!profile) {
    return null;
  }

  const statusBySlug = new Map<string, DisclosureCategoryStatus>();
  const suppressionEvidenceBySlug = new Map<string, string>();

  for (const cat of profile.disclosureCategories) {
    statusBySlug.set(cat.slug, cat.status);
    if (cat.status === "SUPPRESSING" && cat.suppressionEvidence) {
      suppressionEvidenceBySlug.set(cat.slug, cat.suppressionEvidence);
    }
  }

  const controls = profile.approvedAt
    ? profile.disclosureCategories.flatMap((cat) => {
        const config = parseContextualControl(cat.controlConfig);
        return config
          ? [
              {
                slug: cat.slug,
                config,
                approvedAt: profile.approvedAt!.toISOString(),
                approvedByUserId: profile.approvedByUserId,
              },
            ]
          : [];
      })
    : [];
  return { statusBySlug, suppressionEvidenceBySlug, controls };
}
