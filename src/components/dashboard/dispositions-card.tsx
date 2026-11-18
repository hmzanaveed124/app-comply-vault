import type { DispositionSummary } from "~/lib/dashboard-types";
import { DashboardCard } from "~/components/dashboard/dashboard-card";

type DispositionsCardProps = {
  dispositions: DispositionSummary;
  /** Range suffix shown in the card title, e.g. "30d" */
  rangeLabel: string;
};

export function DispositionsCard({
  dispositions,
  rangeLabel,
}: DispositionsCardProps): React.JSX.Element {
  const rows = [
    { label: "Resolved", count: dispositions.resolved, color: "var(--cv-brand)" },
    { label: "Dismissed", count: dispositions.dismissed, color: "var(--cv-text-muted)" },
    { label: "Escalated", count: dispositions.escalated, color: "var(--cv-semantic-danger)" },
  ];
  const max = Math.max(1, ...rows.map((r) => r.count));

  const trendLabel =
    dispositions.trending === "down"
      ? "trending down"
      : dispositions.trending === "up"
        ? "trending up"
        : "steady";

  return (
    <DashboardCard title={`Dispositions · ${rangeLabel}`}>
      {rows.map((r) => (
        <div key={r.label} className="mb-[11px] grid grid-cols-[82px_1fr_28px] items-center gap-2.5">
          <span className="text-[11.5px] text-text-primary">{r.label}</span>
          <div className="h-1.5 overflow-hidden rounded-[3px] bg-surface-muted">
            <div
              className="h-full rounded-[3px]"
              style={{ width: `${(r.count / max) * 100}%`, background: r.color }}
            />
          </div>
          <span className="text-right text-[11.5px] font-semibold tabular-nums text-text-primary">
            {r.count}
          </span>
        </div>
      ))}
      <div className="mt-[13px] border-t border-surface-border pt-3 text-[11.5px] text-text-secondary">
        False-positive rate <b className="text-text-primary">{dispositions.falsePositiveRate}%</b> ·{" "}
        {trendLabel}
      </div>
    </DashboardCard>
  );
}
