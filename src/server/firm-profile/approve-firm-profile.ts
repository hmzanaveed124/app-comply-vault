import { getCategoryBySlug } from "~/lib/disclosure-categories";
import { db } from "~/server/db";

export class ApproveProfileError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export async function approveFirmProfile(params: {
  workspaceId: string;
  firmProfileId: string;
  userId: string;
}): Promise<{ success: true; approvedAt: string; versionId: string }> {
  const profile = await db.firmProfile.findFirst({
    where: {
      id: params.firmProfileId,
      workspaceId: params.workspaceId,
      deletedAt: null,
      status: "ACTIVE",
    },
    include: { disclosureCategories: true },
  });

  if (!profile) {
    throw new ApproveProfileError("Firm profile not found or not active");
  }

  const snapshot = {
    categories: profile.disclosureCategories.map((c) => ({
      slug: c.slug,
      displayName: getCategoryBySlug(c.slug)?.displayName ?? c.slug,
      status: c.status,
      suppressionEvidence: c.suppressionEvidence,
      controlConfig: c.controlConfig,
    })),
    approvedAt: new Date().toISOString(),
  };

  const approvedAt = new Date();

  const version = await db.$transaction(async (tx) => {
    const approval = await tx.firmProfile.updateMany({
      where: { id: profile.id, updatedAt: profile.updatedAt },
      data: {
        approvedAt,
        approvedByUserId: params.userId,
      },
    });

    if (approval.count !== 1)
      throw new ApproveProfileError(
        "The profile changed during approval. Refresh and review the current controls.",
      );

    const created = await tx.firmProfileVersion.create({
      data: {
        firmProfileId: profile.id,
        workspaceId: params.workspaceId,
        versionType: "APPROVED",
        approvedByUserId: params.userId,
        approvedAt,
        snapshot,
      },
    });

    await tx.auditEvent.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId,
        action: "FIRM_PROFILE_APPROVED",
        resourceType: "firm_profile",
        resourceId: profile.id,
        metadata: {
          versionId: created.id,
          snapshotCategoryCount: snapshot.categories.length,
        },
      },
    });

    return created;
  });

  return {
    success: true,
    approvedAt: approvedAt.toISOString(),
    versionId: version.id,
  };
}
