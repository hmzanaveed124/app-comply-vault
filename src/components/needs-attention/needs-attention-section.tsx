import Link from "next/link";
import { ChainView } from "~/components/evidence/chain-view";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import type { ComplianceItem, ComplianceItemCapability } from "~/server/evidence/types";

const severityClassName: Record<ComplianceItem["severity"], string> = {
  critical: "border-destructive/30 bg-destructive/10 text-destructive",
  high: "border-warning-border/30 bg-warning-bg text-warning-text",
  medium: "border-warning-border/30 bg-warning-bg text-warning-text",
  low: "border-success-border/30 bg-success-bg text-success-text",
};

const capabilityLabels: Partial<Record<ComplianceItemCapability, string>> = {
  reviewable: "Review",
  approvable: "Approve",
  dismissible: "Dismiss",
  assignable: "Assign",
};

function actionHref(item: ComplianceItem, capability: ComplianceItemCapability): string | null {
  if (item.kind === "candidate_pack") return "/candidate-pack";
  if (item.kind === "parked_ingest") return "/fail-closed";
  if (item.kind === "held_identity") return "/mailbox/triage";
  if (capability === "reviewable" && item.kind === "flag") return "/review";
  return null;
}

export function NeedsAttentionSection({
  items,
}: {
  items: ComplianceItem[];
}): React.JSX.Element {
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nothing needs attention</CardTitle>
          <CardDescription>
            Open items, held identities, parked ingests, and candidate packs awaiting review appear here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <Card key={`${item.kind}-${item.id}`}>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription className="mt-2">{item.summary}</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={severityClassName[item.severity]}>
                  {item.severity}
                </Badge>
                <Badge variant="outline">{item.ageDays} days open</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <dl className="grid gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="font-medium text-foreground">Why it matters</dt>
                <dd className="mt-1 text-muted-foreground">{item.whyItMatters}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">What is missing</dt>
                <dd className="mt-1 text-muted-foreground">
                  {item.whatIsMissing ?? "No additional evidence is currently missing."}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Expected action</dt>
                <dd className="mt-1 text-muted-foreground">{item.expectedAction}</dd>
              </div>
            </dl>
            <div>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Evidence chain</h3>
              <ChainView stages={item.chain} />
            </div>
            <div className="flex flex-wrap gap-2">
              {item.capabilities
                .filter((capability) => capability !== "none")
                .map((capability) => {
                  const label = capabilityLabels[capability];
                  const href = actionHref(item, capability);
                  if (!label || !href) return null;
                  return (
                    <Button key={capability} variant="outline" size="sm" asChild>
                      <Link href={href}>{label}</Link>
                    </Button>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
