import {
  ArrowUp,
  Check,
  Clock,
  Cpu,
  Download,
  History,
  Lock,
  Pencil,
  Scale,
  ShieldCheck,
  Undo2,
  UserCheck,
} from "lucide-react";
import { cn } from "~/lib/utils";
import type { MeetingAuditTrailEntry, MeetingAuditTrailVariant } from "~/lib/meeting-audit-trail";

function entryIcon(variant: MeetingAuditTrailVariant): React.ReactElement {
  const cls = "h-4 w-4";
  switch (variant) {
    case "finalize":
      return <Lock className={cls} aria-hidden />;
    case "cco":
      return <Scale className={cls} aria-hidden />;
    case "cm":
      return <ShieldCheck className={cls} aria-hidden />;
    case "advisor":
      return <UserCheck className={cls} aria-hidden />;
    case "revert":
      return <Undo2 className={cls} aria-hidden />;
    case "flag":
      return <Check className={cls} aria-hidden />;
    case "export":
      return <Download className={cls} aria-hidden />;
    case "edit":
      return <Pencil className={cls} aria-hidden />;
    default:
      return <Cpu className={cls} aria-hidden />;
  }
}

function entryBorderClass(variant: MeetingAuditTrailVariant): string {
  switch (variant) {
    case "finalize":
    case "advisor":
      return "border-brand text-brand";
    case "cco":
      return "border-semantic-warning text-semantic-warning";
    case "cm":
      return "border-semantic-info text-semantic-info";
    case "revert":
      return "border-semantic-danger text-semantic-danger";
    case "flag":
      return "border-text-secondary text-text-secondary";
    case "export":
      return "border-text-secondary text-text-secondary";
    case "edit":
      return "border-text-secondary text-text-secondary";
    default:
      return "border-text-secondary text-text-secondary";
  }
}

export function MeetingAuditTrail({ entries }: { entries: MeetingAuditTrailEntry[] }): React.ReactElement {
  return (
    <section className="space-y-3" aria-labelledby="audit-trail-heading">
      <h3
        id="audit-trail-heading"
        className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground leading-snug"
      >
        <History className="h-[15px] w-[15px] shrink-0 text-muted-foreground" aria-hidden />
        Audit trail
      </h3>
      <div className="rounded-xl border border-border bg-card px-5 py-4 shadow-sm">
        {entries.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">
            No workflow events recorded yet for this meeting.
          </p>
        ) : (
          <ul className="relative space-y-0">
            {entries.map((e, idx) => {
              const isLast = idx === entries.length - 1;
              const border = entryBorderClass(e.variant);
              return (
                <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast ? (
                    <div
                      className="absolute left-[17px] top-9 h-[calc(100%-8px)] w-px bg-border"
                      aria-hidden
                    />
                  ) : null}
                  <div
                    className={cn(
                      "relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[1.5px] bg-background",
                      border,
                    )}
                  >
                    {e.variant === "flag" && e.actionLabel.includes("escalated") ? (
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    ) : (
                      entryIcon(e.variant)
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                    <p className="text-[13px] font-medium leading-snug text-foreground">
                      {e.actionLabel}
                    </p>
                    <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                      <time dateTime={e.timestampIso}>
                        {new Date(e.timestampIso).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </time>
                      <span aria-hidden>·</span>
                      <span>{e.actorDisplay}</span>
                    </p>
                    {e.detailLine ? (
                      <p className="text-[12px] leading-relaxed text-muted-foreground">{e.detailLine}</p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
