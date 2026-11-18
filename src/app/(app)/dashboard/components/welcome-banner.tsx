"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { ROLE_CONFIG, type WorkspaceRoleKey } from "~/lib/role-config";

type WelcomeBannerProps = {
  workspaceId: string;
  workspaceName: string;
  role: WorkspaceRoleKey;
};

export function WelcomeBanner({
  workspaceId,
  workspaceName,
  role,
}: WelcomeBannerProps): React.ReactElement {
  const [dismissing, setDismissing] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const roleConfig = ROLE_CONFIG[role];

  if (dismissed) {
    return <></>;
  }

  const handleDismiss = async (): Promise<void> => {
    setDismissing(true);
    try {
      await fetch(`/api/workspaces/${workspaceId}/onboarding/dismiss`, {
        method: "PATCH",
      });
      setDismissed(true);
    } finally {
      setDismissing(false);
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-border bg-surface-card p-5 shadow-sm border-l-4 border-l-brand">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Welcome to {workspaceName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            As {roleConfig.label}, here&apos;s how to get started:
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-foreground">
            {roleConfig.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted-foreground"
          disabled={dismissing}
          onClick={() => void handleDismiss()}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
