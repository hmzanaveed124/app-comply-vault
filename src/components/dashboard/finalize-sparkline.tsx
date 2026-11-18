"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FinalizeTimeData } from "~/lib/dashboard-types";
import { dashboardColors } from "~/lib/dashboard-colors";

type FinalizeSparklineProps = {
  data: FinalizeTimeData[];
  avgDays: number | null;
  "aria-label"?: string;
};

const tooltipStyle = {
  backgroundColor: "var(--cv-chart-tooltip-bg)",
  border: "none",
  borderRadius: 6,
  fontSize: 11,
  fontWeight: 600,
  color: "var(--cv-chart-tooltip-text)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

export function FinalizeSparkline({
  data,
  avgDays,
  "aria-label": ariaLabel,
}: FinalizeSparklineProps): React.JSX.Element {
  const displayAvg =
    avgDays !== null && Number.isFinite(avgDays) ? `${avgDays.toFixed(1)}d` : "—";

  const maxY = Math.max(
    2,
    ...(data.map((d) => d.days).filter((d): d is number => d !== null) as number[]),
    0,
  );

  return (
    <div
      className="flex h-full min-h-[160px] flex-col rounded-[14px] border-l-[3px] border-l-semantic-warning border-y border-r border-surface-border bg-surface-card p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
      role="img"
      aria-label={
        ariaLabel ??
        `Time to finalize trend, average ${displayAvg}, target 2 days or less`
      }
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
          Time to finalize
        </span>
      </div>
      <div className="mb-1 text-[28px] font-bold leading-none text-semantic-warning">{displayAvg}</div>
      <p className="mb-3 text-[11px] text-text-muted">target ≤ 2d</p>
      <div className="h-14 w-full min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={56}>
          <LineChart data={data} margin={{ top: 2, right: 36, left: 0, bottom: 2 }}>
            <CartesianGrid strokeDasharray="0" stroke="transparent" />
            <XAxis dataKey="date" hide />
            <YAxis domain={[0, maxY + 1]} hide />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => {
                if (value === undefined || value === null) return ["", ""];
                const v = typeof value === "number" ? value : Number(value);
                const n = Number.isFinite(v) ? v : 0;
                return [`${n.toFixed(1)}d`, ""];
              }}
            />
            <ReferenceLine
              y={2}
              stroke={dashboardColors.brand}
              strokeWidth={1}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
              label={{
                value: "target",
                position: "right",
                fill: dashboardColors.brand,
                fontSize: 8,
                opacity: 0.7,
              }}
            />
            <Line
              type="monotone"
              dataKey="days"
              stroke={dashboardColors.semanticWarning}
              strokeWidth={2}
              dot={{
                r: 3,
                fill: "var(--cv-chart-tooltip-text)",
                strokeWidth: 1.5,
                stroke: dashboardColors.semanticWarning,
              }}
              connectNulls={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
