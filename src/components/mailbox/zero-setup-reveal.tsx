"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { isRelease1DemoEnabled } from "~/lib/feature-flags";
import { zeroSetupCopy } from "~/components/mailbox/zero-setup-copy";

/**
 * CV-OB / N2 — Zero setup to first evidence.
 * Counts are workspace open items. Do not claim they came from Gmail
 * unless a sync has actually produced them.
 */
export function ZeroSetupReveal({
  heldIdentityCount = 0,
  openFlagCount = 0,
  parkedCount = 0,
  lastSyncAt = null,
}: {
  heldIdentityCount?: number;
  openFlagCount?: number;
  parkedCount?: number;
  /** ISO timestamp of last mailbox sync, if any. */
  lastSyncAt?: string | null;
}): React.JSX.Element | null {
  if (!isRelease1DemoEnabled()) return null;

  const synced = Boolean(lastSyncAt);
  const total = heldIdentityCount + openFlagCount + parkedCount;
  const copy = zeroSetupCopy({ synced, totalOpenItems: total });

  return (
    <section
      className="rounded-lg border border-brand/25 bg-brand/5 p-5"
      aria-labelledby="zero-setup-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge variant="outline" className="border-brand/40 text-brand">
            Zero setup
          </Badge>
          <h2
            id="zero-setup-heading"
            className="mt-2 text-lg font-semibold tracking-tight text-text-primary"
          >
            {copy.heading}
          </h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {copy.body}
          </p>
          {synced && lastSyncAt && (
            <p className="mt-1 text-xs text-muted-foreground">
              Last mailbox sync: {new Date(lastSyncAt).toLocaleString()}
            </p>
          )}
        </div>
        <Button asChild className="bg-surface-strong hover:bg-surface-strong/90">
          <Link href="/needs-attention">
            {copy.cta}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <ul className="mt-4 flex flex-wrap gap-3 text-sm">
        <li className="rounded-md border bg-background px-3 py-1.5">
          <span className="font-medium text-foreground">{heldIdentityCount}</span>{" "}
          <span className="text-muted-foreground">held for confirmation</span>
        </li>
        <li className="rounded-md border bg-background px-3 py-1.5">
          <span className="font-medium text-foreground">{openFlagCount}</span>{" "}
          <span className="text-muted-foreground">open triage signals</span>
        </li>
        <li className="rounded-md border bg-background px-3 py-1.5">
          <span className="font-medium text-foreground">{parkedCount}</span>{" "}
          <span className="text-muted-foreground">fail-closed parked</span>
        </li>
      </ul>
    </section>
  );
}
