import type { DashboardSummary } from "~/lib/dashboard-types";
import { DashboardCard } from "~/components/dashboard/dashboard-card";
export function ComplianceHealthCard({
  breakdown,
}: {
  score: number;
  label: string;
  delta: number;
  breakdown: DashboardSummary["healthBreakdown"];
  trend: DashboardSummary["healthTrend"];
  caption: string;
}): React.JSX.Element {
  const factors = [
    { label: "Meeting coverage", value: breakdown.meetingCoverage },
    { label: "Documents finalized", value: breakdown.documentsFinalised },
    { label: "Flags closed", value: breakdown.flagsResolved },
    { label: "Signatures complete", value: breakdown.signaturesComplete },
  ];
  return (
    <DashboardCard
      title="Review progress"
      link={{ href: "/review-session", label: "Start daily review" }}
    >
      <dl className="grid grid-cols-2 gap-4">
        {factors.map((f) => (
          <div key={f.label}>
            <dt className="text-sm text-text-secondary">{f.label}</dt>
            <dd className="text-xl font-semibold">{Math.round(f.value)}%</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-text-secondary">
        Operational completion metrics. They do not measure regulatory
        compliance or establish exam readiness.
      </p>
    </DashboardCard>
  );
}
