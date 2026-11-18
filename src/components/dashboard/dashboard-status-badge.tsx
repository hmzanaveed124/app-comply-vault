import type { MeetingUiStatus } from "~/lib/dashboard-types";
import { cn } from "~/lib/utils";

const STYLES: Record<
  MeetingUiStatus,
  { bg: string; border: string; text: string; dot: string }
> = {
  review: {
    bg: "var(--cv-warning-bg)",
    border: "rgba(249, 115, 22, 0.12)",
    text: "var(--cv-warning-text)",
    dot: "var(--cv-semantic-orange)",
  },
  flagged: {
    bg: "var(--cv-danger-bg)",
    border: "rgba(239, 68, 68, 0.12)",
    text: "var(--cv-danger-text)",
    dot: "var(--cv-semantic-danger)",
  },
  finalized: {
    bg: "var(--cv-brand-light)",
    border: "rgba(17, 122, 75, 0.12)",
    text: "var(--cv-brand-dark)",
    dot: "var(--cv-brand)",
  },
  draft: {
    bg: "var(--cv-surface-muted)",
    border: "rgba(148, 163, 184, 0.12)",
    text: "var(--cv-text-secondary)",
    dot: "var(--cv-text-muted)",
  },
};

type DashboardStatusBadgeProps = {
  status: MeetingUiStatus;
  /** Override visible / aria label (e.g. Processing, In review) */
  label: string;
  /** Show spinner (upload/processing) */
  processing?: boolean;
  className?: string;
};

export function DashboardStatusBadge({
  status,
  label,
  processing = false,
  className,
}: DashboardStatusBadgeProps): React.JSX.Element {
  const s = STYLES[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[20px] border px-2.5 py-[3px] text-[10.5px] font-semibold",
        className,
      )}
      style={{
        backgroundColor: s.bg,
        borderColor: s.border,
        color: s.text,
      }}
      aria-label={label}
    >
      {processing ? (
        <span
          className="h-1.5 w-1.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden
        />
      ) : (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: s.dot }}
          aria-hidden
        />
      )}
      {label}
    </span>
  );
}
