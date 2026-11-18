import { Badge } from "~/components/ui/badge";
import type { ChainStage, ChainStageState } from "~/server/evidence/types";

const stateLabel: Record<ChainStageState, string> = {
  complete: "Complete",
  pending: "Pending",
  missing: "Missing",
  not_applicable: "Not applicable",
};

const stateClassName: Record<ChainStageState, string> = {
  complete: "border-success-border/30 bg-success-bg text-success-text",
  pending: "border-warning-border/30 bg-warning-bg text-warning-text",
  missing: "border-destructive/30 bg-destructive/10 text-destructive",
  not_applicable: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

function formatTimestamp(value: string | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ChainView({
  stages,
  className,
}: {
  stages: ChainStage[];
  className?: string;
}): React.JSX.Element {
  return (
    <ol className={className ?? "space-y-3"} aria-label="Evidence chain">
      {stages.map((stage) => {
        const timestamp = formatTimestamp(stage.at);
        return (
          <li
            key={stage.key}
            className="flex gap-3 border-l-2 border-border pl-3 last:border-l-0"
          >
            <div className="min-w-0 flex-1 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-foreground">{stage.label}</span>
                <Badge variant="outline" className={stateClassName[stage.state]}>
                  {stateLabel[stage.state]}
                </Badge>
              </div>
              {stage.summary ? (
                <p className="mt-1 text-sm text-muted-foreground">{stage.summary}</p>
              ) : null}
              {timestamp || stage.byUserId ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {[timestamp, stage.byUserId ? `by ${stage.byUserId}` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              ) : null}
              {stage.evidenceRef?.label ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Evidence: {stage.evidenceRef.label}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
