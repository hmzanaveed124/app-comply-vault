"use client";
import { useState } from "react";
import { Segmented, Select } from "antd";
import { WorkspaceJourneyPanel } from "~/components/onboarding/workspace-journey";
import { buildWorkspaceJourney } from "~/lib/onboarding/journey";
import { ROLE_CONFIG, type WorkspaceRoleKey } from "~/lib/role-config";
import { ThemeToggle } from "~/theme/provider";
const scenarios = [
  "New workspace",
  "Ready to add",
  "Processing",
  "Review ready",
  "Established",
] as const;
export function JourneyPreview() {
  const [scenario, setScenario] = useState<string>("New workspace");
  const [role, setRole] = useState<WorkspaceRoleKey>("OWNER_CCO");
  const [mode, setMode] = useState<"setup" | "home">("setup");
  const hasRecord =
    scenario === "Processing" ||
    scenario === "Review ready" ||
    scenario === "Established";
  const journey = buildWorkspaceJourney({
    workspaceId: "sample-workspace",
    workspaceName: "Cedar Grove Advisory · sample",
    userId: "sample-user",
    role,
    dismissed: scenario === "Established",
    mediaReady: scenario !== "New workspace",
    meetingCount: hasRecord ? 3 : 0,
    reviewedCount: scenario === "Established" ? 3 : 0,
    finishedCount: scenario === "Established" ? 3 : 0,
    connected: false,
    nextRecord:
      scenario === "Review ready"
        ? {
            id: "sample-record",
            status:
              role === "ADVISOR"
                ? "DRAFT_READY"
                : role === "MEMBER"
                  ? "ADVISOR_CERTIFIED"
                  : "CM_REVIEWED",
          }
        : null,
    processingRecord:
      scenario === "Processing" ? { id: "sample-record", failed: false } : null,
  });
  return (
    <main className="min-h-screen bg-surface-page p-4 sm:p-6">
      <div className="mx-auto mb-5 max-w-[1240px] rounded-lg border border-surface-border bg-surface-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-text-primary">
              ComplyVault journey preview
            </p>
            <p className="text-sm text-text-secondary">
              Sample data. No records are created. Walkthrough works; task links
              require sign-in.
            </p>
          </div>
          <ThemeToggle />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Select
            aria-label="Workspace scenario"
            value={scenario}
            onChange={setScenario}
            style={{ minWidth: 170 }}
            options={scenarios.map((value) => ({ value, label: value }))}
          />
          <Select
            aria-label="User role"
            value={role}
            onChange={setRole}
            style={{ minWidth: 190 }}
            options={Object.entries(ROLE_CONFIG).map(([value, config]) => ({
              value,
              label: config.label,
            }))}
          />
          <Segmented
            aria-label="Journey view"
            value={mode}
            onChange={setMode}
            options={[
              { value: "setup", label: "Getting started" },
              { value: "home", label: "Returning Home" },
            ]}
          />
        </div>
      </div>
      <WorkspaceJourneyPanel
        key={`${role}-${scenario}-${mode}`}
        journey={journey}
        mode={mode}
        preview
      />
    </main>
  );
}
