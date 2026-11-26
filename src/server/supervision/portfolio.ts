import type { FlagStatus, PrismaClient } from "../../../generated/prisma";
import type {
  FirmSupervisionRow,
  PortfolioSupervisionSummary,
  SupervisionCounts,
  SupervisionFilterOption,
  SupervisionPatternDto,
} from "~/lib/types";
import { activeUserWorkspaceWhere } from "~/lib/user-workspace-filters";
import {
  ADVIZORSTACK_ADVISERS,
  ADVIZORSTACK_EXPECTED_COUNTS,
  ADVIZORSTACK_FIRMS,
  ADVIZORSTACK_ONBOARDING_TYPE,
  ADVIZORSTACK_PRIMARY_FINDING,
  isAdvizorStackFirmWorkspaceId,
} from "~/server/supervision/advizorstack-tenant";
import type { SupervisionFilterState } from "~/server/supervision/filters";
import {
  defaultSupervisionWindow,
  parseSupervisionFilters,
  supervisionHref,
  toSummaryQuery,
} from "~/server/supervision/filters";
import { getSupervisionSummary } from "~/server/supervision/service";

function emptyCounts(): SupervisionCounts {
  return {
    totalProcessed: 0,
    clearedOrDeprioritised: 0,
    routineSamples: 0,
    priorityFindings: 0,
    heldInteractions: 0,
    openRemediation: 0,
  };
}

function sumCounts(parts: SupervisionCounts[]): SupervisionCounts {
  return parts.reduce<SupervisionCounts>(
    (acc, part) => ({
      totalProcessed: acc.totalProcessed + part.totalProcessed,
      clearedOrDeprioritised:
        acc.clearedOrDeprioritised + part.clearedOrDeprioritised,
      routineSamples: acc.routineSamples + part.routineSamples,
      priorityFindings: acc.priorityFindings + part.priorityFindings,
      heldInteractions: acc.heldInteractions + part.heldInteractions,
      openRemediation: acc.openRemediation + part.openRemediation,
    }),
    emptyCounts(),
  );
}

function buildSelectivityStatement(
  priorityFindings: number,
  totalProcessed: number,
): string {
  const findingLabel = priorityFindings === 1 ? "finding" : "findings";
  const interactionLabel =
    totalProcessed === 1 ? "interaction" : "interactions";
  return `${priorityFindings} ${findingLabel} require review from ${totalProcessed} processed ${interactionLabel}.`;
}

function emptyFilterOptions(): PortfolioSupervisionSummary["filterOptions"] {
  return { firms: [], advisers: [] };
}

/**
 * Returns firm workspace IDs with active compliance memberships.
 * Never returns firms outside the caller's memberships.
 */
export async function listAuthorisedFirmWorkspaceIds(
  db: PrismaClient,
  userId: string,
  firmIdFilter?: string,
): Promise<string[]> {
  const memberships = await db.userWorkspace.findMany({
    where: {
      userId,
      role: { in: ["OWNER_CCO", "MEMBER"] },
      ...activeUserWorkspaceWhere,
    },
    select: { workspaceId: true },
  });
  const ids = [...new Set(memberships.map((row) => row.workspaceId))];

  if (firmIdFilter) {
    if (!ids.includes(firmIdFilter)) {
      return [];
    }
    return [firmIdFilter];
  }

  return ids;
}

export async function listSupervisionFilterOptions(
  db: PrismaClient,
  authorisedFirmIds: string[],
): Promise<PortfolioSupervisionSummary["filterOptions"]> {
  if (authorisedFirmIds.length === 0) {
    return emptyFilterOptions();
  }

  const workspaces = await db.workspace.findMany({
    where: { id: { in: authorisedFirmIds } },
    select: { id: true, name: true },
  });
  const firms: SupervisionFilterOption[] = authorisedFirmIds.map((id) => {
    const seeded = ADVIZORSTACK_FIRMS.find((firm) => firm.workspaceId === id);
    const workspace = workspaces.find((row) => row.id === id);
    return {
      id,
      label: workspace?.name ?? seeded?.name ?? id,
    };
  });

  const memberships = await db.userWorkspace.findMany({
    where: {
      workspaceId: { in: authorisedFirmIds },
      role: "ADVISOR",
      ...activeUserWorkspaceWhere,
    },
    select: {
      userId: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const advisersById = new Map<string, SupervisionFilterOption>();
  for (const seeded of ADVIZORSTACK_ADVISERS) {
    if (memberships.some((row) => row.userId === seeded.id)) {
      advisersById.set(seeded.id, { id: seeded.id, label: seeded.name });
    }
  }
  for (const row of memberships) {
    if (advisersById.has(row.userId)) continue;
    advisersById.set(row.userId, {
      id: row.userId,
      label: row.user.name ?? row.user.email ?? row.userId,
    });
  }

  return {
    firms,
    advisers: [...advisersById.values()].sort((a, b) =>
      a.label.localeCompare(b.label),
    ),
  };
}

async function buildFirmRow(
  db: PrismaClient,
  workspaceId: string,
  summaryCounts: SupervisionCounts,
  filters: SupervisionFilterState,
): Promise<FirmSupervisionRow> {
  const firm = ADVIZORSTACK_FIRMS.find((f) => f.workspaceId === workspaceId);
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { name: true },
  });
  const query = toSummaryQuery(filters);
  const dateFilter = {
    gte: query.dateFrom,
    lte: query.dateTo,
  };

  const openFlags = await db.flag.findMany({
    where: {
      workspaceId,
      status: filters.findingStatus
        ? filters.findingStatus
        : { in: ["OPEN", "IN_REMEDIATION", "PENDING_VERIFICATION"] },
      ...(filters.control ? { type: filters.control } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.channel ? { sourceType: filters.channel } : {}),
      meeting: {
        meetingDate: dateFilter,
        ...(filters.adviserId
          ? { advisorCertifiedByUserId: filters.adviserId }
          : {}),
      },
    },
    select: { type: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const controlCounts = new Map<string, number>();
  for (const flag of openFlags) {
    controlCounts.set(flag.type, (controlCounts.get(flag.type) ?? 0) + 1);
  }
  let topControlConcern: string | null = null;
  let topCount = 0;
  for (const [control, count] of controlCounts) {
    if (count > topCount) {
      topControlConcern = control;
      topCount = count;
    }
  }

  const rolloverOpen = openFlags.filter(
    (f) => f.type === "MISSING_DISCLOSURE",
  ).length;
  const firmFilters: SupervisionFilterState = {
    ...filters,
    firmId: workspaceId,
  };

  return {
    firmId: workspaceId,
    firmName: workspace?.name ?? firm?.name ?? workspaceId,
    processedInteractions: summaryCounts.totalProcessed,
    priorityFindings: summaryCounts.priorityFindings,
    openRemediation: summaryCounts.openRemediation,
    oldestUnresolvedFindingAt: openFlags[0]?.createdAt.toISOString() ?? null,
    topControlConcern,
    trend:
      rolloverOpen >= 2
        ? "increasing"
        : summaryCounts.priorityFindings > 0
          ? "stable"
          : "insufficient_data",
    coverageStatus: summaryCounts.totalProcessed > 0 ? "covered" : "gap",
    href: supervisionHref(`/firms/${workspaceId}/supervision`, firmFilters),
  };
}

async function buildPatterns(
  db: PrismaClient,
  firmIds: string[],
  filters: SupervisionFilterState,
): Promise<SupervisionPatternDto[]> {
  if (firmIds.length === 0) return [];
  if (filters.channel === "EMAIL") return [];
  if (filters.outcome && filters.outcome !== "ESCALATED") return [];

  const query = toSummaryQuery(filters);
  const dateFilter = {
    gte: query.dateFrom,
    lte: query.dateTo,
  };
  const meetingMatch = {
    meetingDate: dateFilter,
    ...(filters.adviserId
      ? { advisorCertifiedByUserId: filters.adviserId }
      : {}),
  };

  const defaultPatternStatuses: FlagStatus[] = [
    "OPEN",
    "IN_REMEDIATION",
    "PENDING_VERIFICATION",
    "CLOSED",
  ];
  const statusFilter = filters.findingStatus
    ? filters.findingStatus
    : { in: defaultPatternStatuses };

  const rolloverFlags =
    !filters.control || filters.control === "MISSING_DISCLOSURE"
      ? await db.flag.findMany({
          where: {
            workspaceId: { in: firmIds },
            type: "MISSING_DISCLOSURE",
            status: statusFilter,
            ...(filters.severity ? { severity: filters.severity } : {}),
            meeting: meetingMatch,
          },
          select: { workspaceId: true, status: true },
        })
      : [];

  const patterns: SupervisionPatternDto[] = [];
  if (
    (!filters.control || filters.control === "MISSING_DISCLOSURE") &&
    rolloverFlags.length >= 2
  ) {
    const firmsAffected = new Set(rolloverFlags.map((f) => f.workspaceId)).size;
    const openFindings = rolloverFlags.filter((f) =>
      ["OPEN", "IN_REMEDIATION", "PENDING_VERIFICATION"].includes(f.status),
    ).length;
    patterns.push({
      id: "pattern-rollover-documentation",
      title: "Rollover documentation weakness",
      summary: `${rolloverFlags.length} rollover-documentation findings across ${firmsAffected} firms. Human review required — ComplyVault does not independently determine a violation.`,
      controlArea: "MISSING_DISCLOSURE",
      firmsAffected,
      openFindings,
      href: supervisionHref("/priority-inbox", filters, {
        control: "MISSING_DISCLOSURE",
        finding: ADVIZORSTACK_PRIMARY_FINDING.flagId,
      }),
    });
  }

  if (!filters.control || filters.control === "PERFORMANCE_CLAIM") {
    const perf = await db.flag.count({
      where: {
        workspaceId: { in: firmIds },
        type: "PERFORMANCE_CLAIM",
        status: filters.findingStatus
          ? filters.findingStatus
          : { in: ["OPEN", "IN_REMEDIATION", "PENDING_VERIFICATION"] },
        ...(filters.severity ? { severity: filters.severity } : {}),
        meeting: meetingMatch,
      },
    });
    if (perf > 0) {
      patterns.push({
        id: "pattern-performance-language",
        title: "Unsupported performance language",
        summary: `${perf} open performance-language triage signal(s) require human review.`,
        controlArea: "PERFORMANCE_CLAIM",
        firmsAffected: 1,
        openFindings: perf,
        href: supervisionHref("/priority-inbox", filters, {
          control: "PERFORMANCE_CLAIM",
        }),
      });
    }
  }

  if (!filters.control || filters.control === "FEE_DISPUTE") {
    const fee = await db.flag.count({
      where: {
        workspaceId: { in: firmIds },
        type: "FEE_DISPUTE",
        status: filters.findingStatus
          ? filters.findingStatus
          : { in: ["OPEN", "IN_REMEDIATION", "PENDING_VERIFICATION"] },
        ...(filters.severity ? { severity: filters.severity } : {}),
        meeting: meetingMatch,
      },
    });
    if (fee > 0) {
      patterns.push({
        id: "pattern-fee-disclosure",
        title: "Fee-disclosure inconsistency",
        summary: `${fee} open fee-disclosure triage signal(s) require human review.`,
        controlArea: "FEE_DISPUTE",
        firmsAffected: 1,
        openFindings: fee,
        href: supervisionHref("/priority-inbox", filters, {
          control: "FEE_DISPUTE",
        }),
      });
    }
  }

  return patterns.slice(0, 3);
}

export type PortfolioSupervisionFilters = SupervisionFilterState;

export async function getPortfolioSupervisionSummary(
  db: PrismaClient,
  userId: string,
  filters: SupervisionFilterState = parseSupervisionFilters({}, new Date()),
): Promise<PortfolioSupervisionSummary> {
  const authorisedIds = await listAuthorisedFirmWorkspaceIds(db, userId);
  const filterOptions = await listSupervisionFilterOptions(db, authorisedIds);
  const firmIds = await listAuthorisedFirmWorkspaceIds(
    db,
    userId,
    filters.firmId,
  );

  if (firmIds.length === 0) {
    return {
      synthetic: false,
      counts: emptyCounts(),
      selectivityStatement: buildSelectivityStatement(0, 0),
      firms: [],
      patterns: [],
      filterOptions,
    };
  }

  const query = toSummaryQuery(filters);
  const perFirm = await Promise.all(
    firmIds.map(async (workspaceId) => {
      const summary = await getSupervisionSummary(db, workspaceId, {
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        firmId: workspaceId,
        adviserId: query.adviserId,
        channel: query.channel,
        control: query.control,
        outcome: query.outcome,
        severity: query.severity,
        findingStatus: query.findingStatus,
      });
      const row = await buildFirmRow(db, workspaceId, summary.counts, filters);
      return { summary, row };
    }),
  );

  const counts = sumCounts(perFirm.map((part) => part.summary.counts));
  const patterns = await buildPatterns(db, firmIds, filters);

  return {
    synthetic: firmIds.every((id) => isAdvizorStackFirmWorkspaceId(id)),
    counts,
    selectivityStatement: buildSelectivityStatement(
      counts.priorityFindings,
      counts.totalProcessed,
    ),
    firms: perFirm.map((part) => part.row),
    patterns,
    filterOptions,
  };
}

export function restrictToAuthorisedFirms(
  authorisedIds: string[],
  firmIdFilter?: string,
): string[] {
  if (!firmIdFilter) return authorisedIds;
  return authorisedIds.includes(firmIdFilter) ? [firmIdFilter] : [];
}

export const portfolioTestHelpers = {
  sumCounts,
  emptyCounts,
  buildSelectivityStatement,
  expectedSeededPortfolioCounts: ADVIZORSTACK_EXPECTED_COUNTS,
  defaultSupervisionWindow,
  restrictToAuthorisedFirms,
};
