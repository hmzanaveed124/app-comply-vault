import { getCategoryBySlug } from "~/lib/disclosure-categories";
import type { FirmProfileExportSectionDto } from "~/lib/firm-profile-types";
import { db } from "~/server/db";

const EXPORT_STATEMENT =
  "Legacy category exceptions are listed for historical context only. They do not suppress new transcript observations or establish adequate disclosure. Applicable contextual controls and their approval versions are preserved with new observations.";

export async function getFirmProfileSummaryForExport(
  workspaceId: string,
): Promise<FirmProfileExportSectionDto> {
  const profile = await db.firmProfile.findFirst({
    where: { workspaceId, deletedAt: null, status: "ACTIVE" },
    include: {
      disclosureCategories: { where: { status: "SUPPRESSING" } },
      versions: {
        orderBy: { approvedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!profile) {
    return {
      include: false,
      warning: null,
      versionReference: null,
      versionApprovedAt: null,
      approvingCcoName: null,
      suppressedCategories: [],
      statement: EXPORT_STATEMENT,
    };
  }

  const suppressedCategories = profile.disclosureCategories.map((c) => ({
    slug: c.slug,
    displayName: getCategoryBySlug(c.slug)?.displayName ?? c.slug,
    evidence: c.suppressionEvidence ?? "",
  }));

  const lastApproved = profile.versions.find(
    (v) => v.versionType === "APPROVED",
  );
  const initialSetup = profile.versions.find(
    (v) => v.versionType === "INITIAL_SETUP",
  );

  let warning: string | null = null;
  let versionReference: string | null = null;
  let versionApprovedAt: string | null = null;
  let approvingCcoName: string | null = profile.ccoName;

  if (!profile.approvedAt) {
    warning = "Firm disclosure profile has not been formally approved.";
    versionReference = initialSetup?.id ?? null;
  } else if (lastApproved) {
    versionReference = lastApproved.id;
    versionApprovedAt = lastApproved.approvedAt.toISOString();
    if (profile.approvedByUserId) {
      const user = await db.user.findUnique({
        where: { id: profile.approvedByUserId },
        select: { name: true },
      });
      approvingCcoName = user?.name ?? profile.ccoName;
    }
  }

  if (lastApproved && !profile.approvedAt) {
    const dateStr = lastApproved.approvedAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    warning = `Profile changed since last approval on ${dateStr} — re-approval pending.`;
    versionReference = lastApproved.id;
    versionApprovedAt = lastApproved.approvedAt.toISOString();
  }

  return {
    include: true,
    warning,
    versionReference,
    versionApprovedAt,
    approvingCcoName,
    suppressedCategories,
    statement: EXPORT_STATEMENT,
  };
}
