import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getSupervisionSummary } from "~/server/supervision/service";
import { listAuthorisedFirmWorkspaceIds } from "~/server/supervision/portfolio";
import { ADVIZORSTACK_FIRMS } from "~/server/supervision/advizorstack-tenant";
import {
  parseSupervisionFilters,
  supervisionHref,
  toSummaryQuery,
} from "~/server/supervision/filters";
import { redirectPathForMissingWorkspace } from "~/server/workspace/no-workspace-redirect";

export const dynamic = "force-dynamic";

export default async function FirmSupervisionPage({
  params,
  searchParams,
}: {
  params: Promise<{ firmId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  if (!session.user.workspaceId || session.user.workspaceId === "") {
    redirect(await redirectPathForMissingWorkspace(session.user.id, session.user.email));
  }

  const { firmId } = await params;
  const filters = parseSupervisionFilters(await searchParams);
  const authorised = await listAuthorisedFirmWorkspaceIds(db, session.user.id, firmId);
  if (authorised.length === 0) {
    notFound();
  }

  const firm = ADVIZORSTACK_FIRMS.find((f) => f.workspaceId === firmId);
  const workspace = await db.workspace.findUnique({
    where: { id: firmId },
    select: { name: true },
  });
  const query = toSummaryQuery({ ...filters, firmId });
  const summary = await getSupervisionSummary(db, firmId, {
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    firmId,
    adviserId: query.adviserId,
    channel: query.channel,
    control: query.control,
    outcome: query.outcome,
    severity: query.severity,
    findingStatus: query.findingStatus,
  });
  const backHref = supervisionHref("/supervision", { ...filters, firmId: undefined });
  const inboxHref = supervisionHref("/priority-inbox", { ...filters, firmId });

  return (
    <div className="min-h-0 bg-surface-page px-6 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href={backHref} className="text-[12.5px] font-medium text-brand hover:underline">
          ← Command Centre
        </Link>
        <h1 className="text-[22px] font-semibold text-text-primary">
          {workspace?.name ?? firm?.name ?? "Firm supervision"}
        </h1>
        <p className="text-[13px] text-text-secondary">
          Firm-level supervision view. Full drill-down sections land in CV-SI-027.
        </p>
        <dl className="grid gap-3 rounded-[12px] border border-surface-border bg-surface-card p-4 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-text-secondary">Processed</dt>
            <dd className="mt-1 text-[20px] font-semibold tabular-nums">
              {summary.counts.totalProcessed}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-text-secondary">
              Priority findings
            </dt>
            <dd className="mt-1 text-[20px] font-semibold tabular-nums">
              {summary.counts.priorityFindings}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-text-secondary">
              Routine samples
            </dt>
            <dd className="mt-1 text-[20px] font-semibold tabular-nums">
              {summary.counts.routineSamples}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-text-secondary">
              Open remediation
            </dt>
            <dd className="mt-1 text-[20px] font-semibold tabular-nums">
              {summary.counts.openRemediation}
            </dd>
          </div>
        </dl>
        <Link
          href={inboxHref}
          className="text-[13px] font-medium text-brand hover:underline"
        >
          Open CCO Priority Inbox
        </Link>
      </div>
    </div>
  );
}
