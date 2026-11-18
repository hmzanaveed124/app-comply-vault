import { Lock, CheckCircle2 } from "lucide-react";
import { cn } from "~/lib/utils";
import type { MeetingStatus } from "../../../generated/prisma";
import { SupersessionBadge } from "~/components/meetings/supersession-badge";

function MeetingStatusPill({ status }: { status: MeetingStatus | string }): React.ReactElement {
  const common = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium";
  switch (status) {
    case "DRAFT_READY":
    case "DRAFT":
      return (
        <span
          className={cn(common, "bg-warning-bg text-semantic-warning")}
          aria-label="Status: draft ready"
        >
          Draft ready
        </span>
      );
    case "ADVISOR_CERTIFIED":
      return (
        <span
          className={cn(common, "bg-brand-light text-brand")}
          aria-label="Status: advisor certified"
        >
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          Advisor certified
        </span>
      );
    case "CM_REVIEWED":
      return (
        <span
          className={cn(common, "bg-info-bg text-semantic-info")}
          aria-label="Status: CM reviewed"
        >
          CM reviewed
        </span>
      );
    case "CCO_SIGNED_OFF":
      return (
        <span
          className={cn(common, "bg-brand-light text-brand")}
          aria-label="Status: CCO signed off"
        >
          <CheckCircle2 className="h-3 w-3" aria-hidden />
          CCO signed off
        </span>
      );
    case "FINALIZED":
      return (
        <span
          className={cn(common, "bg-surface-muted text-text-primary")}
          aria-label="Status: finalized"
        >
          <Lock className="h-3 w-3" aria-hidden />
          Finalized
        </span>
      );
    default:
      return (
        <span
          className={cn(common, "bg-muted text-muted-foreground")}
          aria-label={`Status: ${status}`}
        >
          {String(status).replace(/_/g, " ")}
        </span>
      );
  }
}

export function MeetingHeaderCard({
  clientName,
  meetingDate,
  meetingType,
  advisorLabel,
  firmLabel,
  status,
  supersededById,
  supersedesId,
}: {
  clientName: string;
  meetingDate: Date;
  meetingType: string;
  advisorLabel: string;
  firmLabel: string;
  status: MeetingStatus | string;
  supersededById?: string | null;
  supersedesId?: string | null;
}): React.ReactElement {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-[18px] font-medium leading-snug text-foreground">{clientName}</h2>
        <div className="flex flex-col items-end gap-1.5">
          <MeetingStatusPill status={status} />
          {/* CV-TR-16 */}
          {supersededById || supersedesId ? (
            <SupersessionBadge
              supersededById={supersededById}
              supersedesId={supersedesId}
            />
          ) : null}
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[13px] text-muted-foreground">Meeting date</dt>
          <dd className="text-[13px] font-medium">{meetingDate.toLocaleDateString()}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted-foreground">Type</dt>
          <dd className="text-[13px] font-medium">{meetingType}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted-foreground">Advisor</dt>
          <dd className="text-[13px] font-medium">{advisorLabel}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted-foreground">Firm</dt>
          <dd className="text-[13px] font-medium">{firmLabel}</dd>
        </div>
      </dl>
    </div>
  );
}
