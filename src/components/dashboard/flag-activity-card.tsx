import type { FlagActivityWeek } from "~/lib/dashboard-types";
import { DashboardCard, Metric } from "~/components/dashboard/dashboard-card";

type FlagActivityCardProps = {
  data: FlagActivityWeek[];
  openFlags: number;
  openedDelta: number;
};

const BASELINE = 80;
const TOP = 6;
const CHART_W = 320;

export function FlagActivityCard({
  data,
  openFlags,
  openedDelta,
}: FlagActivityCardProps): React.JSX.Element {
  const max = Math.max(1, ...data.flatMap((d) => [d.opened, d.resolved]));
  const scale = (BASELINE - TOP) / max;

  const n = Math.max(1, data.length);
  const groupW = CHART_W / n;
  const innerPad = Math.min(6, groupW * 0.14);
  const gap = 2;
  const barW = Math.max(3, (groupW - innerPad * 2 - gap) / 2);

  // Sample up to 4 evenly-spaced x-axis labels from the buckets.
  const axisLabels =
    data.length <= 4
      ? data.map((d) => d.week)
      : [0, 1, 2, 3].map((q) => data[Math.round((data.length - 1) * (q / 3))]?.week ?? "");

  const deltaText =
    openedDelta === 0
      ? "no change"
      : `${openedDelta > 0 ? "+" : ""}${openedDelta} latest`;

  return (
    <DashboardCard title="Flag Activity" link={{ href: "/review", label: "View all" }}>
      <Metric
        value={openFlags}
        unit="open"
        delta={{ text: deltaText, tone: openedDelta > 0 ? "bad" : "good" }}
      />
      <svg
        width="100%"
        height="96"
        viewBox="0 0 320 96"
        preserveAspectRatio="none"
        className="mt-3"
      >
        <line x1="0" y1="24" x2="320" y2="24" stroke="var(--cv-surface-muted)" strokeWidth="1" />
        <line x1="0" y1="52" x2="320" y2="52" stroke="var(--cv-surface-muted)" strokeWidth="1" />
        <line x1="0" y1={BASELINE} x2="320" y2={BASELINE} stroke="var(--cv-surface-border)" strokeWidth="1" />
        {data.map((d, i) => {
          const groupX = i * groupW + innerPad;
          const openedH = d.opened * scale;
          const resolvedH = d.resolved * scale;
          return (
            <g key={`${d.week}-${i}`}>
              <rect
                x={groupX}
                y={BASELINE - openedH}
                width={barW}
                height={openedH}
                rx="2.5"
                fill="var(--cv-text-muted)"
              />
              <rect
                x={groupX + barW + gap}
                y={BASELINE - resolvedH}
                width={barW}
                height={resolvedH}
                rx="2.5"
                fill="var(--cv-brand)"
              />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] tabular-nums text-text-secondary">
        {axisLabels.map((label, i) => (
          <span key={`${label}-${i}`}>{label}</span>
        ))}
      </div>
      <div className="mt-2.5 flex gap-3.5">
        <div className="flex items-center gap-1.5 text-[11px] text-text-primary">
          <span className="h-2 w-2 rounded-[2px] bg-text-secondary" />
          Opened
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-text-primary">
          <span className="h-2 w-2 rounded-[2px] bg-brand" />
          Resolved
        </div>
      </div>
    </DashboardCard>
  );
}
