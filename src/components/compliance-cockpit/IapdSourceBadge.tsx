import { ShieldCheck } from "lucide-react";
import type { IapdFirmLookupResult } from "~/lib/iapd-types";

type IapdSourceBadgeProps = {
  firm: IapdFirmLookupResult;
};

function formatFilingDate(date: string | null): string {
  if (!date) {
    return "unknown";
  }
  return date.slice(0, 10);
}

export function IapdSourceBadge({ firm }: IapdSourceBadgeProps): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px] text-text-secondary">
      <ShieldCheck size={12} className="text-success-text" aria-hidden />
      <span>Sourced from SEC IAPD</span>
      <span aria-hidden>·</span>
      <span>CRD {firm.crdNumber}</span>
      {firm.advFilingDate ? (
        <>
          <span aria-hidden>·</span>
          <span>Last filed {formatFilingDate(firm.advFilingDate)}</span>
        </>
      ) : null}
      <span aria-hidden>·</span>
      <a
        href={`https://adviserinfo.sec.gov/firm/summary/${firm.crdNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-dark underline-offset-2 hover:underline"
      >
        View on IAPD ↗
      </a>
    </div>
  );
}
