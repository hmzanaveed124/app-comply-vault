"use client";

import type { DisclosureCategoryDto } from "~/lib/firm-profile-types";
import { DISCLOSURE_CATEGORY_CATALOG } from "~/lib/disclosure-categories";

type FirmPostureRingProps = {
  categories: DisclosureCategoryDto[];
};

export function FirmPostureRing({ categories }: FirmPostureRingProps): React.JSX.Element {
  const total = DISCLOSURE_CATEGORY_CATALOG.length;
  let suppressing = 0;
  let neverSuppress = 0;
  let active = 0;

  for (const cat of categories) {
    if (cat.status === "SUPPRESSING") suppressing += 1;
    else if (cat.status === "NEVER_SUPPRESS" || cat.neverSuppress) neverSuppress += 1;
    else active += 1;
  }

  const suppressingPct = total > 0 ? (suppressing / total) * 100 : 0;
  const neverPct = total > 0 ? (neverSuppress / total) * 100 : 0;
  const activePct = Math.max(0, 100 - suppressingPct - neverPct);

  const size = 120;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className="flex flex-col items-center rounded-lg border border-surface-border bg-surface-card p-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Firm posture">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--cv-surface-border)"
          strokeWidth={stroke}
        />
        {activePct > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--cv-text-muted)"
            strokeWidth={stroke}
            strokeDasharray={`${(activePct / 100) * c} ${c}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
        {suppressingPct > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--cv-semantic-success)"
            strokeWidth={stroke}
            strokeDasharray={`${(suppressingPct / 100) * c} ${c}`}
            strokeDashoffset={-((activePct / 100) * c)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
        {neverPct > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--cv-semantic-danger)"
            strokeWidth={stroke}
            strokeDasharray={`${(neverPct / 100) * c} ${c}`}
            strokeDashoffset={-(((activePct + suppressingPct) / 100) * c)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-text-primary text-[22px] font-semibold"
          fontSize={22}
        >
          {suppressing}
        </text>
      </svg>
      <p className="mt-2 text-center text-[11px] text-text-secondary">
        {suppressing} of {total} categories covered by firm docs.
      </p>
    </div>
  );
}
