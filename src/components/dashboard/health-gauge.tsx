"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";

type HealthGaugeProps = {
  score: number;
  openFlags: number;
  unfinalizedCount: number;
  "aria-label"?: string;
};

function thresholdFor(
  s: number,
): { arc: string; bg: string; badge: string; label: string } {
  if (s <= 39) {
    return {
      arc: "var(--cv-semantic-danger)",
      bg: "var(--cv-danger-bg)",
      badge: "var(--cv-danger-bg)",
      label: "Critical",
    };
  }
  if (s <= 69) {
    return {
      arc: "var(--cv-semantic-warning)",
      bg: "var(--cv-warning-bg)",
      badge: "var(--cv-warning-bg)",
      label: "Needs Attention",
    };
  }
  return {
    arc: "var(--cv-brand)",
    bg: "var(--cv-brand-light)",
    badge: "var(--cv-brand-light)",
    label: "Healthy",
  };
}

const R = 62;
const STROKE = 8;
const HALF_LEN = Math.PI * R;

export function HealthGauge({
  score,
  openFlags,
  unfinalizedCount,
  "aria-label": ariaLabel,
}: HealthGaugeProps): React.JSX.Element {
  const clip = Math.max(0, Math.min(100, score)) / 100;
  const [dashOffset, setDashOffset] = useState(HALF_LEN);
  const t = thresholdFor(score);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setDashOffset(HALF_LEN * (1 - clip));
      return;
    }
    const tmr = window.setTimeout(() => {
      setDashOffset(HALF_LEN * (1 - clip));
    }, 100);
    return () => window.clearTimeout(tmr);
  }, [clip]);

  const label =
    ariaLabel ??
    `Compliance health score ${score} out of 100, ${openFlags} open flags, ${unfinalizedCount} unfinalized meetings`;

  const badgeText =
    score <= 39 ? "var(--cv-danger-text)" : score <= 69 ? "var(--cv-warning-text)" : "var(--cv-brand-dark)";

  return (
    <div
      className="flex h-full flex-col rounded-[14px] border border-surface-border bg-surface-card p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
      role="img"
      aria-label={label}
    >
      <div className="mb-3 flex w-full items-center gap-2">
        <Shield className="h-[18px] w-[18px] shrink-0 text-text-primary" strokeWidth={2} aria-hidden />
        <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
          Compliance Health
        </span>
      </div>
      <div className="flex flex-1 flex-col items-center">
        <svg width={200} height={118} viewBox="0 0 200 120" className="shrink-0">
        <path
          d={`M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`}
          fill="none"
          stroke="var(--cv-surface-muted)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <path
          d={`M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`}
          fill="none"
          stroke={t.arc}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${HALF_LEN} ${HALF_LEN}`}
          strokeDashoffset={dashOffset}
          style={{
            transition: "stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
        <text
          x={100}
          y={88}
          textAnchor="middle"
          className="fill-text-primary text-[34px] font-bold"
          style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
        >
          {score}
        </text>
        <text
          x={100}
          y={104}
          textAnchor="middle"
          className="fill-text-muted text-[10px] font-medium"
          style={{ fontFamily: "var(--font-dm-sans), sans-serif" }}
        >
          / 100
        </text>
        </svg>
        <div
          className="mt-1 rounded-full px-3 py-1 text-[10.5px] font-semibold"
          style={{ backgroundColor: t.badge, color: badgeText }}
        >
          {t.label}
        </div>
        <p className="mt-2 text-center text-[11px] font-medium text-text-muted">
          {openFlags} flags · {unfinalizedCount} unfinalized
        </p>
      </div>
    </div>
  );
}
