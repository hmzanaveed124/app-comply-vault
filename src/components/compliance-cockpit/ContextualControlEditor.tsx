"use client";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  contextualControlSchema,
  type ContextualControl,
} from "~/lib/contextual-control";
import type { DisclosureCategoryDto } from "~/lib/firm-profile-types";

export function ContextualControlEditor({
  category,
  workspaceId,
  onClose,
  onSaved,
}: {
  category: DisclosureCategoryDto | null;
  workspaceId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}): React.JSX.Element {
  const [value, setValue] = useState<ContextualControl>({
    applicability: "",
    triggerKeywords: [],
    evidenceRequirements: "",
    policyBasis: "",
    exceptions: "",
    effectiveDate: new Date().toISOString().slice(0, 10),
  });
  const [keywords, setKeywords] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const config = category?.controlConfig;
    setValue(
      config ?? {
        applicability: "",
        triggerKeywords: [],
        evidenceRequirements: "",
        policyBasis: "",
        exceptions: "",
        effectiveDate: new Date().toISOString().slice(0, 10),
      },
    );
    setKeywords(config?.triggerKeywords.join(", ") ?? "");
    setError(null);
  }, [category]);
  async function save() {
    const parsed = contextualControlSchema.safeParse({
      ...value,
      triggerKeywords: keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Complete all fields");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceId}/firm-profile/categories/${category!.slug}/control`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save control");
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save control");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Dialog
      open={!!category}
      onOpenChange={(open) => !open && !saving && onClose()}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{category?.displayName}: review control</DialogTitle>
          <DialogDescription>
            Save the firm's instructions, then approve the profile to activate
            this version. Trigger keywords identify recommendations for
            contextual review; exceptions and external evidence require human
            assessment.
          </DialogDescription>
        </DialogHeader>
        {(
          [
            [
              "applicability",
              "Applicability: advisers, activities and recommendations",
            ],
            ["evidenceRequirements", "Required evidence and sources"],
            ["policyBasis", "Firm policy / regulatory basis"],
            ["exceptions", "Exceptions and how reviewers should assess them"],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={`control-${key}`}>{label}</Label>
            <Textarea
              id={`control-${key}`}
              value={value[key]}
              onChange={(e) =>
                setValue((v) => ({ ...v, [key]: e.target.value }))
              }
            />
          </div>
        ))}
        <Label htmlFor="control-keywords">
          Recommendation trigger keywords (comma separated)
        </Label>
        <Input
          id="control-keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="annuity, rollover, commission"
        />
        <Label htmlFor="control-date">Effective date</Label>
        <Input
          id="control-date"
          type="date"
          value={value.effectiveDate}
          onChange={(e) =>
            setValue((v) => ({ ...v, effectiveDate: e.target.value }))
          }
        />
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button disabled={saving} onClick={() => void save()}>
          {saving ? "Saving…" : "Save for CCO approval"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
