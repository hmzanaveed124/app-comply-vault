"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "~/lib/toast";
import { FileText } from "lucide-react";
import type { CockpitBundleDto } from "~/lib/firm-profile-types";
import { FirmMasthead } from "./FirmMasthead";
import { FirmPostureRing } from "./FirmPostureRing";
import { DisclosureGrid } from "./DisclosureGrid";
import { SuppressionLogPanel } from "./SuppressionLogPanel";
import { ContextualControlEditor } from "./ContextualControlEditor";
import { SuppressionEvidenceModal } from "./SuppressionEvidenceModal";
import { ApproveProfileModal } from "./ApproveProfileModal";
import { FirstRunWizard } from "./FirstRunWizard";
import type { DisclosureCategoryDto } from "~/lib/firm-profile-types";

type ComplianceCockpitClientProps = CockpitBundleDto & {
  workspaceId: string;
  canWrite: boolean;
};

export function ComplianceCockpitClient(
  props: ComplianceCockpitClientProps,
): React.JSX.Element {
  const router = useRouter();
  const [categories, setCategories] = useState(props.categories);
  const [profile, setProfile] = useState(props.profile);
  const [suppressionLog, setSuppressionLog] = useState(props.suppressionLog);
  const [metrics] = useState(props.metrics);
  const [evidenceSlug, setEvidenceSlug] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [controlCategory, setControlCategory] =
    useState<DisclosureCategoryDto | null>(null);
  const [pendingToggle, setPendingToggle] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    const res = await fetch(
      `/api/workspaces/${props.workspaceId}/firm-profile`,
    );
    if (!res.ok) return;
    const json = (await res.json()) as {
      data: CockpitBundleDto & { canWrite: boolean };
    };
    setCategories(json.data.categories);
    setProfile(json.data.profile);
    setSuppressionLog(json.data.suppressionLog);
    router.refresh();
  }, [props.workspaceId, router]);

  if (!profile || profile.status === "DRAFT") {
    return (
      <FirstRunWizard
        workspaceId={props.workspaceId}
        initialDraft={
          profile
            ? {
                crdNumber: profile.crdNumber,
                ccoName: profile.ccoName,
                advFilingDate: profile.advFilingDate,
                aumUsd: profile.aumUsd,
                advDocumentUrl: profile.advDocumentUrl,
                riskFlags: profile.riskFlags,
              }
            : undefined
        }
        onComplete={() => void refresh()}
      />
    );
  }

  const handleToggleRequest = (slug: string): void => {
    const cat = categories.find((c) => c.slug === slug);
    if (!cat) return;
    setControlCategory(cat);
  };

  const patchCategory = async (
    slug: string,
    status: "ACTIVE" | "SUPPRESSING",
    suppressionEvidence?: string,
  ): Promise<void> => {
    setPendingToggle(true);
    const res = await fetch(
      `/api/workspaces/${props.workspaceId}/firm-profile/categories/${slug}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, suppressionEvidence }),
      },
    );
    setPendingToggle(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      if (res.status === 422) {
        setEvidenceSlug(slug);
        throw new Error(data.error ?? "Evidence required");
      }
      toast.error("Could not save — try again.");
      throw new Error(data.error ?? "Save failed");
    }
    const json = (await res.json()) as { data: DisclosureCategoryDto };
    setCategories((prev) => prev.map((c) => (c.slug === slug ? json.data : c)));
    await refresh();
    toast.success(
      status === "SUPPRESSING"
        ? "Suppression activated"
        : "Suppression deactivated",
    );
  };

  const handleApprove = async (): Promise<void> => {
    const res = await fetch(
      `/api/workspaces/${props.workspaceId}/firm-profile/approve`,
      {
        method: "POST",
      },
    );
    if (!res.ok) {
      throw new Error("Approval failed");
    }
    await refresh();
    toast.success("Profile approved");
  };

  const needsReapproval =
    profile.needsReapproval ||
    (props.invalidatedApprovalAt != null && !profile.approvedAt);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="border-b border-surface-border bg-surface-card p-4">
        <h1 className="text-xl font-semibold">Review controls</h1>
        <p className="text-sm text-text-secondary">
          Configure contextual review instructions. Legacy suppression is
          retained as history and does not clear new observations. Document
          availability alone does not establish adequate disclosure.
        </p>
      </div>
      <FirmMasthead
        workspaceName={props.workspaceName}
        profile={profile}
        canWrite={props.canWrite}
        needsReapproval={needsReapproval}
        invalidatedApprovalAt={props.invalidatedApprovalAt}
        onApprove={() => setApproveOpen(true)}
      />

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[220px_1fr_240px] lg:p-6">
        <aside className="space-y-4 overflow-y-auto">
          <FirmPostureRing categories={categories} />
          <div className="rounded-lg border border-dashed border-surface-border bg-surface-muted p-3 text-[11px] text-text-secondary">
            Conflict tracking coming soon — review conflicts in meeting flags
            for now.
          </div>
          {profile.advDocumentUrl ? (
            <a
              href={profile.advDocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card p-3 text-[12px] text-brand-dark hover:bg-surface-hover"
            >
              <FileText className="h-4 w-4" />
              ADV Part 2A
            </a>
          ) : null}
        </aside>

        <section className="overflow-y-auto">
          <DisclosureGrid
            categories={categories}
            crdNumber={profile.crdNumber}
            canWrite={props.canWrite}
            onToggleRequest={handleToggleRequest}
          />
        </section>

        <aside className="overflow-y-auto">
          <SuppressionLogPanel
            metrics={metrics}
            log={suppressionLog}
            hasPendingToggle={pendingToggle}
          />
        </aside>
      </div>

      <ContextualControlEditor
        category={controlCategory}
        workspaceId={props.workspaceId}
        onClose={() => setControlCategory(null)}
        onSaved={refresh}
      />
      <SuppressionEvidenceModal
        open={evidenceSlug != null}
        slug={evidenceSlug}
        onClose={() => setEvidenceSlug(null)}
        onConfirm={async (evidence) => {
          if (!evidenceSlug) return;
          await patchCategory(evidenceSlug, "SUPPRESSING", evidence);
          setEvidenceSlug(null);
        }}
      />

      <ApproveProfileModal
        open={approveOpen}
        categories={categories}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
      />
    </div>
  );
}
