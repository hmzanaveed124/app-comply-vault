"use client";
import type { DisclosureCategoryDto } from "~/lib/firm-profile-types";
export function FirmPostureRing({
  categories,
}: {
  categories: DisclosureCategoryDto[];
}): React.JSX.Element {
  const configured = categories.filter((c) => c.controlConfig).length;
  return (
    <div className="rounded-lg border border-surface-border bg-surface-card p-4">
      <h2 className="font-medium">Control configuration</h2>
      <p className="mt-2 text-2xl">
        {configured} / {categories.length}
      </p>
      <p className="mt-2 text-xs text-text-secondary">
        Categories with contextual instructions. Profile approval activates
        changes; this count does not measure compliance or disclosure coverage.
      </p>
    </div>
  );
}
