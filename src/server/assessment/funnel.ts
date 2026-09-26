/**
 * Abandonment is derived from lastActivityAt — never from browser unload events
 * and never persisted as a DB status. Stored statuses are only:
 * STARTED / IN_PROGRESS / COMPLETED / LEAD_CAPTURED.
 */

export const DEFAULT_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export type FunnelStatus =
  | "STARTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "LEAD_CAPTURED"
  | "ABANDONED";

export function isIncompleteStatus(status: string): boolean {
  return status === "STARTED" || status === "IN_PROGRESS";
}

export function isStaleIncomplete(input: {
  status: string;
  lastActivityAt: Date;
  now?: Date;
  staleAfterMs?: number;
}): boolean {
  if (!isIncompleteStatus(input.status)) return false;
  const now = input.now ?? new Date();
  const threshold = input.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  return now.getTime() - input.lastActivityAt.getTime() > threshold;
}

export function effectiveFunnelStatus(input: {
  status: string;
  lastActivityAt: Date;
  now?: Date;
  staleAfterMs?: number;
}): FunnelStatus {
  if (isStaleIncomplete(input)) return "ABANDONED";
  return input.status as FunnelStatus;
}

export type FunnelCounts = {
  starts: number;
  completions: number;
  leadCaptures: number;
  incomplete: number;
  staleIncomplete: number;
  completionRate: number;
  leadConversionRate: number;
  dropOffByStep: Record<number, number>;
};

export function summarizeFunnel(
  rows: Array<{
    status: string;
    currentStep: number;
    lastActivityAt: Date;
  }>,
  now = new Date(),
  staleAfterMs = DEFAULT_STALE_AFTER_MS,
): FunnelCounts {
  const starts = rows.length;
  const completions = rows.filter(
    (row) => row.status === "COMPLETED" || row.status === "LEAD_CAPTURED",
  ).length;
  const leadCaptures = rows.filter((row) => row.status === "LEAD_CAPTURED").length;
  const incomplete = rows.filter((row) => isIncompleteStatus(row.status)).length;
  const staleIncomplete = rows.filter((row) =>
    isStaleIncomplete({
      status: row.status,
      lastActivityAt: row.lastActivityAt,
      now,
      staleAfterMs,
    }),
  ).length;

  const dropOffByStep: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const row of rows) {
    if (!isIncompleteStatus(row.status)) continue;
    const step = Math.min(3, Math.max(0, row.currentStep));
    dropOffByStep[step] = (dropOffByStep[step] ?? 0) + 1;
  }

  return {
    starts,
    completions,
    leadCaptures,
    incomplete,
    staleIncomplete,
    completionRate: starts === 0 ? 0 : completions / starts,
    leadConversionRate: completions === 0 ? 0 : leadCaptures / completions,
    dropOffByStep,
  };
}
