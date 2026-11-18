"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Progress, Tour, type TourProps } from "antd";
import { ArrowRight, Check, Compass, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { ROLE_CONFIG } from "~/lib/role-config";
import type { WorkspaceJourney } from "~/lib/onboarding/journey";
import styles from "./workspace-journey.module.css";

export function WorkspaceJourneyPanel({
  journey,
  mode = "home",
  preview = false,
}: {
  journey: WorkspaceJourney;
  mode?: "home" | "setup";
  preview?: boolean;
}) {
  const router = useRouter();
  const [showGuide, setShowGuide] = useState(
    mode === "setup" || (!journey.dismissed && journey.finishedCount === 0),
  );
  const [tourOpen, setTourOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const heroRef = useRef<HTMLElement>(null);
  const checklistRef = useRef<HTMLElement>(null);
  const optionalRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (
      preview ||
      journey.next.kind !== "processing" ||
      journey.processingRecord?.failed
    )
      return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [journey.next.kind, journey.processingRecord?.failed, router, preview]);

  const steps: TourProps["steps"] = [
    {
      title: "Start with the next useful action",
      description:
        "This card uses your workspace's actual records and your role to suggest what to do next. Suggestions never approve or finalize a record for you.",
      target: () => heroRef.current!,
    },
    {
      title: "Follow one record through the workflow",
      description:
        "Add a recording, check the transcript and summary, then complete the review stages. Your setup progress updates from completed work; there are no boxes to tick just for clicking around.",
      target: () => checklistRef.current!,
    },
    {
      title: "Add integrations when they help",
      description:
        "A recording is enough to start. Once the workflow is useful, connect a service or bring in your team. You can return to Getting started at any time.",
      target: () => optionalRef.current!,
    },
  ];

  async function hideGuide() {
    if (preview) {
      setShowGuide(false);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const response = await fetch(
        `/api/workspaces/${encodeURIComponent(journey.workspaceId)}/onboarding/dismiss`,
        { method: "PATCH" },
      );
      if (!response.ok)
        throw new Error("We couldn't save your preference. Please try again.");
      setShowGuide(false);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const newWorkspace = journey.meetingCount === 0 && !journey.hasCorrespondence;
  const setup = mode === "setup";
  return (
    <div className={styles.container}>
      <section
        ref={heroRef}
        className={styles.hero}
        aria-labelledby="journey-title"
      >
        <div className={styles.eyebrow}>
          {setup ? "GETTING STARTED" : "YOUR NEXT STEP"} ·{" "}
          {journey.workspaceName}
        </div>
        <h1 id="journey-title" className={styles.heroTitle}>
          {setup && newWorkspace
            ? "Your first useful record, step by step."
            : journey.next.title}
        </h1>
        <p className={styles.copy}>
          {setup && newWorkspace
            ? "Start with one meeting, see the transcript and summary, and learn how your team takes a record through review. You can explore the walkthrough before adding anything."
            : journey.next.description}
        </p>
        <div className={styles.actions}>
          {journey.next.href ? (
            <Button asChild>
              <Link href={journey.next.href}>
                {journey.next.action}
                <ArrowRight size={16} aria-hidden />
              </Link>
            </Button>
          ) : (
            <span className={styles.copy}>{journey.next.action}</span>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setShowGuide(true);
              setTourOpen(true);
            }}
          >
            <Compass size={16} aria-hidden />
            {setup ? "Start walkthrough" : "Walk me through it"}
          </Button>
          {!setup && (
            <Button
              variant="ghost"
              onClick={() => setShowGuide((value) => !value)}
            >
              {showGuide ? "Collapse setup guide" : "Show setup guide"}
            </Button>
          )}
          {journey.next.kind === "processing" && (
            <Button variant="ghost" onClick={() => router.refresh()}>
              <RefreshCw size={14} aria-hidden />
              Refresh status
            </Button>
          )}
          {setup && (
            <Button asChild variant="ghost">
              <Link href="/dashboard">Go to Home</Link>
            </Button>
          )}
        </div>
        {setup && newWorkspace && (
          <p className={`${styles.copy} mt-4`}>
            Next: {journey.next.title}. {journey.next.description}
          </p>
        )}
      </section>
      {showGuide && (
        <div className={styles.grid}>
          <section
            ref={checklistRef}
            className={styles.panel}
            aria-labelledby="setup-progress-title"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 id="setup-progress-title" className={styles.panelTitle}>
                Your path to a reviewed record
              </h2>
              <span className={styles.stepText}>
                {journey.completed} / {journey.steps.length}
              </span>
            </div>
            <p className={styles.stepText}>
              You are signed in as {ROLE_CONFIG[journey.role].label}. Progress
              reflects the workspace's records and your review actions.
            </p>
            <Progress
              percent={Math.round(
                (journey.completed / journey.steps.length) * 100,
              )}
              showInfo={false}
              aria-label="Getting started progress"
            />
            <ol className={styles.list}>
              {journey.steps.map((step, index) => (
                <li key={step.id} className={styles.step}>
                  <span className={styles.stepNumber} aria-hidden>
                    {step.complete ? <Check size={15} /> : index + 1}
                  </span>
                  <div>
                    <h3 className={styles.stepTitle}>
                      {step.title}
                      {step.complete && (
                        <span className="sr-only"> — complete</span>
                      )}
                    </h3>
                    <p className={styles.stepText}>{step.description}</p>
                  </div>
                  <div className={styles.stepAction}>
                    {step.complete ? (
                      <span className={styles.stepText}>Done</span>
                    ) : step.href ? (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={step.href}>{step.action}</Link>
                      </Button>
                    ) : (
                      <span className={styles.stepText}>
                        {step.blocked && step.id === "policy"
                          ? "CCO action needed"
                          : "Complete the earlier step"}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <aside
            ref={optionalRef}
            className={styles.panel}
            aria-labelledby="workflow-title"
          >
            <h2 id="workflow-title" className={styles.panelTitle}>
              How the work flows
            </h2>
            <div className={styles.optional}>
              <div>
                <h3 className={styles.stepTitle}>Prepare</h3>
                <p className={styles.stepText}>
                  Open a client to see earlier conversations and prepare with
                  the context already available.
                </p>
                <Link href="/clients/overview">Open client context →</Link>
              </div>
              <div>
                <h3 className={styles.stepTitle}>Meet</h3>
                <p className={styles.stepText}>
                  Add a recording and let ComplyVault prepare the transcript and
                  summary.
                </p>
                <Link href="/interaction-log">See your meeting records →</Link>
              </div>
              <div>
                <h3 className={styles.stepTitle}>Follow through</h3>
                <p className={styles.stepText}>
                  Check the source, complete your review, and keep the record of
                  what was decided.
                </p>
                <Link href="/interaction-log">Track review progress →</Link>
              </div>
            </div>
            {journey.role === "OWNER_CCO" && (
              <div className="mt-6 border-t border-surface-border pt-5">
                <h3 className={styles.stepTitle}>Make it easier next time</h3>
                <p className={styles.stepText}>
                  These can wait until you've tried your first record.
                </p>
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-brand">
                  <Link href="/integrations">
                    {journey.connected
                      ? "Manage connections"
                      : "Connect a service"}
                  </Link>
                  <Link
                    href={`/workspaces/${encodeURIComponent(journey.workspaceId)}/invite`}
                  >
                    Invite your team
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
      <div className={styles.footer}>
        <Link href="/onboarding">Getting started is always available</Link>
        {setup && <Link href="/welcome">Plan and usage</Link>}
        {showGuide && !setup && (
          <Button
            variant="link"
            size="sm"
            onClick={() => void hideGuide()}
            disabled={saving}
          >
            {saving ? "Saving…" : "Hide setup guide"}
          </Button>
        )}
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <Tour
        open={tourOpen}
        onClose={() => setTourOpen(false)}
        onFinish={() => setTourOpen(false)}
        steps={steps}
      />
    </div>
  );
}
