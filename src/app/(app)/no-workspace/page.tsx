import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { activeUserWorkspaceWhere } from "~/lib/user-workspace-filters";

export default async function NoWorkspacePage(): Promise<React.ReactElement> {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }

  const activeMembership = await db.userWorkspace.findFirst({
    where: { userId: session.user.id, ...activeUserWorkspaceWhere },
  });
  if (activeMembership) {
    redirect("/dashboard");
  }

  const lastRemoval = await db.userWorkspace.findFirst({
    where: { userId: session.user.id, removedAt: { not: null } },
    include: { workspace: { select: { name: true } } },
    orderBy: { removedAt: "desc" },
  });

  const workspaceName = lastRemoval?.workspace?.name;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-surface-border bg-surface-card p-8 text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="var(--cv-text-muted)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 6v4m0 4h.01M18 10a8 8 0 11-16 0 8 8 0 0116 0z" />
          </svg>
        </div>

        <h1 className="mb-2 text-lg font-semibold text-text-primary">No active workspace</h1>

        <p className="mb-6 text-sm leading-relaxed text-text-secondary">
          {workspaceName
            ? `You're no longer a member of ${workspaceName}. If you believe this is an error, contact the workspace administrator.`
            : "You don't currently belong to any workspace. If you were recently removed, contact the workspace administrator."}
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/workspaces/new"
            className="w-full rounded-lg border border-surface-border bg-surface-card px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-muted"
          >
            Create your own workspace
          </Link>
        </div>

        <p className="mt-4 text-xs text-text-muted">
          If you&apos;ve been re-invited, check your email for a new invitation link.
        </p>
      </div>
    </div>
  );
}
