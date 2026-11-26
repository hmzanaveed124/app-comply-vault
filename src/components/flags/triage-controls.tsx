"use client";

import { useEffect, useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { Check, FileText, ArrowUp, Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";

export type TriageTab = "resolve" | "note" | "escalate";

const TAB_ORDER: TriageTab[] = ["resolve", "note", "escalate"];

const PLACEHOLDERS: Record<TriageTab, string> = {
  resolve:
    "Explain why this concern is not substantiated. For future actions, use Start remediation.",
  note: "Add context or document an exception...",
  escalate: "Why does the CCO need to weigh in? (required)...",
};

const BUTTON_LABELS: Record<TriageTab, string> = {
  resolve: "Record no finding",
  note: "Add note",
  escalate: "Escalate to CCO",
};

const TAB_LABELS: Record<TriageTab, string> = {
  resolve: "Resolve",
  note: "Note",
  escalate: "Escalate to CCO",
};

export function TriageControls({
  flagId,
  onSubmit,
  disabled,
  isSubmitting,
}: {
  flagId: string;
  onSubmit: (
    tab: TriageTab,
    text: string,
    closure?: {
      closureBasis: string;
      evidenceReference: string;
      noFurtherActionRequired: true;
    },
  ) => Promise<void>;
  disabled?: boolean;
  isSubmitting?: boolean;
}): React.ReactElement {
  const groupId = useId();
  const [tab, setTab] = useState<TriageTab>("resolve");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);

  const [closureBasis, setClosureBasis] = useState("FALSE_POSITIVE");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [attested, setAttested] = useState(false);
  const minLen = tab === "resolve" ? 30 : 10;

  useEffect(() => {
    if (!isSubmitting) {
      setShowSpinner(false);
      return;
    }
    const t = window.setTimeout(() => setShowSpinner(true), 150);
    return () => window.clearTimeout(t);
  }, [isSubmitting]);

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    if (value.trim().length < minLen) {
      setError(`Please enter at least ${minLen} characters.`);
      return;
    }
    if (
      tab === "resolve" &&
      (!attested || evidenceReference.trim().length < 10)
    ) {
      setError(
        "Reference the evidence and confirm no further action is required.",
      );
      return;
    }
    await onSubmit(
      tab,
      value.trim(),
      tab === "resolve"
        ? {
            closureBasis,
            evidenceReference: evidenceReference.trim(),
            noFurtherActionRequired: true,
          }
        : undefined,
    );
    setValue("");
  };

  const tabs: { id: TriageTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "resolve",
      label: "No finding",
      icon: <Check className="h-3.5 w-3.5" aria-hidden />,
    },
    {
      id: "note",
      label: "Note",
      icon: <FileText className="h-3.5 w-3.5" aria-hidden />,
    },
    {
      id: "escalate",
      label: "Escalate",
      icon: <ArrowUp className="h-3.5 w-3.5" aria-hidden />,
    },
  ];

  const onTabsKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TAB_ORDER.indexOf(tab);
    const next =
      e.key === "ArrowRight"
        ? Math.min(i + 1, TAB_ORDER.length - 1)
        : Math.max(i - 1, 0);
    setTab(TAB_ORDER[next] ?? "resolve");
    setError(null);
  };

  return (
    <div className="space-y-3 border-t border-border/60 pt-3">
      <div
        role="radiogroup"
        aria-labelledby={`${groupId}-legend`}
        className="flex flex-wrap gap-1 rounded-lg bg-muted/40 p-1"
        onKeyDown={onTabsKeyDown}
      >
        <span id={`${groupId}-legend`} className="sr-only">
          Triage action for flag {flagId}
        </span>
        {tabs.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${TAB_LABELS[t.id]} triage action`}
              disabled={disabled || isSubmitting}
              onClick={() => {
                setTab(t.id);
                setError(null);
              }}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-[13px] font-normal transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-initial sm:px-3",
                selected &&
                  t.id === "escalate" &&
                  "border border-warning-border bg-warning-bg font-medium text-semantic-warning",
                selected &&
                  t.id !== "escalate" &&
                  "border border-info-border bg-info-bg font-medium text-semantic-info",
                !selected &&
                  "border border-transparent text-muted-foreground hover:bg-background/80",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>
      {tab === "resolve" ? (
        <div className="space-y-2 text-sm">
          <label className="block">
            Decision basis
            <select
              aria-label="Decision basis"
              className="ml-2 rounded border bg-background p-1"
              value={closureBasis}
              onChange={(e) => setClosureBasis(e.target.value)}
            >
              <option value="FALSE_POSITIVE">False positive</option>
              <option value="NOT_APPLICABLE">Not applicable</option>
              <option value="EVIDENCE_SUFFICIENT">
                Existing evidence is sufficient
              </option>
            </select>
          </label>
          <input
            aria-label="Supporting evidence reference"
            className="w-full rounded border bg-background p-2"
            placeholder="Document/version, communication ID or transcript timestamp and context"
            value={evidenceReference}
            onChange={(e) => setEvidenceReference(e.target.value)}
          />
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={attested}
              onChange={(e) => setAttested(e.target.checked)}
            />
            I reviewed the evidence and determined that no further action is
            required for this concern.
          </label>
        </div>
      ) : null}
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={PLACEHOLDERS[tab]}
        rows={2}
        className="min-h-[36px] resize-y text-[13px]"
        disabled={disabled || isSubmitting}
        aria-invalid={!!error}
        aria-describedby={error ? `${groupId}-error` : undefined}
      />
      {error ? (
        <p
          id={`${groupId}-error`}
          className="text-[13px] text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <Button
        type="button"
        size="sm"
        disabled={
          disabled ||
          isSubmitting ||
          value.trim().length < minLen ||
          (tab === "resolve" &&
            (!attested || evidenceReference.trim().length < 10))
        }
        onClick={() => void handleSubmit()}
        className={cn(
          "rounded-full text-[13px] font-medium",
          tab === "resolve" &&
            "bg-brand-light text-brand hover:bg-brand-light/90",
          tab === "note" && "bg-info-bg text-semantic-info hover:bg-info-bg/90",
          tab === "escalate" &&
            "bg-warning-bg text-semantic-warning hover:bg-warning-bg/90",
        )}
      >
        {showSpinner && isSubmitting ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden />
            Saving…
          </>
        ) : isSubmitting ? (
          BUTTON_LABELS[tab]
        ) : (
          BUTTON_LABELS[tab]
        )}
      </Button>
    </div>
  );
}
