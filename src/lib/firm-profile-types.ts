import type {
  DisclosureCategoryStatus,
  FirmProfileStatus,
  FirmProfileVersionType,
} from "../../generated/prisma";

export type FirmProfileDto = {
  id: string;
  workspaceId: string;
  status: FirmProfileStatus;
  crdNumber: string | null;
  ccoName: string | null;
  advFilingDate: string | null;
  aumUsd: string | null;
  advDocumentUrl: string | null;
  riskFlags: string[];
  setupCompletedAt: string | null;
  approvedAt: string | null;
  approvedByUserId: string | null;
  needsReapproval: boolean;
};

export type DisclosureCategoryDto = {
  slug: string;
  displayName: string;
  section: "core" | "regulatory" | "operational";
  neverSuppress: boolean;
  status: DisclosureCategoryStatus;
  suppressionEvidence: string | null;
  advItemRef: string | null;
  advPage: number | null;
  description: string;
  controlConfig?: import("./contextual-control").ContextualControl | null;
};

export type SuppressionLogEntryDto = {
  id: string;
  categorySlug: string;
  categoryDisplayName: string;
  action: "ACTIVATED" | "DEACTIVATED";
  previousStatus: DisclosureCategoryStatus | null;
  newStatus: DisclosureCategoryStatus;
  evidenceSnapshot: string | null;
  createdAt: string;
  meetingId: string | null;
};

export type CockpitMetricsDto = {
  meetingsReviewed30d: number;
  flagsTotal30d: number;
  hasMeetingsReviewed30d: boolean;
};

export type FirmProfileVersionDto = {
  id: string;
  versionType: FirmProfileVersionType;
  approvedAt: string;
  approvedByUserId: string | null;
};

export type CockpitBundleDto = {
  profile: FirmProfileDto | null;
  categories: DisclosureCategoryDto[];
  suppressionLog: SuppressionLogEntryDto[];
  metrics: CockpitMetricsDto;
  workspaceName: string;
  invalidatedApprovalAt: string | null;
};

export type FirmProfileExportSectionDto = {
  include: boolean;
  warning: string | null;
  versionReference: string | null;
  versionApprovedAt: string | null;
  approvingCcoName: string | null;
  suppressedCategories: Array<{
    slug: string;
    displayName: string;
    evidence: string;
  }>;
  statement: string;
};
