import { parseContextualControl } from "~/lib/contextual-control";
import type {
  DisclosureCategory,
  FirmProfile,
} from "../../../generated/prisma";
import {
  getCategoryBySlug,
  resolveAdvItemRef,
} from "~/lib/disclosure-categories";
import type {
  DisclosureCategoryDto,
  FirmProfileDto,
  SuppressionLogEntryDto,
} from "~/lib/firm-profile-types";

export function mapFirmProfileDto(
  profile: FirmProfile & { approvedAt: Date | null },
): FirmProfileDto {
  return {
    id: profile.id,
    workspaceId: profile.workspaceId,
    status: profile.status,
    crdNumber: profile.crdNumber,
    ccoName: profile.ccoName,
    advFilingDate: profile.advFilingDate?.toISOString() ?? null,
    aumUsd: profile.aumUsd?.toString() ?? null,
    advDocumentUrl: profile.advDocumentUrl,
    riskFlags: profile.riskFlags ?? [],
    setupCompletedAt: profile.setupCompletedAt?.toISOString() ?? null,
    approvedAt: profile.approvedAt?.toISOString() ?? null,
    approvedByUserId: profile.approvedByUserId,
    needsReapproval: false,
  };
}

export function mapDisclosureCategoryDto(
  cat: DisclosureCategory,
): DisclosureCategoryDto {
  const def = getCategoryBySlug(cat.slug);
  return {
    slug: cat.slug,
    displayName: def?.displayName ?? cat.slug,
    section: def?.section ?? "core",
    neverSuppress: def?.neverSuppress ?? false,
    status: cat.status,
    suppressionEvidence: cat.suppressionEvidence,
    controlConfig: parseContextualControl(cat.controlConfig),
    advItemRef: resolveAdvItemRef(cat.advItemRef, cat.slug),
    advPage: cat.advPage,
    description: def?.description ?? "",
  };
}

export function mapSuppressionLogDto(entry: {
  id: string;
  categorySlug: string;
  action: "ACTIVATED" | "DEACTIVATED";
  previousStatus: DisclosureCategory["status"] | null;
  newStatus: DisclosureCategory["status"];
  evidenceSnapshot: string | null;
  createdAt: Date;
  meetingId: string | null;
}): SuppressionLogEntryDto {
  const def = getCategoryBySlug(entry.categorySlug);
  return {
    id: entry.id,
    categorySlug: entry.categorySlug,
    categoryDisplayName: def?.displayName ?? entry.categorySlug,
    action: entry.action,
    previousStatus: entry.previousStatus,
    newStatus: entry.newStatus,
    evidenceSnapshot: entry.evidenceSnapshot,
    createdAt: entry.createdAt.toISOString(),
    meetingId: entry.meetingId,
  };
}
