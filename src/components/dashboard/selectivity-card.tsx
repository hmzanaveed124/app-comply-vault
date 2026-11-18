import dynamic from "next/dynamic";
import type { SupervisionSummary } from "~/lib/types";

const SelectivityMetrics = dynamic(
  () =>
    import("~/components/dashboard/selectivity-metrics").then((m) => m.SelectivityMetrics),
  {
    loading: () => (
      <section
        className="rounded-[12px] border border-surface-border bg-surface-card p-4 shadow-[0_1px_2px_rgba(20,31,25,0.04)]"
        aria-busy="true"
        aria-label="Loading supervision metrics"
      >
        <div className="h-16 animate-pulse rounded bg-surface-muted" />
      </section>
    ),
  },
);

type SelectivityCardProps = {
  summary: SupervisionSummary;
};

export function SelectivityCard({ summary }: SelectivityCardProps): React.JSX.Element {
  return <SelectivityMetrics summary={summary} />;
}
