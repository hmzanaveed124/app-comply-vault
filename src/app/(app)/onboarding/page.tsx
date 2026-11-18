import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { loadWorkspaceJourney } from "~/server/onboarding/load-workspace-journey";
import { WorkspaceJourneyPanel } from "~/components/onboarding/workspace-journey";
import { redirectPathForMissingWorkspace } from "~/server/workspace/no-workspace-redirect";
export const dynamic = "force-dynamic";
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");
  if (!session.user.workspaceId)
    redirect(
      await redirectPathForMissingWorkspace(
        session.user.id,
        session.user.email,
      ),
    );
  const journey = await loadWorkspaceJourney(
    db,
    session.user.id,
    session.user.workspaceId,
  );
  if (!journey)
    redirect(
      await redirectPathForMissingWorkspace(
        session.user.id,
        session.user.email,
      ),
    );
  return (
    <div className="min-h-0 bg-surface-page px-4 py-6 sm:px-6">
      <WorkspaceJourneyPanel journey={journey} mode="setup" />
    </div>
  );
}
