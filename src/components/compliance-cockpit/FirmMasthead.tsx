"use client";

import { Button } from "~/components/ui/button";
import type { FirmProfileDto } from "~/lib/firm-profile-types";

type FirmMastheadProps = {
  workspaceName: string;
  profile: FirmProfileDto;
  canWrite: boolean;
  needsReapproval: boolean;
  invalidatedApprovalAt: string | null;
  onApprove: () => void;
};

function formatAum(value: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  return `$${num.toLocaleString()}`;
}

export function FirmMasthead({
  workspaceName,
  profile,
  canWrite,
  needsReapproval,
  invalidatedApprovalAt,
  onApprove,
}: FirmMastheadProps): React.JSX.Element {
  const advDate = profile.advFilingDate
    ? new Date(profile.advFilingDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

  return (
    <header className="sticky top-14 z-10 border-b border-surface-border bg-surface-page/95 px-4 py-3 backdrop-blur sm:px-6">
      {needsReapproval && invalidatedApprovalAt ? (
        <div className="mb-2 rounded-md border border-semantic-warning/40 bg-warning-bg px-3 py-2 text-[12px] text-warning-text">
          Profile changes since last approval — re-approval required.
        </div>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[15px] font-medium text-text-primary">{workspaceName}</h1>
            {profile.crdNumber ? (
              <span className="rounded bg-surface-muted px-2 py-0.5 text-[10px] text-text-muted">
                CRD {profile.crdNumber}
              </span>
            ) : null}
          </div>
          {profile.riskFlags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {profile.riskFlags.map((flag) => (
                <span
                  key={flag}
                  className="rounded-full bg-warning-bg px-2 py-0.5 text-[10px] font-medium text-warning-text"
                >
                  {flag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-end gap-6 text-right text-[11px] text-text-secondary">
          <div>
            <div className="text-text-muted">CCO</div>
            <div className="font-medium text-text-primary">{profile.ccoName ?? "—"}</div>
          </div>
          <div>
            <div className="text-text-muted">ADV filed</div>
            <div className="font-medium text-text-primary">{advDate}</div>
          </div>
          <div>
            <div className="text-text-muted">AUM</div>
            <div className="font-medium text-text-primary">{formatAum(profile.aumUsd)}</div>
          </div>
          {canWrite ? (
            <Button
              type="button"
              className="bg-brand-dark text-white hover:bg-brand-dark/90"
              onClick={onApprove}
            >
              Approve Profile
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
