import Link from "next/link";
import { Plus } from "lucide-react";
import { DASHBOARD_RANGES, type DashboardSummary } from "~/lib/dashboard-types";
import type { SupervisionSummary } from "~/lib/types";
import { ComplianceHealthCard } from "~/components/dashboard/compliance-health-card";
import { FlagActivityCard } from "~/components/dashboard/flag-activity-card";
import { FlagAgingCard } from "~/components/dashboard/flag-aging-card";
import { DispositionsCard } from "~/components/dashboard/dispositions-card";
import { TimeToFinalizeCard } from "~/components/dashboard/time-to-finalize-card";
import { AuditReadinessCard } from "~/components/dashboard/audit-readiness-card";
import { ClientsHealthTable } from "~/components/dashboard/clients-health-table";
import { AdvisorsTable } from "~/components/dashboard/advisors-table";
import { DashboardMeetingTable } from "~/components/dashboard/dashboard-meeting-table";
import { SelectivityCard } from "~/components/dashboard/selectivity-card";

type DashboardViewProps = {
  summary: DashboardSummary;
  supervisionSummary: SupervisionSummary;
  workspaceName: string;
};

function weekOfLabel(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(monday);
}

export function DashboardView({
  summary,
  supervisionSummary,
  workspaceName,
}: DashboardViewProps): React.JSX.Element {
  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-3.5 pb-10">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-[650] tracking-[-0.01em] text-text-primary">Dashboard</h1>
          <p className="mt-0.5 text-[12.5px] text-text-secondary">
            {workspaceName} · Week of {weekOfLabel()}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div
            className="flex rounded-[8px] border border-surface-border bg-surface-card p-0.5"
            role="group"
            aria-label="Time range"
          >
            {DASHBOARD_RANGES.map((r) => {
              const active = r === summary.range;
              return (
                <Link
                  key={r}
                  href={`/dashboard?range=${r}`}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={`rounded-[6px] px-[11px] py-[5px] text-[12px] transition ${
                    active
                      ? "bg-brand font-semibold text-white"
                      : "font-medium text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {r}
                </Link>
              );
            })}
          </div>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-brand px-3.5 py-2 text-[12.5px] font-semibold text-white transition hover:bg-brand"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Upload meeting
          </Link>
        </div>
      </div>

      <SelectivityCard summary={supervisionSummary} />

      <div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-[5fr_4fr_3fr]">
        <ComplianceHealthCard
          score={summary.healthScore}
          label={summary.healthLabel}
          delta={summary.healthDelta}
          breakdown={summary.healthBreakdown}
          trend={summary.healthTrend}
          caption={summary.trendCaption}
        />
        <FlagActivityCard
          data={summary.flagActivity}
          openFlags={summary.openFlags}
          openedDelta={summary.flagsOpenedThisWeek}
        />
        <FlagAgingCard aging={summary.flagAging} />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2 xl:grid-cols-3">
        <DispositionsCard dispositions={summary.dispositions} rangeLabel={summary.range} />
        <TimeToFinalizeCard strip={summary.finalizeStrip} avgDays={summary.finalizeStrip.avgDays} />
        <AuditReadinessCard readiness={summary.auditReadiness} />
      </div>

      <ClientsHealthTable clients={summary.clients} rangeLabel={summary.range} />

      <AdvisorsTable advisors={summary.advisors} rangeLabel={summary.range} />

      {summary.recentMeetings.length === 0 ? (
        <section className="rounded-[10px] border border-dashed border-surface-border bg-surface-card p-10 text-center shadow-[0_1px_2px_rgba(20,31,25,0.04)]">
          <p className="text-[13px] text-text-primary">No meetings yet.</p>
          <Link
            href="/upload"
            className="mt-4 inline-flex rounded-[8px] bg-brand px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-brand"
          >
            Upload meeting
          </Link>
        </section>
      ) : (
        <DashboardMeetingTable
          totalMeetings={summary.totalMeetings}
          pendingReview={summary.pendingReview}
          initialRows={summary.recentMeetings}
        />
      )}
    </div>
  );
}
