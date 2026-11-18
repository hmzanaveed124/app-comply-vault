import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  getPriorityFinding,
  recordFindingView,
} from "~/server/supervision/inbox";
import {
  parseSupervisionFilters,
  SUPERVISION_FILTER_LABELS,
  supervisionHref,
} from "~/server/supervision/filters";
import { redirectPathForMissingWorkspace } from "~/server/workspace/no-workspace-redirect";

export const dynamic = "force-dynamic";

export default async function FindingPage({
  params,
  searchParams,
}: {
  params: Promise<{ findingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }
  if (!session.user.workspaceId || session.user.workspaceId === "") {
    redirect(await redirectPathForMissingWorkspace(session.user.id, session.user.email));
  }

  const { findingId } = await params;
  const filters = parseSupervisionFilters(await searchParams);
  const finding = await getPriorityFinding(db, {
    userId: session.user.id,
    findingId,
  });
  if (!finding) {
    notFound();
  }

  await recordFindingView({
    db,
    userId: session.user.id,
    workspaceId: finding.firmId,
    findingId: finding.id,
  });

  const backHref = supervisionHref("/priority-inbox", filters, {
    finding: finding.id,
  });

  return (
    <div className="min-h-0 bg-surface-page px-6 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href={backHref} className="text-[12.5px] font-medium text-brand hover:underline">
          ← Priority Inbox
        </Link>
        <h1 className="text-[22px] font-semibold text-text-primary">{finding.title}</h1>
        <p className="rounded-[8px] border border-surface-border bg-brand-light px-3 py-2 text-[12.5px] text-brand">
          ComplyVault has identified evidence requiring human supervisory review. It has not
          determined that a violation occurred.
        </p>
        <dl className="grid gap-3 rounded-[12px] border border-surface-border bg-surface-card p-4 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-text-secondary">Firm</dt>
            <dd className="mt-1 text-[14px]">{finding.firmName}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-text-secondary">Adviser</dt>
            <dd className="mt-1 text-[14px]">{finding.adviserName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-text-secondary">Status</dt>
            <dd className="mt-1 text-[14px]">
              {SUPERVISION_FILTER_LABELS.findingStatus[finding.status]}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-text-secondary">
              Primary control
            </dt>
            <dd className="mt-1 text-[14px]">
              {Object.keys(SUPERVISION_FILTER_LABELS.control).includes(finding.primaryControl)
                ? SUPERVISION_FILTER_LABELS.control[
                    finding.primaryControl as keyof typeof SUPERVISION_FILTER_LABELS.control // CAST: key present in control label map
                  ]
                : finding.primaryControl}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-text-secondary">
              Policy mapping
            </dt>
            <dd className="mt-1 text-[14px]">{finding.policyMappingCode}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.04em] text-text-secondary">Owner</dt>
            <dd className="mt-1 text-[14px]">{finding.ownerName ?? "Unassigned"}</dd>
          </div>
        </dl>
        <p className="text-[13px] text-text-secondary">
          Full finding sections land in CV-SI-008. Queue filters and scroll position are
          preserved on return.
        </p>
      </div>
    </div>
  );
}
