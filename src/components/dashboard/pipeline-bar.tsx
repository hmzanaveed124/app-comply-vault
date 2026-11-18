"use client";

import { dashboardColors } from "~/lib/dashboard-colors";

type PipelineBarProps = {
  pipeline: {
    draft: number;
    review: number;
    flagged: number;
    finalized: number;
  };
  "aria-label"?: string;
};

const SEGMENTS = [
  { key: "draft" as const, label: "Draft", color: "var(--cv-surface-border)" },
  { key: "review" as const, label: "Review", color: dashboardColors.semanticOrange },
  { key: "flagged" as const, label: "Flagged", color: dashboardColors.semanticDanger },
  { key: "finalized" as const, label: "Done", color: dashboardColors.brand },
];

export function PipelineBar({
  pipeline,
  "aria-label": ariaLabel,
}: PipelineBarProps): React.JSX.Element {
  const total = SEGMENTS.reduce((s, x) => s + pipeline[x.key], 0);

  return (
    <div
      className="flex flex-wrap items-center gap-5 rounded-[14px] border border-surface-border bg-surface-card px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
      role="img"
      aria-label={
        ariaLabel ??
        `Pipeline: ${pipeline.draft} draft, ${pipeline.review} review, ${pipeline.flagged} flagged, ${pipeline.finalized} done`
      }
    >
      <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.06em] text-text-secondary">
        Pipeline
      </span>
      <div className="min-w-[120px] flex-1">
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-[4px]">
          {total === 0 ? (
            <div className="h-full flex-1 rounded-[4px] bg-surface-divider" />
          ) : (
            SEGMENTS.map((seg, i) => {
              const n = pipeline[seg.key];
              const flex = n > 0 ? n : 0;
              if (flex === 0) return null;
              const prior = SEGMENTS.slice(0, i).some((s) => pipeline[s.key] > 0);
              const radiusLeft = !prior;
              const radiusRight = !SEGMENTS.slice(i + 1).some((s) => pipeline[s.key] > 0);
              return (
                <div
                  key={seg.key}
                  className="h-full min-w-0"
                  style={{
                    flexGrow: flex,
                    flexBasis: 0,
                    backgroundColor: seg.color,
                    borderRadius: `${radiusLeft ? 4 : 0}px ${radiusRight ? 4 : 0}px ${radiusRight ? 4 : 0}px ${radiusLeft ? 4 : 0}px`,
                  }}
                />
              );
            })
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        {SEGMENTS.map((seg) => (
          <div
            key={seg.key}
            className="flex items-center gap-2 text-[11px] font-medium text-text-secondary"
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
            <span>
              {pipeline[seg.key]} {seg.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
