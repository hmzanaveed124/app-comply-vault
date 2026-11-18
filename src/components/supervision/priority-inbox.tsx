import Link from "next/link";
import { ScrollToFinding } from "~/components/supervision/scroll-to-finding";
import { PriorityInboxFindingsTable } from "~/components/supervision/priority-inbox-findings-table";
import type { PriorityInboxDto } from "~/lib/types";
import type { SupervisionFilterState } from "~/server/supervision/filters";
import {
  PRIORITY_INBOX_TABS,
  SUPERVISION_FILTER_LABELS,
  supervisionHref,
} from "~/server/supervision/filters";

type PriorityInboxProps = {
  inbox: PriorityInboxDto;
  filters: SupervisionFilterState;
  focusId?: string;
};

export function PriorityInbox({
  inbox,
  filters,
  focusId,
}: PriorityInboxProps): React.JSX.Element {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {focusId ? <ScrollToFinding findingId={focusId} /> : null}
      <div>
        <Link
          href={supervisionHref("/supervision", { ...filters, inboxTab: undefined })}
          className="text-[12.5px] font-medium text-brand hover:underline"
        >
          ← Command Centre
        </Link>
      </div>

      <header className="space-y-2">
        <h1 className="text-[22px] font-semibold tracking-tight text-text-primary">
          CCO Priority Inbox
        </h1>
        <p className="max-w-3xl text-[14px] leading-snug text-text-secondary">
          Escalated findings requiring human judgment. ComplyVault has not determined
          that a violation occurred.
        </p>
        <p className="text-[16px] font-semibold text-text-primary">
          {inbox.header.selectivityStatement}
        </p>
        <p className="text-[12.5px] text-text-secondary">
          {inbox.header.priorityFindings} priority findings · {inbox.header.totalProcessed}{" "}
          processed interactions
        </p>
      </header>

      <nav aria-label="Priority Inbox tabs" className="flex flex-wrap gap-2">
        {PRIORITY_INBOX_TABS.map((tab) => {
          const active = inbox.tab === tab;
          return (
            <Link
              key={tab}
              href={supervisionHref("/priority-inbox", { ...filters, inboxTab: tab })}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-[8px] bg-surface-strong px-3 py-1.5 text-[13px] font-medium text-white"
                  : "rounded-[8px] border border-surface-border bg-surface-card px-3 py-1.5 text-[13px] font-medium text-text-primary hover:border-surface-border"
              }
            >
              {SUPERVISION_FILTER_LABELS.inboxTab[tab]} ({inbox.tabCounts[tab]})
            </Link>
          );
        })}
      </nav>

      {inbox.findings.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-surface-border bg-surface-card px-4 py-10 text-center">
          <p className="text-[14px] font-medium text-text-primary">
            No findings require review in this tab
          </p>
          <p className="mt-1 text-[13px] text-text-secondary">
            Cleared and routine sample interactions stay out of the Priority Inbox until a
            reviewer manually escalates them.
          </p>
        </div>
      ) : (
        <PriorityInboxFindingsTable findings={inbox.findings} focusId={focusId} />
      )}
    </div>
  );
}

