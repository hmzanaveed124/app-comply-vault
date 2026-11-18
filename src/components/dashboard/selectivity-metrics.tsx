"use client";

import Link from "next/link";
import { AnimatedNumber } from "~/components/ui/animated-number";
import { MetricInfoTooltip } from "~/components/supervision/metric-info-tooltip";
import {
  SUPERVISION_METRIC_HELP,
  type SupervisionMetricHelpKey,
} from "~/lib/supervision-metric-copy";
import type { SupervisionSummary } from "~/lib/types";

type SelectivityMetricsProps = {
  summary: SupervisionSummary;
};

type MetricDef = {
  key: SupervisionMetricHelpKey;
  label: string;
  value: number;
  href?: string;
};

export function SelectivityMetrics({ summary }: SelectivityMetricsProps): React.JSX.Element {
  const { counts, selectivityStatement } = summary;

  const metrics: MetricDef[] = [
    {
      key: "processed",
      label: "Processed",
      value: counts.totalProcessed,
      href: "/interaction-log",
    },
    {
      key: "cleared",
      label: "Cleared / deprioritised",
      value: counts.clearedOrDeprioritised,
      href: "/interaction-log?outcome=CLEARED",
    },
    {
      key: "routineSamples",
      label: "Routine samples",
      value: counts.routineSamples,
      href: "/interaction-log?outcome=ROUTINE_SAMPLE",
    },
    {
      key: "priorityFindings",
      label: "Priority findings",
      value: counts.priorityFindings,
      href: "/interaction-log?outcome=ESCALATED",
    },
    {
      key: "held",
      label: "Held",
      value: counts.heldInteractions,
      href: "/interaction-log?outcome=HELD",
    },
    {
      key: "openRemediation",
      label: "Open remediation",
      value: counts.openRemediation,
    },
  ];

  return (
    <section
      className="rounded-[12px] border border-surface-border bg-surface-card p-4 shadow-[0_1px_2px_rgba(20,31,25,0.04)]"
      aria-labelledby="selectivity-heading"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="selectivity-heading" className="text-[14px] font-semibold text-text-primary">
            Supervision selectivity
          </h2>
          <p className="mt-1 text-[12.5px] leading-snug text-text-secondary">{selectivityStatement}</p>
        </div>
        <Link
          href="/interaction-log"
          className="text-[12px] font-medium text-brand hover:underline"
        >
          View interactions
        </Link>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((metric) => {
          const figure = (
            <p className="mt-1 text-[20px] font-semibold tabular-nums text-text-primary">
              <AnimatedNumber value={metric.value} startOnView={false} />
            </p>
          );

          return (
            <div
              key={metric.key}
              className="rounded-[8px] border border-surface-muted bg-surface-muted px-3 py-2 transition hover:border-surface-border"
            >
              <div className="flex items-start gap-1">
                <p className="min-w-0 flex-1 text-[11px] font-medium uppercase tracking-[0.04em] text-text-secondary">
                  {metric.label}
                </p>
                <MetricInfoTooltip
                  label={metric.label}
                  explanation={SUPERVISION_METRIC_HELP[metric.key]}
                />
              </div>
              {metric.href ? (
                <Link
                  href={metric.href}
                  className="block rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {figure}
                </Link>
              ) : (
                figure
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
