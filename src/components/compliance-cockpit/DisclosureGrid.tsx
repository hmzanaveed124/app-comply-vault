"use client";

import { Lock } from "lucide-react";
import {
  NEVER_SUPPRESS_SLUGS,
  getCategoriesBySection,
} from "~/lib/disclosure-categories";
import type { DisclosureCategoryDto } from "~/lib/firm-profile-types";
import { DisclosureCard } from "./DisclosureCard";

type DisclosureGridProps = {
  categories: DisclosureCategoryDto[];
  crdNumber?: string | null;
  canWrite: boolean;
  onToggleRequest: (slug: string) => void;
};

const SECTION_LABELS: Record<string, string> = {
  core: "Core Disclosures",
  regulatory: "Regulatory Requirements",
  operational: "Operational & Conduct",
};

export function DisclosureGrid({
  categories,
  crdNumber,
  canWrite,
  onToggleRequest,
}: DisclosureGridProps): React.JSX.Element {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));

  const neverSuppressNames = NEVER_SUPPRESS_SLUGS.map(
    (slug) => bySlug.get(slug)?.displayName ?? slug,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-md bg-semantic-danger px-3 py-2 text-white">
        <Lock className="h-4 w-4 shrink-0" aria-hidden />
        <span className="text-[12px] font-medium">
          Contextual review — assess applicability and supporting evidence
        </span>
        {neverSuppressNames.map((name) => (
          <span
            key={name}
            className="rounded-full bg-surface-card/20 px-2 py-0.5 text-[10px] font-medium"
          >
            {name}
          </span>
        ))}
      </div>

      {(["core", "regulatory", "operational"] as const).map((section) => {
        const defs = getCategoriesBySection(section);
        return (
          <div key={section}>
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              {SECTION_LABELS[section]}
            </h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {defs.map((def) => {
                const cat =
                  bySlug.get(def.slug) ??
                  ({
                    slug: def.slug,
                    displayName: def.displayName,
                    section: def.section,
                    neverSuppress: def.neverSuppress,
                    status: def.neverSuppress ? "NEVER_SUPPRESS" : "ACTIVE",
                    suppressionEvidence: null,
                    advItemRef: def.advItemRef,
                    advPage: null,
                    description: def.description,
                  } satisfies DisclosureCategoryDto);
                return (
                  <DisclosureCard
                    key={def.slug}
                    category={cat}
                    crdNumber={crdNumber}
                    canWrite={canWrite}
                    onToggleRequest={onToggleRequest}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
