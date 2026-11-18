import Link from "next/link";
import { Mail, Video } from "lucide-react";
import type { ClientHealthRow } from "~/lib/dashboard-types";
import { buildSparkline } from "~/lib/sparkline";
import { DashboardCard } from "~/components/dashboard/dashboard-card";
import { isEmailIntelligenceEnabled } from "~/lib/feature-flags";

type ClientsHealthTableProps = {
  clients: ClientHealthRow[];
  /** Range suffix for the trend column header, e.g. "90d" */
  rangeLabel: string;
};

function healthChip(score: number): { className: string; label: string } {
  if (score >= 75) return { className: "bg-brand-light text-brand", label: "healthy" };
  if (score >= 60) return { className: "bg-warning-bg text-semantic-warning", label: "needs attention" };
  return { className: "bg-danger-bg text-semantic-danger", label: "at risk" };
}

function sparkColor(score: number): string {
  if (score >= 75) return "var(--cv-brand)";
  if (score >= 60) return "var(--cv-semantic-warning)";
  return "var(--cv-semantic-danger)";
}

const TH = "px-[18px] py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-secondary border-b border-surface-border whitespace-nowrap";
const TD = "px-[18px] py-[11px] border-b border-surface-border whitespace-nowrap align-middle";

export function ClientsHealthTable({
  clients,
  rangeLabel,
}: ClientsHealthTableProps): React.JSX.Element {
  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  const emailIntel = isEmailIntelligenceEnabled();
  const activityHeader = emailIntel ? "Last activity" : "Last meeting";

  return (
    <DashboardCard
      title="Clients"
      emphasized
      link={{ href: "/interaction-log", label: "View all" }}
      bodyClassName="px-0 pb-0 pt-0"
    >
      {clients.length === 0 ? (
        <div className="px-[18px] py-10 text-center text-[12.5px] text-text-secondary">
          No clients yet. Client health appears here once you upload meetings.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                <th className={`${TH} text-left`}>Client</th>
                <th className={`${TH} text-left`}>Health</th>
                <th className={`${TH} text-left`}>Coverage</th>
                <th className={`${TH} text-right`}>Open flags</th>
                <th className={`${TH} text-left`}>{activityHeader}</th>
                <th className={`${TH} text-left`}>Health · {rangeLabel}</th>
                <th className={TH} />
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const chip = healthChip(c.health);
                const coveragePct =
                  c.coverageTotal === 0 ? 0 : (c.coverageDone / c.coverageTotal) * 100;
                const spark = buildSparkline(
                  c.trend.map((v) => -v),
                  { width: 68, height: 18, pad: 2 },
                );
                const activityIso = emailIntel ? c.lastActivity : c.lastMeeting;
                const openHref =
                  emailIntel && c.clientId
                    ? `/clients/${c.clientId}`
                    : `/clients/overview?name=${encodeURIComponent(c.clientName)}`;
                return (
                  <tr key={`${c.clientId ?? c.clientName}`} className="group last:[&>td]:border-b-0 hover:bg-surface-muted">
                    <td className={`${TD} font-semibold text-text-primary`}>
                      <Link href={openHref} className="hover:text-brand hover:underline">
                        {c.clientName}
                      </Link>
                    </td>
                    <td className={TD}>
                      <span
                        className={`inline-block min-w-[28px] rounded-[6px] px-0 py-[2.5px] text-center text-[11px] font-[650] tabular-nums ${chip.className}`}
                        title={`Health ${c.health} — ${chip.label}`}
                      >
                        {c.health}
                      </span>
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-2">
                        <div className="h-[5px] w-16 overflow-hidden rounded-[3px] bg-surface-muted">
                          <div
                            className="h-full rounded-[3px] bg-brand"
                            style={{ width: `${coveragePct}%` }}
                          />
                        </div>
                        <span className="text-[11.5px] tabular-nums text-text-primary">
                          {c.coverageDone}/{c.coverageTotal}
                        </span>
                      </div>
                    </td>
                    <td
                      className={`${TD} text-right font-semibold tabular-nums ${c.openFlags === 0 ? "font-normal text-text-secondary" : "text-text-primary"}`}
                    >
                      {c.openFlags}
                    </td>
                    <td className={`${TD} text-text-secondary`}>
                      {activityIso ? (
                        <span className="inline-flex items-center gap-1.5">
                          {emailIntel && c.lastActivityType === "email" ? (
                            <Mail className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-label="Email" />
                          ) : emailIntel && c.lastActivityType === "meeting" ? (
                            <Video className="h-3.5 w-3.5 shrink-0 text-text-secondary" aria-label="Meeting" />
                          ) : null}
                          {dateFmt.format(new Date(activityIso))}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={TD}>
                      <svg width="72" height="22" viewBox="0 0 72 22" className="block">
                        {spark.line ? (
                          <path
                            d={spark.line}
                            fill="none"
                            stroke={sparkColor(c.health)}
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            transform="translate(2 2)"
                          />
                        ) : null}
                      </svg>
                    </td>
                    <td className={TD}>
                      <Link
                        href={openHref}
                        className="text-[12px] font-semibold text-brand opacity-0 transition group-hover:opacity-100"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardCard>
  );
}
