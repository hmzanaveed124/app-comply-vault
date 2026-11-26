/**
 * CV-SI-006 — CCO Priority Inbox.
 * Escalated findings only. Cleared and un-escalated routine samples never appear.
 */

import type {
  FlagSeverity,
  FlagStatus,
  PrismaClient,
} from "../../../generated/prisma";
import type {
  PriorityInboxCounts,
  PriorityInboxDto,
  PriorityInboxFindingDto,
  PriorityInboxTab,
  SupervisionCounts,
} from "~/lib/types";
import {
  ADVIZORSTACK_FIRMS,
  isAdvizorStackFirmWorkspaceId,
} from "~/server/supervision/advizorstack-tenant";
import type { SupervisionFilterState } from "~/server/supervision/filters";
import {
  SUPERVISION_FILTER_LABELS,
  supervisionHref,
  toSummaryQuery,
} from "~/server/supervision/filters";
import {
  getPortfolioSupervisionSummary,
  listAuthorisedFirmWorkspaceIds,
} from "~/server/supervision/portfolio";

const CLOSED_STATUSES = new Set<FlagStatus>(["CLOSED", "CLOSED_ACCEPTED_RISK"]);
const REMEDIATION_STATUSES = new Set<FlagStatus>([
  "IN_REMEDIATION",
  "PENDING_VERIFICATION",
]);

export const DEFAULT_INBOX_TAB: PriorityInboxTab = "unassigned";

type InboxSourceMeeting = {
  id: string;
  clientName: string;
  supervisoryOutcome: string | null;
  outcomeConfidence: number | null;
  advisorCertifiedByUserId: string | null;
  advisorCertifiedByUser: { id: string; name: string | null } | null;
  transcript: unknown;
};

type InboxSourceThread = {
  id: string;
  subject: string | null;
  supervisoryOutcome: string | null;
  outcomeConfidence: number | null;
};

type InboxFlagRow = {
  id: string;
  workspaceId: string;
  type: string;
  severity: FlagSeverity;
  status: FlagStatus;
  evidence: unknown;
  createdByType: string;
  cmDisposition: string;
  escalationReason: string | null;
  cmTriagedAt: Date | null;
  escalatedAt: Date | null;
  assignedToUserId: string | null;
  assignedToUser: { id: string; name: string | null } | null;
  reviewDueAt: Date | null;
  materiality: "HIGH" | "MEDIUM" | "LOW" | null;
  policyMappingCode: string | null;
  sourceType: "MEETING" | "EMAIL";
  meeting: InboxSourceMeeting | null;
  communication: { thread: InboxSourceThread | null } | null;
  resolutionRecord: {
    tasks: Array<{ status: string; dueDate: Date; ownerId: string }>;
    evidence: Array<{ id: string }>;
  } | null;
  workspace: { id: string; name: string };
};

export function emptyInboxCounts(): PriorityInboxCounts {
  return {
    unassigned: 0,
    assigned: 0,
    in_review: 0,
    remediation: 0,
    escalated: 0,
    closed: 0,
  };
}

export function classifyInboxTab(
  finding: {
    status: FlagStatus;
    assignedToUserId: string | null;
    cmTriagedAt: Date | null;
  },
  viewerUserId: string,
): PriorityInboxTab {
  if (CLOSED_STATUSES.has(finding.status)) {
    return "closed";
  }
  if (REMEDIATION_STATUSES.has(finding.status)) {
    return "remediation";
  }
  if (finding.assignedToUserId && finding.cmTriagedAt) {
    return "in_review";
  }
  if (finding.assignedToUserId === viewerUserId) {
    return "assigned";
  }
  if (!finding.assignedToUserId) {
    return "unassigned";
  }
  return "escalated";
}

export type PriorityInboxEligibilityInput = {
  type: string;
  status: FlagStatus;
  createdByType: string;
  cmDisposition: string;
  escalatedAt: Date | null;
  policyMappingCode: string | null;
  meeting: { supervisoryOutcome: string | null } | null;
  communication: {
    thread: { supervisoryOutcome: string | null } | null;
  } | null;
};

/**
 * Priority Inbox eligibility. Findings without policy mapping are held, not queued.
 */
export function isPriorityInboxEligible(
  row: PriorityInboxEligibilityInput,
): boolean {
  const escalated =
    row.cmDisposition === "ESCALATED" ||
    row.escalatedAt !== null ||
    CLOSED_STATUSES.has(row.status);
  if (!escalated) return false;

  if (!row.policyMappingCode || !row.type) {
    return false;
  }

  const outcome =
    row.meeting?.supervisoryOutcome ??
    row.communication?.thread?.supervisoryOutcome ??
    null;
  if (outcome === "CLEARED" || outcome === "HELD" || outcome === "PARKED") {
    return false;
  }
  if (outcome === "ROUTINE_SAMPLE" && row.createdByType !== "USER") {
    return false;
  }
  return true;
}

function evidenceCount(row: InboxFlagRow): number {
  let count = 0;
  if (row.evidence && typeof row.evidence === "object") {
    count += Array.isArray(row.evidence) ? row.evidence.length : 1;
  }
  count += row.resolutionRecord?.evidence.length ?? 0;
  if (row.meeting?.transcript) count += 1;
  return Math.max(count, 1);
}

function findingTitle(row: InboxFlagRow): string {
  const reason = row.escalationReason?.trim();
  if (reason) {
    const sentence = reason.split(/(?<=[.!?])\s/)[0]?.trim();
    if (sentence) return sentence;
  }
  const knownControl = Object.keys(SUPERVISION_FILTER_LABELS.control).find(
    (key) => key === row.type,
  );
  const control = knownControl
    ? SUPERVISION_FILTER_LABELS.control[
        knownControl as keyof typeof SUPERVISION_FILTER_LABELS.control // CAST: key narrowed from control label map
      ]
    : row.type;
  return `${control} requires human review`;
}

function dueAt(row: InboxFlagRow): string | null {
  if (row.reviewDueAt) return row.reviewDueAt.toISOString();
  const taskDue = row.resolutionRecord?.tasks
    .filter((task) => task.status === "OPEN" || task.status === "IN_PROGRESS")
    .map((task) => task.dueDate)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return taskDue?.toISOString() ?? null;
}

function ownerName(row: InboxFlagRow): string | null {
  if (row.assignedToUser?.name) return row.assignedToUser.name;
  return null;
}

function adviserFrom(row: InboxFlagRow): {
  adviserId: string | null;
  adviserName: string | null;
} {
  const adviser = row.meeting?.advisorCertifiedByUser;
  return {
    adviserId: adviser?.id ?? row.meeting?.advisorCertifiedByUserId ?? null,
    adviserName: adviser?.name ?? null,
  };
}

function toFindingDto(
  row: InboxFlagRow,
  viewerUserId: string,
  filters: SupervisionFilterState,
  repeatAdviserIds: Set<string>,
): PriorityInboxFindingDto {
  const tab = classifyInboxTab(row, viewerUserId);
  const { adviserId, adviserName } = adviserFrom(row);
  const channels: Array<"MEETING" | "EMAIL"> = [];
  if (row.sourceType === "EMAIL" || row.communication?.thread)
    channels.push("EMAIL");
  if (row.sourceType === "MEETING" || row.meeting) channels.push("MEETING");

  return {
    id: row.id,
    title: findingTitle(row),
    firmId: row.workspaceId,
    firmName:
      row.workspace.name ||
      ADVIZORSTACK_FIRMS.find((firm) => firm.workspaceId === row.workspaceId)
        ?.name ||
      row.workspaceId,
    adviserId,
    adviserName,
    clientName:
      row.meeting?.clientName ?? row.communication?.thread?.subject ?? null,
    channels: channels.length > 0 ? channels : [row.sourceType],
    primaryControl: row.type,
    policyMappingCode: row.policyMappingCode ?? "",
    escalationReason:
      row.escalationReason?.trim() || "Escalated for human supervisory review.",
    severity: row.severity,
    materiality:
      row.materiality ?? (row.severity === "CRITICAL" ? "HIGH" : "MEDIUM"),
    confidence:
      row.meeting?.outcomeConfidence ??
      row.communication?.thread?.outcomeConfidence ??
      null,
    dueAt: dueAt(row),
    ownerId: row.assignedToUserId,
    ownerName: ownerName(row),
    repeatAdviser: Boolean(
      adviserId && repeatAdviserIds.has(`${adviserId}:${row.type}`),
    ),
    evidenceCount: evidenceCount(row),
    status: row.status,
    tab,
    href: supervisionHref(`/findings/${row.id}`, filters, {
      tab: filters.inboxTab ?? DEFAULT_INBOX_TAB,
      focus: row.id,
    }),
  };
}

export function repeatAdviserKeys(
  rows: Array<{ adviserId: string | null; primaryControl: string }>,
): Set<string> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.adviserId) continue;
    const key = `${row.adviserId}:${row.primaryControl}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count >= 2).map(([key]) => key),
  );
}

export function countTabs(
  findings: Array<{ tab: PriorityInboxTab }>,
): PriorityInboxCounts {
  const counts = emptyInboxCounts();
  for (const finding of findings) {
    if (finding.tab !== "escalated") {
      counts[finding.tab] += 1;
    }
  }
  counts.escalated = findings.filter(
    (finding) => finding.tab !== "closed",
  ).length;
  return counts;
}

export function filterFindingsForTab<T extends { tab: PriorityInboxTab }>(
  findings: T[],
  tab: PriorityInboxTab,
): T[] {
  if (tab === "escalated") {
    return findings.filter((finding) => finding.tab !== "closed");
  }
  return findings.filter((finding) => finding.tab === tab);
}

function headerFromCounts(
  counts: SupervisionCounts,
): PriorityInboxDto["header"] {
  const findingLabel = counts.priorityFindings === 1 ? "finding" : "findings";
  const interactionLabel =
    counts.totalProcessed === 1 ? "interaction" : "interactions";
  return {
    priorityFindings: counts.priorityFindings,
    totalProcessed: counts.totalProcessed,
    selectivityStatement: `${counts.priorityFindings} ${findingLabel} require review from ${counts.totalProcessed} processed ${interactionLabel}.`,
  };
}

export async function listPriorityInbox(
  db: PrismaClient,
  args: {
    userId: string;
    filters: SupervisionFilterState;
    tab?: PriorityInboxTab;
  },
): Promise<PriorityInboxDto> {
  const tab = args.tab ?? args.filters.inboxTab ?? DEFAULT_INBOX_TAB;
  const filters: SupervisionFilterState = { ...args.filters, inboxTab: tab };
  const query = toSummaryQuery(filters);
  const authorisedIds = await listAuthorisedFirmWorkspaceIds(
    db,
    args.userId,
    filters.firmId,
  );

  if (authorisedIds.length === 0) {
    return {
      tab,
      findings: [],
      tabCounts: emptyInboxCounts(),
      header: headerFromCounts({
        totalProcessed: 0,
        clearedOrDeprioritised: 0,
        routineSamples: 0,
        priorityFindings: 0,
        heldInteractions: 0,
        openRemediation: 0,
      }),
    };
  }

  const dateFilter = { gte: query.dateFrom, lte: query.dateTo };
  const rows = await db.flag.findMany({
    where: {
      workspaceId: { in: authorisedIds },
      AND: [
        {
          OR: [
            { cmDisposition: "ESCALATED" },
            { escalatedAt: { not: null } },
            { status: { in: [...CLOSED_STATUSES] } },
          ],
        },
        {
          OR: [
            {
              status: {
                in: ["OPEN", "IN_REMEDIATION", "PENDING_VERIFICATION"],
              },
            },
            { meeting: { meetingDate: dateFilter } },
            { meetingId: null, createdAt: dateFilter },
          ],
        },
      ],
      ...(filters.control ? { type: filters.control } : {}),
      ...(filters.severity ? { severity: filters.severity } : {}),
      ...(filters.findingStatus ? { status: filters.findingStatus } : {}),
      ...(filters.channel ? { sourceType: filters.channel } : {}),
      ...(filters.adviserId
        ? { meeting: { advisorCertifiedByUserId: filters.adviserId } }
        : {}),
    },
    select: {
      id: true,
      workspaceId: true,
      type: true,
      severity: true,
      status: true,
      evidence: true,
      createdByType: true,
      cmDisposition: true,
      escalationReason: true,
      cmTriagedAt: true,
      escalatedAt: true,
      assignedToUserId: true,
      assignedToUser: { select: { id: true, name: true } },
      reviewDueAt: true,
      materiality: true,
      policyMappingCode: true,
      sourceType: true,
      meeting: {
        select: {
          id: true,
          clientName: true,
          supervisoryOutcome: true,
          outcomeConfidence: true,
          advisorCertifiedByUserId: true,
          advisorCertifiedByUser: { select: { id: true, name: true } },
          transcript: true,
        },
      },
      communication: {
        select: {
          thread: {
            select: {
              id: true,
              subject: true,
              supervisoryOutcome: true,
              outcomeConfidence: true,
            },
          },
        },
      },
      resolutionRecord: {
        select: {
          tasks: { select: { status: true, dueDate: true, ownerId: true } },
          evidence: { select: { id: true } },
        },
      },
      workspace: { select: { id: true, name: true } },
    },
    orderBy: [{ reviewDueAt: "asc" }, { createdAt: "desc" }],
  });

  const eligible = rows.filter((row) => isPriorityInboxEligible(row));
  const repeatKeys = repeatAdviserKeys(
    eligible.map((row) => ({
      adviserId: row.meeting?.advisorCertifiedByUserId ?? null,
      primaryControl: row.type,
    })),
  );
  const allFindings = eligible.map((row) =>
    toFindingDto(row, args.userId, filters, repeatKeys),
  );
  const tabCounts = countTabs(allFindings);
  const findings = filterFindingsForTab(allFindings, tab);
  const portfolio = await getPortfolioSupervisionSummary(
    db,
    args.userId,
    filters,
  );

  return {
    tab,
    findings,
    tabCounts,
    header: headerFromCounts(portfolio.counts),
  };
}

export async function getPriorityFinding(
  db: PrismaClient,
  args: {
    userId: string;
    findingId: string;
  },
): Promise<PriorityInboxFindingDto | null> {
  const authorisedIds = await listAuthorisedFirmWorkspaceIds(db, args.userId);
  if (authorisedIds.length === 0) return null;

  const row = await db.flag.findFirst({
    where: {
      id: args.findingId,
      workspaceId: { in: authorisedIds },
    },
    select: {
      id: true,
      workspaceId: true,
      type: true,
      severity: true,
      status: true,
      evidence: true,
      createdByType: true,
      cmDisposition: true,
      escalationReason: true,
      cmTriagedAt: true,
      escalatedAt: true,
      assignedToUserId: true,
      assignedToUser: { select: { id: true, name: true } },
      reviewDueAt: true,
      materiality: true,
      policyMappingCode: true,
      sourceType: true,
      meeting: {
        select: {
          id: true,
          clientName: true,
          supervisoryOutcome: true,
          outcomeConfidence: true,
          advisorCertifiedByUserId: true,
          advisorCertifiedByUser: { select: { id: true, name: true } },
          transcript: true,
        },
      },
      communication: {
        select: {
          thread: {
            select: {
              id: true,
              subject: true,
              supervisoryOutcome: true,
              outcomeConfidence: true,
            },
          },
        },
      },
      resolutionRecord: {
        select: {
          tasks: { select: { status: true, dueDate: true, ownerId: true } },
          evidence: { select: { id: true } },
        },
      },
      workspace: { select: { id: true, name: true } },
    },
  });

  if (!row || !isPriorityInboxEligible(row)) return null;
  return toFindingDto(
    row,
    args.userId,
    { dateFrom: "1970-01-01", dateTo: "2999-12-31" },
    new Set(),
  );
}

export async function recordFindingView(args: {
  db: PrismaClient;
  userId: string;
  workspaceId: string;
  findingId: string;
}): Promise<void> {
  await args.db.auditEvent.create({
    data: {
      workspaceId: args.workspaceId,
      userId: args.userId,
      action: "FINDING_VIEWED",
      resourceType: "finding",
      resourceId: args.findingId,
      metadata: { synthetic: isAdvizorStackFirmWorkspaceId(args.workspaceId) },
    },
  });
}

export const inboxTestHelpers = {
  classifyInboxTab,
  isPriorityInboxEligible,
  countTabs,
  filterFindingsForTab,
  repeatAdviserKeys,
  emptyInboxCounts,
  DEFAULT_INBOX_TAB,
};
