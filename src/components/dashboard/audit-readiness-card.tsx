import type { AuditReadiness } from "~/lib/dashboard-types";
import { DashboardCard } from "~/components/dashboard/dashboard-card";

type AuditReadinessCardProps = {
  readiness: AuditReadiness;
};

export function AuditReadinessCard({ readiness }: AuditReadinessCardProps): React.JSX.Element {
  const pct = readiness.total === 0 ? 0 : (readiness.ready / readiness.total) * 100;

  return (
    <DashboardCard title="Audit Readiness" link={{ href: "/audit-packs", label: "View packs" }}>
      <div className="flex items-baseline gap-1.5">
        <span className="text-[26px] font-[650] leading-none tracking-[-0.02em] tabular-nums text-text-primary">
          {readiness.ready}
          <span className="text-[15px] font-medium text-text-secondary">/{readiness.total}</span>
        </span>
        <span className="text-[12.5px] text-text-secondary">meetings SEC-ready</span>
      </div>
      <svg width="100%" height="12" viewBox="0 0 320 12" preserveAspectRatio="none" className="mt-3.5">
        <rect x="0" y="2" width="320" height="8" rx="4" fill="var(--cv-surface-muted)" />
        <rect x="0" y="2" width={(pct / 100) * 320} height="8" rx="4" fill="var(--cv-brand)" />
      </svg>
      <div className="mt-3 text-[11.5px] text-text-secondary">
        {readiness.blocked > 0 ? (
          <>
            {readiness.blocked} {readiness.blocked === 1 ? "meeting" : "meetings"} blocked ·{" "}
            <b className="text-text-primary">{readiness.blockedReason}</b>
          </>
        ) : (
          <>All reviewed meetings finalized</>
        )}
      </div>
    </DashboardCard>
  );
}
