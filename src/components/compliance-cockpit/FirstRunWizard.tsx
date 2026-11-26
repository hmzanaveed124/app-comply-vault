"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { DisclosureGrid } from "./DisclosureGrid";
import { FirmConfirmationCard } from "./FirmConfirmationCard";
import { SuppressionEvidenceModal } from "./SuppressionEvidenceModal";
import type { DisclosureCategoryDto } from "~/lib/firm-profile-types";
import { DISCLOSURE_CATEGORY_CATALOG } from "~/lib/disclosure-categories";
import {
  hasRequiredFirmIdentity,
  validateStep1Client,
  type Step1FieldErrors,
  type Step1SoftWarnings,
} from "~/lib/firm-profile-schemas";
import type { IapdFirmLookupResult } from "~/lib/iapd-types";
import { useCrdLookup, type IapdLookupStatus } from "~/hooks/useCrdLookup";

type FirstRunWizardProps = {
  workspaceId: string;
  initialDraft?: {
    crdNumber?: string | null;
    ccoName?: string | null;
    advFilingDate?: string | null;
    aumUsd?: string | null;
    advDocumentUrl?: string | null;
    riskFlags?: string[];
  };
  onComplete: () => void;
};

function buildDefaultCategories(): DisclosureCategoryDto[] {
  return DISCLOSURE_CATEGORY_CATALOG.map((def) => ({
    slug: def.slug,
    displayName: def.displayName,
    section: def.section,
    neverSuppress: def.neverSuppress,
    status: def.neverSuppress ? "NEVER_SUPPRESS" : "ACTIVE",
    suppressionEvidence: null,
    advItemRef: def.advItemRef,
    advPage: null,
    description: def.description,
  }));
}

function FieldError({ message }: { message: string }): React.JSX.Element {
  return (
    <p className="mt-1 text-sm text-semantic-danger" role="alert">
      {message}
    </p>
  );
}

export function FirstRunWizard({
  workspaceId,
  initialDraft,
  onComplete,
}: FirstRunWizardProps): React.JSX.Element {
  const [step, setStep] = useState<1 | 2>(
    initialDraft &&
      hasRequiredFirmIdentity({
        crdNumber: initialDraft.crdNumber ?? null,
        ccoName: initialDraft.ccoName ?? null,
      })
      ? 2
      : 1,
  );
  const [crdNumber, setCrdNumber] = useState(initialDraft?.crdNumber ?? "");
  const [ccoName, setCcoName] = useState(initialDraft?.ccoName ?? "");
  const [advFilingDate, setAdvFilingDate] = useState(
    initialDraft?.advFilingDate?.slice(0, 10) ?? "",
  );
  const [aumUsd, setAumUsd] = useState(initialDraft?.aumUsd ?? "");
  const [advDocumentUrl] = useState(initialDraft?.advDocumentUrl ?? "");
  const [riskFlags, setRiskFlags] = useState<string[]>(
    initialDraft?.riskFlags ?? [],
  );
  const [categories, setCategories] = useState<DisclosureCategoryDto[]>(
    buildDefaultCategories,
  );
  const [neverSuppressAck, setNeverSuppressAck] = useState(false);
  const [evidenceSlug, setEvidenceSlug] = useState<string | null>(null);
  const [pendingToggles, setPendingToggles] = useState<
    Array<{ slug: string; status: "SUPPRESSING"; suppressionEvidence: string }>
  >([]);
  const [fieldErrors, setFieldErrors] = useState<Step1FieldErrors>({});
  const [, setSoftWarnings] = useState<Step1SoftWarnings>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [iapdLookup, setIapdLookup] = useState<IapdLookupStatus>("idle");
  const [iapdFirm, setIapdFirm] = useState<IapdFirmLookupResult | null>(null);

  const { lookup, error: crdLookupError } = useCrdLookup({
    setAdvFilingDate,
    setAumUsd,
    setCcoName,
    setRiskFlags,
    setIapdFirm,
    setIapdLookup,
  });

  const isLookupLoading = iapdLookup === "loading";
  const isLookupFound = iapdLookup === "found" && iapdFirm != null;
  const isLookupResolved = iapdLookup === "not_found" || iapdLookup === "error";
  const ccoFromIapd = Boolean(iapdFirm?.ccoName);

  const saveStep1 = async (): Promise<void> => {
    const validation = validateStep1Client({
      crdNumber,
      ccoName,
      advFilingDate,
      aumUsd,
    });
    setFieldErrors(validation.errors);
    setSoftWarnings(validation.warnings);
    if (!validation.canContinue) {
      return;
    }

    setSaving(true);
    setError(null);
    const res = await fetch(`/api/workspaces/${workspaceId}/firm-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DRAFT",
        crdNumber: crdNumber.trim(),
        ccoName: ccoName.trim(),
        advFilingDate: advFilingDate
          ? new Date(advFilingDate).toISOString()
          : undefined,
        aumUsd: aumUsd || undefined,
        advDocumentUrl: advDocumentUrl || undefined,
        riskFlags,
        ...(iapdFirm ? { workspaceName: iapdFirm.firmName } : {}),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Could not save firm details.");
      return;
    }
    setStep(2);
  };

  const handleToggleRequest = (slug: string): void => {
    const cat = categories.find((c) => c.slug === slug);
    if (!cat || cat.neverSuppress) return;
    if (cat.status === "SUPPRESSING") {
      setCategories((prev) =>
        prev.map((c) =>
          c.slug === slug
            ? { ...c, status: "ACTIVE", suppressionEvidence: null }
            : c,
        ),
      );
      setPendingToggles((prev) => prev.filter((t) => t.slug !== slug));
      return;
    }
    setEvidenceSlug(slug);
  };

  const handleEvidenceConfirm = async (evidence: string): Promise<void> => {
    if (!evidenceSlug) return;
    setCategories((prev) =>
      prev.map((c) =>
        c.slug === evidenceSlug
          ? { ...c, status: "SUPPRESSING", suppressionEvidence: evidence }
          : c,
      ),
    );
    setPendingToggles((prev) => [
      ...prev.filter((t) => t.slug !== evidenceSlug),
      {
        slug: evidenceSlug,
        status: "SUPPRESSING",
        suppressionEvidence: evidence,
      },
    ]);
    setEvidenceSlug(null);
  };

  const completeWizard = async (): Promise<void> => {
    if (!neverSuppressAck) {
      setError("Please acknowledge never-suppress requirements.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/workspaces/${workspaceId}/firm-profile`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        neverSuppressAcknowledged: true,
        categoryToggles: pendingToggles,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Could not complete setup.");
      return;
    }
    onComplete();
  };

  if (step === 1) {
    const isValidCrd = /^\d{4,7}$/.test(crdNumber.trim());
    const showManualFallback = isLookupResolved;
    const canContinue =
      (isLookupFound && ccoName.trim().length > 0) ||
      (showManualFallback && isValidCrd && ccoName.trim().length > 0);

    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-surface-page">
        <div className="mx-auto w-full max-w-xl px-4 py-10 sm:py-14">
          <div className="mb-6 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-dark text-[10px] font-semibold text-white">
              1
            </span>
            Step 1 of 2 · Firm details
          </div>

          <h1 className="text-2xl font-semibold text-text-primary">
            Set up your firm
          </h1>
          <p className="mt-1.5 text-sm text-text-secondary">
            Enter your firm&apos;s CRD number — we&apos;ll pull everything else
            from the SEC IAPD so you don&apos;t have to retype public record.
          </p>

          <div className="mt-6 rounded-xl border border-surface-border bg-surface-card p-5 shadow-sm">
            <Label
              htmlFor="crd"
              className="text-sm font-medium text-text-primary"
            >
              CRD number <span className="text-semantic-danger">*</span>
            </Label>
            <div className="relative mt-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                aria-hidden
              />
              <Input
                id="crd"
                value={crdNumber}
                inputMode="numeric"
                autoComplete="off"
                placeholder="e.g. 140102"
                aria-invalid={!!fieldErrors.crdNumber || !!crdLookupError}
                aria-describedby="crd-help"
                className="h-12 pl-9 pr-12 font-mono text-base tracking-wider"
                onChange={(e) => {
                  setCrdNumber(e.target.value);
                  if (fieldErrors.crdNumber) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      crdNumber: undefined,
                    }));
                  }
                  setIapdLookup("idle");
                  setIapdFirm(null);
                }}
                onBlur={() => void lookup(crdNumber)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void lookup(crdNumber);
                  }
                }}
              />
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                {isLookupLoading ? (
                  <Loader2
                    className="h-4 w-4 animate-spin text-brand-dark"
                    aria-hidden
                  />
                ) : isLookupFound ? (
                  <CheckCircle2
                    className="h-4 w-4 text-semantic-success"
                    aria-label="Firm found"
                  />
                ) : null}
              </div>
            </div>
            <p id="crd-help" className="mt-2 text-[12px] text-text-muted">
              Your firm&apos;s Central Registration Depository number (4–7
              digits).{" "}
              <a
                href="https://adviserinfo.sec.gov/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-dark hover:underline"
              >
                Look up on IAPD ↗
              </a>
            </p>
            {fieldErrors.crdNumber ? (
              <FieldError message={fieldErrors.crdNumber} />
            ) : null}
            {crdLookupError && !isLookupFound ? (
              <FieldError message={crdLookupError} />
            ) : null}

            {!isLookupLoading && !isLookupFound && !showManualFallback ? (
              <p className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-text-secondary">
                <Sparkles className="h-3.5 w-3.5 text-brand-mid" aria-hidden />
                We&apos;ll auto-populate CCO, AUM, ADV filing date and risk
                flags from SEC IAPD.
              </p>
            ) : null}
          </div>

          {isLookupLoading ? (
            <div
              className="mt-4 animate-pulse overflow-hidden rounded-xl border border-surface-border bg-surface-card"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="border-b border-surface-divider bg-gradient-to-br from-brand-light/40 to-surface-card px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-lg bg-surface-border" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-surface-border" />
                    <div className="h-3 w-1/2 rounded bg-surface-border" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 px-5 py-5">
                <div className="h-12 rounded bg-surface-border" />
                <div className="h-12 rounded bg-surface-border" />
                <div className="h-12 rounded bg-surface-border" />
                <div className="h-12 rounded bg-surface-border" />
              </div>
              <p className="border-t border-surface-divider px-5 py-2.5 text-[11px] text-text-muted">
                Looking up firm in SEC IAPD…
              </p>
            </div>
          ) : null}

          {isLookupFound && iapdFirm ? (
            <div className="mt-4">
              <FirmConfirmationCard
                firm={iapdFirm}
                ccoName={ccoName}
                ccoSource={ccoFromIapd ? "iapd" : "manual"}
                ccoError={fieldErrors.ccoName}
                onCcoNameChange={(value) => {
                  setCcoName(value);
                  if (fieldErrors.ccoName) {
                    setFieldErrors((prev) => ({ ...prev, ccoName: undefined }));
                  }
                }}
              />
            </div>
          ) : null}

          {showManualFallback ? (
            <div
              className="mt-4 rounded-xl border border-warning-border bg-warning-bg/60 p-5"
              role="status"
            >
              <div className="flex items-start gap-3">
                <AlertCircle
                  className="mt-0.5 h-5 w-5 shrink-0 text-warning-text"
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-medium text-warning-text">
                    {iapdLookup === "not_found"
                      ? "No matching firm found in SEC IAPD"
                      : "Couldn't reach SEC IAPD"}
                  </h3>
                  <p className="mt-0.5 text-[12px] text-warning-text">
                    You can still continue by entering the basics manually.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label
                    htmlFor="cco-manual"
                    className="text-[12px] text-warning-text"
                  >
                    CCO name <span className="text-semantic-danger">*</span>
                  </Label>
                  <Input
                    id="cco-manual"
                    value={ccoName}
                    onChange={(e) => {
                      setCcoName(e.target.value);
                      if (fieldErrors.ccoName) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          ccoName: undefined,
                        }));
                      }
                    }}
                    aria-invalid={!!fieldErrors.ccoName}
                    className="mt-1 bg-surface-card"
                  />
                  {fieldErrors.ccoName ? (
                    <FieldError message={fieldErrors.ccoName} />
                  ) : null}
                </div>
                <div>
                  <Label
                    htmlFor="adv-manual"
                    className="text-[12px] text-warning-text"
                  >
                    ADV filing date
                  </Label>
                  <Input
                    id="adv-manual"
                    type="date"
                    value={advFilingDate}
                    onChange={(e) => setAdvFilingDate(e.target.value)}
                    className="mt-1 bg-surface-card"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="aum-manual"
                    className="text-[12px] text-warning-text"
                  >
                    AUM (USD)
                  </Label>
                  <Input
                    id="aum-manual"
                    value={aumUsd}
                    onChange={(e) => setAumUsd(e.target.value)}
                    placeholder="e.g. 42909330"
                    className="mt-1 bg-surface-card"
                  />
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="mt-4 text-sm text-semantic-danger" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-end gap-3">
            {!isLookupFound && !showManualFallback ? (
              <p className="mr-auto text-[12px] text-text-muted">
                Don&apos;t have a CRD on hand? Look it up on{" "}
                <a
                  href="https://adviserinfo.sec.gov/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-dark hover:underline"
                >
                  IAPD
                </a>
                .
              </p>
            ) : null}
            <Button
              type="button"
              disabled={saving || !canContinue}
              onClick={() => void saveStep1()}
              className="h-11 gap-2 bg-brand-dark px-6 text-white hover:bg-brand-dark/90 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : isLookupFound ? (
                <ShieldCheck className="h-4 w-4" aria-hidden />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden />
              )}
              {isLookupFound
                ? "Yes, set up this firm"
                : showManualFallback
                  ? "Continue with manual entry"
                  : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-1 text-lg font-semibold text-text-primary">
        Review disclosure categories
      </h1>
      <p className="mb-4 text-sm text-text-secondary">
        Step 2 — Review the baseline categories. Configure contextual
        instructions after setup, then approve the firm profile.
      </p>
      <DisclosureGrid
        categories={categories}
        crdNumber={crdNumber.trim() || null}
        canWrite={false}
        onToggleRequest={handleToggleRequest}
      />
      <label className="mt-6 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={neverSuppressAck}
          onChange={(e) => setNeverSuppressAck(e.target.checked)}
          className="mt-1"
        />
        <span>
          I understand Conflicts of Interest, Insurance Comp., and Disciplinary
          History must be assessed when relevant under your firm policy; verbal
          repetition in every meeting is not assumed.
        </span>
      </label>
      {error ? (
        <p className="mt-2 text-sm text-semantic-danger">{error}</p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button type="button" variant="outline" onClick={() => setStep(1)}>
          Back
        </Button>
        <Button
          type="button"
          disabled={saving}
          onClick={() => void completeWizard()}
        >
          Complete setup
        </Button>
      </div>
      <SuppressionEvidenceModal
        open={evidenceSlug != null}
        slug={evidenceSlug}
        onClose={() => setEvidenceSlug(null)}
        onConfirm={handleEvidenceConfirm}
      />
    </div>
  );
}
