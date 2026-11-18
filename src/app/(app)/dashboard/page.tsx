import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { redirect } from "next/navigation";
import { buildDashboardSummary } from "~/server/dashboard/build-dashboard-summary";
import { getSupervisionSummary } from "~/server/supervision/service";
import { DashboardView } from "~/components/dashboard/dashboard-view";
import { WorkspaceJourneyPanel } from "~/components/onboarding/workspace-journey";
import { loadWorkspaceJourney } from "~/server/onboarding/load-workspace-journey";
import { redirectPathForMissingWorkspace } from "~/server/workspace/no-workspace-redirect";
import { isDashboardRange, type DashboardRange } from "~/lib/dashboard-types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}): Promise<React.ReactElement> {
  const session = await auth();

  if (!session?.user?.workspaceId || session.user.workspaceId === "") {
    if (!session?.user) {
      redirect("/auth/signin");
    }
    redirect(
      await redirectPathForMissingWorkspace(
        session.user.id,
        session.user.email,
      ),
    );
  }

  const workspaceId = session.user.workspaceId;

  const rawRange = (await searchParams).range;
  const range: DashboardRange = isDashboardRange(rawRange) ? rawRange : "90d";

  const journey = await loadWorkspaceJourney(db, session.user.id, workspaceId);
  if (!journey)
    redirect(
      await redirectPathForMissingWorkspace(
        session.user.id,
        session.user.email,
      ),
    );
  // An empty workspace needs a route to value, rather than empty charts.
  if (journey.meetingCount === 0 && !journey.hasCorrespondence)
    return (
      <div className="min-h-0 bg-surface-page px-4 py-6 sm:px-6">
        <WorkspaceJourneyPanel journey={journey} />
      </div>
    );
  const [summary, supervisionSummary] = await Promise.all([
    buildDashboardSummary(db, workspaceId, range),
    getSupervisionSummary(db, workspaceId),
  ]);
  return (
    <div className="min-h-0 bg-surface-page px-4 py-6 sm:px-6">
      <WorkspaceJourneyPanel journey={journey} />
      <DashboardView
        summary={summary}
        supervisionSummary={supervisionSummary}
        workspaceName={journey.workspaceName}
      />
    </div>
  );
}
