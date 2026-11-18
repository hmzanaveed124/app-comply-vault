import type { DashboardSummary } from "~/lib/dashboard-types";
import { buildSparkline } from "~/lib/sparkline";
import { DashboardCard } from "~/components/dashboard/dashboard-card";

type ComplianceHealthCardProps = {
  score: number;
  label: string;
  delta: number;
  breakdown: DashboardSummary["healthBreakdown"];
  trend: DashboardSummary["healthTrend"];
  caption: string;
};

const RING_R = 36;
const RING_CIRC = 2 * Math.PI * RING_R;

function arcColor(score: number): string {
  if (score <= 39) return "var(--cv-semantic-danger)";
  if (score <= 69) return "var(--cv-semantic-warning)";
  return "var(--cv-brand)";
}

function factorColor(value: number): string {
  if (value >= 70) return "var(--cv-brand)";
  if (value >= 40) return "var(--cv-semantic-warning)";
  return "var(--cv-semantic-danger)";
}

function statusBadge(score: number): { bg: string; text: string } {
  if (score <= 39) return { bg: "var(--cv-danger-bg)", text: "var(--cv-danger-text)" };
  if (score <= 69) return { bg: "var(--cv-warning-bg)", text: "var(--cv-warning-text)" };
  return { bg: "var(--cv-brand-light)", text: "var(--cv-brand-dark)" };
}

export function ComplianceHealthCard({
  score,
  label,
  delta,
  breakdown,
  trend,
  caption,
}: ComplianceHealthCardProps): React.JSX.Element {
  const clipped = Math.max(0, Math.min(100, score));
  const dashOffset = RING_CIRC * (1 - clipped / 100);
  const color = arcColor(score);
  const badge = statusBadge(score);

  const factors = [
    { label: "Meeting coverage", value: breakdown.meetingCoverage },
    { label: "Docs finalized", value: breakdown.documentsFinalised },
    { label: "Flags resolved", value: breakdown.flagsResolved },
    { label: "Signatures", value: breakdown.signaturesComplete },
  ];

  const spark = buildSparkline(
    trend.map((t) => t.score),
    { width: 320, height: 46, pad: 4 },
  );
  const axis = [0, 1, 2, 3].map((q) => trend[Math.floor((trend.length - 1) * (q / 3))]?.label ?? "");

  return (
    <DashboardCard title="Compliance Health" link={{ href: "/compliance-cockpit", label: "Details" }}>
      <div className="grid grid-cols-[auto_1fr] items-center gap-5">
        <div className="flex flex-col items-center gap-2">
          <div className="relative h-[84px] w-[84px] shrink-0">
            <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90" aria-hidden>
              <circle cx="42" cy="42" r={RING_R} stroke="var(--cv-surface-muted)" strokeWidth="7" fill="none" />
              <circle
                cx="42"
                cy="42"
                r={RING_R}
                stroke={color}
                strokeWidth="7"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={RING_CIRC.toFixed(2)}
                strokeDashoffset={dashOffset.toFixed(2)}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-[22px] font-[650] leading-none tabular-nums text-text-primary">
                {score}
              </div>
            </div>
          </div>
          <span
            className="max-w-[110px] truncate rounded-full px-2.5 py-0.5 text-center text-[10px] font-semibold leading-tight"
            style={{ backgroundColor: badge.bg, color: badge.text }}
            title={label}
          >
            {label}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          {factors.map((f) => (
            <div
              key={f.label}
              className="grid grid-cols-[104px_1fr_2.5rem] items-center gap-2"
            >
              <span className="whitespace-nowrap text-[11px] text-text-primary">{f.label}</span>
              <div className="h-[5px] overflow-hidden rounded-[3px] bg-surface-muted">
                <div
                  className="h-full min-w-0 rounded-[3px]"
                  style={{
                    width: `${Math.max(0, Math.min(100, f.value))}%`,
                    background: factorColor(f.value),
                  }}
                />
              </div>
              <span className="text-right text-[11px] font-semibold tabular-nums text-text-primary">
                {f.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-[14px] border-t border-surface-border pt-3">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
            {caption}
          </span>
          <span
            className={`shrink-0 text-[11.5px] font-semibold ${delta >= 0 ? "text-brand" : "text-semantic-danger"}`}
          >
            {delta >= 0 ? "+" : ""}
            {delta} vs start
          </span>
        </div>
        <div className="h-[46px] w-full overflow-hidden">
          <svg
            width="100%"
            height="46"
            viewBox="0 0 320 46"
            preserveAspectRatio="none"
            className="block"
            aria-hidden
          >
            <defs>
              <linearGradient id="health-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--cv-brand)" stopOpacity="0.14" />
                <stop offset="100%" stopColor="var(--cv-brand)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {spark.area ? <path d={spark.area} fill="url(#health-trend-fill)" /> : null}
            {spark.line ? (
              <path
                d={spark.line}
                fill="none"
                stroke="var(--cv-brand)"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ) : null}
          </svg>
        </div>
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-text-secondary">
          {axis.map((labelText, i) => (
            <span key={`${labelText}-${i}`}>{labelText}</span>
          ))}
        </div>
      </div>
    </DashboardCard>
  );
}
