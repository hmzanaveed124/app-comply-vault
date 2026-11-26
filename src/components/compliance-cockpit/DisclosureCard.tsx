"use client";

import { CheckCircle2, Circle, Lock, XCircle } from "lucide-react";
import { iapdFirmSummaryUrl } from "~/lib/disclosure-categories";
import { cn } from "~/lib/utils";
import type { DisclosureCategoryDto } from "~/lib/firm-profile-types";

type DisclosureCardProps = {
  category: DisclosureCategoryDto;
  crdNumber?: string | null;
  canWrite: boolean;
  onToggleRequest?: (slug: string) => void;
};

function statusMeta(status: DisclosureCategoryDto["status"]): {
  borderClass: string;
  icon: React.ReactNode;
  label: string;
} {
  switch (status) {
    case "SUPPRESSING":
      return {
        borderClass: "border-t-[3px] border-t-surface-border",
        icon: (
          <CheckCircle2
            className="h-3.5 w-3.5 text-semantic-success"
            aria-hidden
          />
        ),
        label: "Suppressing",
      };
    case "NEVER_SUPPRESS":
      return {
        borderClass: "border-t-[3px] border-t-semantic-danger",
        icon: (
          <>
            <XCircle className="h-3.5 w-3.5 text-semantic-danger" aria-hidden />
            <Lock className="h-3 w-3 text-semantic-danger" aria-hidden="true" />
          </>
        ),
        label: "Never suppress",
      };
    default:
      return {
        borderClass: "border border-surface-border",
        icon: <Circle className="h-3.5 w-3.5 text-text-muted" aria-hidden />,
        label: "Not suppressed",
      };
  }
}

function AdvItemRefLine({
  advItemRef,
  advPage,
  crdNumber,
}: {
  advItemRef: string | null;
  advPage: number | null;
  crdNumber?: string | null;
}): React.JSX.Element {
  const label = advItemRef
    ? `${advItemRef}${advPage ? ` · p.${advPage}` : ""}`
    : "ADV ref — pending parse";

  if (advItemRef && crdNumber?.trim()) {
    return (
      <a
        href={iapdFirmSummaryUrl(crdNumber)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-0.5 inline-block text-[10px] text-brand-dark underline-offset-2 hover:underline"
      >
        {label} ↗
      </a>
    );
  }

  return <div className="mt-0.5 text-[10px] text-text-muted">{label}</div>;
}

export function DisclosureCard({
  category,
  crdNumber,
  canWrite,
  onToggleRequest,
}: DisclosureCardProps): React.JSX.Element {
  const meta = statusMeta(category.status);
  const locked = category.neverSuppress || category.status === "NEVER_SUPPRESS";

  const card = (
    <div
      className={cn(
        "relative flex min-h-[120px] flex-col rounded-lg bg-surface-card p-3 shadow-sm",
        meta.borderClass,
      )}
      role={locked ? "status" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-text-primary">
            {category.displayName}
          </div>
          <AdvItemRefLine
            advItemRef={category.advItemRef}
            advPage={category.advPage}
            crdNumber={crdNumber}
          />
        </div>
        {canWrite ? (
          <button
            type="button"
            className="rounded border border-surface-border px-2 py-1 text-xs text-brand-dark"
            aria-label={`Configure ${category.displayName}`}
            onClick={() => onToggleRequest?.(category.slug)}
          >
            Configure
          </button>
        ) : null}
      </div>
      <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-text-secondary">
        {category.description}
      </p>
      <div className="mt-auto flex items-center gap-1.5 pt-2 text-[10px] text-text-secondary">
        {meta.icon}
        <span>
          {category.controlConfig
            ? "Configured · profile approval required"
            : "Baseline observation · configure policy"}
        </span>
      </div>
    </div>
  );

  if (locked) {
    return (
      <div
        className="cursor-default"
        title="Assess relevant conflicts and evidence under the approved firm policy."
      >
        {card}
      </div>
    );
  }

  return card;
}
