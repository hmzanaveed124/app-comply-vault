"use client";

import Link from "next/link";
import { Badge } from "~/components/ui/badge";
import type { CommunicationThreadDto } from "~/lib/types/evidence";

export function CommunicationsClient({
  threads,
  failedClassificationCount = 0,
}: {
  threads: CommunicationThreadDto[];
  failedClassificationCount?: number;
}) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Communications</h1>
          <p className="text-sm text-muted-foreground">Email threads ingested from M365</p>
        </div>
        <div className="flex items-center gap-4">
          {failedClassificationCount > 0 ? (
            <Badge variant="destructive">
              {failedClassificationCount} unclassified
              {failedClassificationCount === 1 ? " message" : " messages"}
            </Badge>
          ) : null}
          <Link
            href="/integrations/m365-mail"
            className="text-sm text-brand hover:underline"
          >
            Manage M365
          </Link>
          <Link
            href="/integrations/gmail-mail"
            className="text-sm text-brand hover:underline"
          >
            Manage Gmail
          </Link>
        </div>
      </div>

      {threads.length === 0 ? (
        <p className="text-sm text-muted-foreground">No threads yet. Connect a mailbox to begin.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/communications/threads/${t.id}`}
                className="block px-4 py-3 hover:bg-muted/50"
              >
                <p className="font-medium">{t.subject ?? "(no subject)"}</p>
                <p className="text-xs text-muted-foreground">
                  {t.messageCount} messages · {t.channel}
                  {t.clientName ? ` · ${t.clientName}` : ""}
                  {t.lastMessageAt
                    ? ` · ${new Date(t.lastMessageAt).toLocaleString()}`
                    : ""}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
