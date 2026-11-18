"use client";

import { useState } from "react";
import type { FlagCategoryData } from "~/lib/dashboard-types";

type FlagCategoryBarsProps = {
  categories: FlagCategoryData[];
  "aria-label"?: string;
};

export function FlagCategoryBars({
  categories,
  "aria-label": ariaLabel,
}: FlagCategoryBarsProps): React.JSX.Element {
  const total = categories.reduce((s, c) => s + c.count, 0) || 1;
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      className="flex h-full min-h-[190px] flex-col rounded-[14px] border border-surface-border bg-surface-card p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
      role="img"
      aria-label={
        ariaLabel ??
        `Flags by category: ${categories.map((c) => `${c.category} ${c.count}`).join(", ")}`
      }
    >
      <span className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
        Flags by category
      </span>
      <div className="flex min-h-0 flex-1 flex-col justify-center gap-2.5">
        {categories.map((row) => {
          const pct = total > 0 ? (row.count / total) * 100 : 0;
          const dim =
            hovered !== null && hovered !== row.category ? "opacity-[0.35]" : "opacity-100";
          return (
            <div
              key={row.category}
              className={`flex items-center gap-2 transition-opacity duration-200 ${dim}`}
              onMouseEnter={() => setHovered(row.category)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="w-[80px] shrink-0 text-right text-[10px] text-text-secondary">
                {row.category}
              </span>
              <div className="h-[10px] min-w-0 flex-1 overflow-hidden rounded-[5px] bg-surface-muted">
                <div
                  className="h-full rounded-[5px] transition-[width] duration-[800ms] [transition-timing-function:cubic-bezier(0.4,0,0.2,1)]"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: row.color,
                  }}
                />
              </div>
              <span className="w-[18px] shrink-0 text-right text-[11px] font-bold text-text-primary">
                {row.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
