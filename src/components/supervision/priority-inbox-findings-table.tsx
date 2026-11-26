"use client";
// Virtualized read-only findings list (beUI table motion pattern — @tanstack/react-virtual)

import Link from "next/link";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import type { PriorityInboxFindingDto } from "~/lib/types";
import { SUPERVISION_FILTER_LABELS } from "~/server/supervision/filters";
import { cn } from "~/lib/utils";
import {
  PRIORITY_INBOX_OVERSCAN,
  PRIORITY_INBOX_ROW_HEIGHT,
} from "./priority-inbox-virtual";

type PriorityInboxFindingsTableProps = {
  findings: PriorityInboxFindingDto[];
  focusId?: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function severityLabel(severity: PriorityInboxFindingDto["severity"]): string {
  return SUPERVISION_FILTER_LABELS.severity[severity];
}

function statusLabel(status: PriorityInboxFindingDto["status"]): string {
  return SUPERVISION_FILTER_LABELS.findingStatus[status];
}

function channelLabel(channels: PriorityInboxFindingDto["channels"]): string {
  return channels
    .map((channel) => SUPERVISION_FILTER_LABELS.channel[channel])
    .join(" + ");
}

function confidenceLabel(confidence: number | null): string {
  if (confidence === null) return "—";
  return `${Math.round(confidence * 100)}%`;
}

const TABLE_HEIGHT = 640;

export function PriorityInboxFindingsTable({
  findings,
  focusId,
}: PriorityInboxFindingsTableProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: findings.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => PRIORITY_INBOX_ROW_HEIGHT,
    overscan: PRIORITY_INBOX_OVERSCAN,
  });

  return (
    <div className="overflow-hidden rounded-[12px] border border-surface-border bg-surface-card">
      <div
        className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] gap-2 border-b border-surface-muted bg-surface-muted px-4 py-2 text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary"
        role="row"
      >
        <span>Finding</span>
        <span>Firm / adviser</span>
        <span>Client</span>
        <span>Status</span>
        <span>Due · evidence</span>
      </div>
      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ height: TABLE_HEIGHT }}
        role="region"
        aria-label="Priority findings"
      >
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const finding = findings[virtualRow.index];
            if (!finding) return null;
            const focused = focusId === finding.id;

            return (
              <div
                key={finding.id}
                id={`finding-${finding.id}`}
                role="row"
                className={cn(
                  "absolute left-0 top-0 w-full border-b border-surface-muted",
                  focused ? "bg-brand-light" : "bg-surface-card",
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <Link
                  href={finding.href}
                  className="grid h-full grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] gap-2 px-4 py-3 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-text-primary">
                      {finding.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-text-secondary">
                      {finding.escalationReason}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.04em] text-text-secondary">
                      {severityLabel(finding.severity)}
                      {finding.repeatAdviser ? " · Repeat adviser" : ""}
                    </p>
                  </div>
                  <div className="text-[12.5px] text-text-secondary">
                    <p className="truncate">{finding.firmName}</p>
                    <p className="truncate text-text-secondary">
                      {finding.adviserName ?? "—"}
                    </p>
                  </div>
                  <p className="truncate text-[12.5px] text-text-secondary">
                    {finding.clientName ?? "—"}
                  </p>
                  <div className="text-[12px] text-text-secondary">
                    <p>{statusLabel(finding.status)}</p>
                    <p className="text-text-secondary">
                      {channelLabel(finding.channels)}
                    </p>
                  </div>
                  <div className="text-[12.5px] tabular-nums text-text-secondary">
                    <p>{formatDate(finding.dueAt)}</p>
                    <p className="text-text-secondary">
                      {finding.evidenceCount} evidence items
                    </p>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
