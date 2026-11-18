"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeeklyFlagData } from "~/lib/dashboard-types";
import { TrendingDown, TrendingUp } from "lucide-react";
import { dashboardColors } from "~/lib/dashboard-colors";

type FlagsAreaChartProps = {
  data: WeeklyFlagData[];
  openFlags: number;
  flagsDelta: number;
  flagsTrending: "up" | "down" | "flat";
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

export function FlagsAreaChart({
  data,
  openFlags,
  flagsDelta,
  flagsTrending,
  "aria-label": ariaLabel,
}: FlagsAreaChartProps): React.JSX.Element {
  const dangerBorder = openFlags > 0;

  const trendColor =
    flagsTrending === "up"
      ? dashboardColors.semanticDanger
      : flagsTrending === "down"
        ? dashboardColors.brand
        : dashboardColors.textMuted;

  const TrendIcon = flagsTrending === "down" ? TrendingDown : TrendingUp;
  const trendPhrase =
    flagsTrending === "up"
      ? "trending up"
      : flagsTrending === "down"
        ? "trending down"
        : "flat";

  const endLabels =
    data.length > 0 ? [data[0]!.week, data[data.length - 1]!.week] : [];

  return (
    <div
      className={`flex h-full min-h-[190px] flex-col rounded-[14px] border bg-surface-card p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] ${
        dangerBorder
          ? "border-l-[3px] border-l-semantic-danger border-y border-r border-surface-border"
          : "border border-surface-border"
      }`}
      role="img"
      aria-label={
        ariaLabel ??
        `Open flags trend over ${data.length} weeks, current total ${openFlags} workspace flags`
      }
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
          Open flags
        </span>
        <span className="text-[26px] font-bold leading-none text-semantic-danger">{openFlags}</span>
      </div>
      <div
        className="mb-2 flex items-center gap-1 text-[11px] font-medium"
        style={{ color: trendColor }}
      >
        <TrendIcon className="h-3 w-3 shrink-0" aria-hidden />
        <span>
          {flagsDelta >= 0 ? "+" : ""}
          {flagsDelta} this week · {trendPhrase}
        </span>
      </div>
      <div className="min-h-0 min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%" minHeight={120}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="openFlagsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={dashboardColors.semanticDanger} stopOpacity={0.25} />
                <stop
                  offset="100%"
                  stopColor={dashboardColors.semanticDanger}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="week"
              tick={{ fontSize: 9, fill: dashboardColors.textMuted }}
              axisLine={false}
              tickLine={false}
              ticks={endLabels}
            />
            <YAxis hide domain={["dataMin - 1", "auto"]} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => {
                const v = typeof value === "number" ? value : Number(value);
                const n = Number.isFinite(v) ? v : 0;
                return [`${n} flags`, ""];
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={dashboardColors.semanticDanger}
              strokeWidth={2}
              fill="url(#openFlagsFill)"
              dot={{
                r: 3.5,
                fill: "var(--cv-chart-tooltip-text)",
                strokeWidth: 1.5,
                stroke: dashboardColors.semanticDanger,
              }}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
