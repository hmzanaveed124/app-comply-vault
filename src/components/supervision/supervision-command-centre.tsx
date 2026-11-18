import Link from "next/link";
import type { PortfolioSupervisionSummary } from "~/lib/types";
import type { SupervisionFilterState } from "~/server/supervision/filters";
import { supervisionHref } from "~/server/supervision/filters";
import { SupervisionFilters } from "~/components/supervision/supervision-filters";
import { MetricInfoTooltip } from "~/components/supervision/metric-info-tooltip";
import {
  SUPERVISION_METRIC_HELP,
  type SupervisionMetricHelpKey,
} from "~/lib/supervision-metric-copy";

type SupervisionCommandCentreProps = {
  portfolio: PortfolioSupervisionSummary;
  filters: SupervisionFilterState;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function trendLabel(trend: string): string {
  switch (trend) {
    case "increasing":
      return "Increasing";
    case "decreasing":
      return "Decreasing";
    case "stable":
      return "Stable";
    default:
      return "Insufficient data";
  }
}

export function SupervisionCommandCentre({
  portfolio,
  filters,
}: SupervisionCommandCentreProps): React.JSX.Element {
  const { counts, selectivityStatement, firms, patterns, filterOptions } =
    portfolio;

  const metrics: Array<{
    key: SupervisionMetricHelpKey;
    label: string;
    value: number;
    href?: string;
  }> = [
    {
      key: "processed",
      label: "Interactions processed",
      value: counts.totalProcessed,
    },
    {
      key: "cleared",
      label: "Cleared or deprioritised",
      value: counts.clearedOrDeprioritised,
    },
    {
      key: "routineSamples",
      label: "Routine samples",
      value: counts.routineSamples,
    },
    {
      key: "priorityFindings",
      label: "Priority findings",
      value: counts.priorityFindings,
      href: supervisionHref("/priority-inbox", filters),
    },
    {
      key: "held",
      label: "Held interactions",
      value: counts.heldInteractions,
    },
    {
      key: "openRemediation",
      label: "Open remediation",
      value: counts.openRemediation,
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="space-y-2">
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">
          Supervision Command Centre
        </h1>
        <p className="max-w-3xl text-[14px] leading-snug text-text-secondary">
          Portfolio view of authorised firms. Counts are triage signals for human
          review — ComplyVault does not independently determine a violation.
        </p>
      </header>

      <SupervisionFilters
        filters={filters}
        firms={filterOptions.firms}
        advisers={filterOptions.advisers}
      />

      <section
        className="rounded-[12px] border border-surface-border bg-surface-card p-4 shadow-[0_1px_2px_rgba(20,31,25,0.04)]"
        aria-labelledby="selectivity-heading"
      >
        <h2 id="selectivity-heading" className="text-[14px] font-semibold text-text-primary">
          Selectivity
        </h2>
        <p className="mt-1 text-[18px] font-semibold leading-snug text-text-primary">
          {selectivityStatement}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((metric) => {
            const figure = (
              <p className="mt-1 text-[20px] font-semibold tabular-nums text-text-primary">
                {metric.value}
              </p>
            );
            return (
              <div
                key={metric.key}
                className="rounded-[8px] border border-surface-muted bg-surface-muted px-3 py-2"
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
                    className="block rounded-sm transition hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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

      <section aria-labelledby="firms-heading" className="space-y-3">
        <h2 id="firms-heading" className="text-[14px] font-semibold text-text-primary">
          Firm supervision
        </h2>
        {firms.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-surface-border bg-surface-card px-4 py-8 text-center text-[13px] text-text-secondary">
            No authorised firms with supervision data yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[12px] border border-surface-border bg-surface-card">
            <table className="min-w-full border-collapse text-left text-[13px]">
              <thead className="border-b border-surface-muted bg-surface-muted text-[11px] uppercase tracking-[0.04em] text-text-secondary">
                <tr>
                  <th className="px-3 py-2 font-medium">Firm</th>
                  <th className="px-3 py-2 font-medium">Processed</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 font-medium">Open remediation</th>
                  <th className="px-3 py-2 font-medium">Oldest unresolved</th>
                  <th className="px-3 py-2 font-medium">Top control</th>
                  <th className="px-3 py-2 font-medium">Trend</th>
                  <th className="px-3 py-2 font-medium">Coverage</th>
                </tr>
              </thead>
              <tbody>
                {firms.map((firm) => (
                  <tr key={firm.firmId} className="border-b border-surface-muted last:border-0">
                    <td className="px-3 py-2.5">
                      <Link
                        href={firm.href}
                        className="font-medium text-brand hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        {firm.firmName}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">{firm.processedInteractions}</td>
                    <td className="px-3 py-2.5 tabular-nums">{firm.priorityFindings}</td>
                    <td className="px-3 py-2.5 tabular-nums">{firm.openRemediation}</td>
                    <td className="px-3 py-2.5">{formatDate(firm.oldestUnresolvedFindingAt)}</td>
                    <td className="px-3 py-2.5">{firm.topControlConcern ?? "—"}</td>
                    <td className="px-3 py-2.5">{trendLabel(firm.trend)}</td>
                    <td className="px-3 py-2.5 capitalize">{firm.coverageStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="patterns-heading" className="space-y-3">
        <h2 id="patterns-heading" className="text-[14px] font-semibold text-text-primary">
          Emerging patterns
        </h2>
        {patterns.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-surface-border bg-surface-card px-4 py-6 text-[13px] text-text-secondary">
            No material portfolio patterns in the current filter window.
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-3">
            {patterns.map((pattern) => (
              <li key={pattern.id}>
                <Link
                  href={pattern.href}
                  className="block h-full rounded-[12px] border border-surface-border bg-surface-card p-4 transition hover:border-surface-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <p className="text-[13px] font-semibold text-text-primary">{pattern.title}</p>
                  <p className="mt-2 text-[12.5px] leading-snug text-text-secondary">
                    {pattern.summary}
                  </p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.04em] text-text-secondary">
                    {pattern.firmsAffected} firms · {pattern.openFindings} open
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
