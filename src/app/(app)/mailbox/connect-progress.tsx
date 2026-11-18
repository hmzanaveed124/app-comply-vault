"use client";

import { Badge } from "~/components/ui/badge";
import { isRelease1DemoEnabled } from "~/lib/feature-flags";

export const CONNECT_PROGRESS_STAGES = [
  "authorising",
  "enumerating",
  "ingesting",
  "classifying",
  "resolving",
] as const;

export type ConnectProgressStage = (typeof CONNECT_PROGRESS_STAGES)[number];

const STAGE_LABELS: Record<ConnectProgressStage, string> = {
  authorising: "Authorising",
  enumerating: "Enumerating",
  ingesting: "Ingesting",
  classifying: "Classifying",
  resolving: "Resolving",
};

/**
 * CV-OB-02 — staged connect path for zero setup to first evidence.
 */
export function ConnectProgress({
  currentStage,
}: {
  currentStage: ConnectProgressStage;
}): React.JSX.Element | null {
  if (!isRelease1DemoEnabled()) return null;

  const currentIndex = CONNECT_PROGRESS_STAGES.indexOf(currentStage);
  return (
    <div className="space-y-2" aria-label="Mailbox connection progress">
      <p className="text-sm font-medium text-text-primary">
        Zero setup — connect to first evidence
      </p>
      <p className="text-xs text-muted-foreground">
        No client CSV. No policy wizard. Ambiguous identities stay held for the
        CCO after sync.
      </p>
      <ol className="flex flex-wrap gap-2">
        {CONNECT_PROGRESS_STAGES.map((stage, index) => (
          <li key={stage}>
            <Badge
              variant={index === currentIndex ? "default" : "outline"}
              className={
                index < currentIndex
                  ? "border-brand/30 bg-brand/10 text-brand"
                  : undefined
              }
            >
              {STAGE_LABELS[stage]}
            </Badge>
          </li>
        ))}
      </ol>
    </div>
  );
}
