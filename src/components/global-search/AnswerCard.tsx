"use client";

import { Fragment, useEffect, useState } from "react";
import { ArrowUpRight, Mail, Sparkles, Video } from "lucide-react";
import { TextShimmer } from "~/components/ui/text-shimmer";

import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";

export type AnswerCitation = {
  sourceType?: "MEETING" | "EMAIL";
  meetingId: string;
  threadId?: string;
  messageId?: string;
  contentSha256?: string;
  clientName: string;
  meetingDate: string;
  meetingType: string;
  snippet: string;
  transcriptStartSec?: number;
};

export type AnswerCardProps = {
  question: string;
  state:
    | { kind: "loading" }
    | {
        kind: "answer";
        answer: string;
        citations: AnswerCitation[];
        retrieval: {
          candidatesScanned: number;
          candidatesUsed: number;
          mode: string;
          populationStatement?: string;
        };
        model: string;
        latencyMs: number;
        elements?: Array<{ text: string; provenance: string }>;
      }
    | {
        kind: "honest-miss";
        answer: string;
        missReason?: string;
        missing?: string;
        populationStatement?: string;
      }
    | { kind: "no-evidence"; answer: string }
    | { kind: "rate-limited"; retryAfterSec: number }
    | { kind: "error"; message: string };
  onOpenMeeting: (meetingId: string) => void;
  onOpenCitation?: (citation: AnswerCitation) => void;
  className?: string;
};

const LOADING_PHRASES = [
  "Searching meetings…",
  "Reading transcripts…",
  "Checking correspondence…",
  "Synthesising answer…",
] as const;

function formatMeetingDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function shortHash(hash: string | undefined): string | null {
  if (!hash) return null;
  return `${hash.slice(0, 8)}…`;
}

export function AnswerCard({
  question,
  state,
  onOpenMeeting,
  onOpenCitation,
  className,
}: AnswerCardProps): React.JSX.Element {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    if (state.kind !== "loading") return;
    const interval = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [state.kind]);

  function openCitation(cite: AnswerCitation): void {
    if (onOpenCitation) {
      onOpenCitation(cite);
      return;
    }
    onOpenMeeting(cite.meetingId);
  }

  return (
    <div
      className={cn(
        "mx-2 my-2 rounded-lg border border-border bg-card text-card-foreground shadow-sm",
        className
      )}
      data-slot="ask-answer-card"
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" />
          Question
        </div>
        <p className="mt-1 text-sm font-medium text-foreground">{question}</p>
      </div>

      <div className="px-4 py-4 text-sm leading-relaxed text-foreground">
        {state.kind === "loading" && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <TextShimmer>{LOADING_PHRASES[phraseIdx]}</TextShimmer>
          </div>
        )}

        {state.kind === "answer" && (
          <div className="space-y-2">
            <p className="whitespace-pre-wrap">{state.answer}</p>
            {state.elements?.[0]?.provenance && (
              <p className="text-xs text-muted-foreground">
                Provenance: {state.elements[0].provenance.replace(/_/g, " ")}
              </p>
            )}
            {state.retrieval.populationStatement && (
              <p className="text-xs text-muted-foreground">
                {state.retrieval.populationStatement}
              </p>
            )}
          </div>
        )}

        {state.kind === "honest-miss" && (
          <div className="space-y-2">
            <Badge variant="outline" className="border-warning-border bg-warning-bg font-normal text-warning-text">
              Will not answer
              {state.missReason ? ` · ${state.missReason.replace(/_/g, " ")}` : ""}
            </Badge>
            <p className="text-muted-foreground">{state.answer}</p>
            <p className="text-xs text-muted-foreground">
              ComplyVault does not infer from nearby indexed material when the
              underlying record is not in coverage.
            </p>
            {state.missing && (
              <p className="text-xs text-muted-foreground">
                Not indexed: {state.missing}
              </p>
            )}
          </div>
        )}

        {state.kind === "no-evidence" && (
          <p className="text-muted-foreground">{state.answer}</p>
        )}

        {state.kind === "rate-limited" && (
          <p className="text-muted-foreground">
            You&apos;ve asked a lot of questions in the last minute — try again
            in {state.retryAfterSec}s.
          </p>
        )}

        {state.kind === "error" && (
          <p className="text-muted-foreground">
            Couldn&apos;t generate an answer right now. The keyword results
            below may help.
          </p>
        )}
      </div>

      {state.kind === "answer" && state.citations.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Evidence
          </div>
          <ul className="mt-2 space-y-2">
            {state.citations.map((cite) => {
              const isEmail = cite.sourceType === "EMAIL";
              const key = isEmail
                ? `email:${cite.threadId ?? cite.meetingId}:${cite.messageId ?? ""}`
                : cite.meetingId;
              return (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => openCitation(cite)}
                    className="group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {isEmail ? (
                          <Badge variant="outline" className="gap-1 font-normal">
                            <Mail className="h-3 w-3" aria-hidden />
                            EMAIL
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 font-normal">
                            <Video className="h-3 w-3" aria-hidden />
                            MEETING
                          </Badge>
                        )}
                        <span className="font-medium text-foreground">
                          {cite.clientName}
                        </span>
                        <span>·</span>
                        <span>{cite.meetingType}</span>
                        <span>·</span>
                        <span>{formatMeetingDate(cite.meetingDate)}</span>
                        {shortHash(cite.contentSha256) ? (
                          <>
                            <span>·</span>
                            <span className="font-mono" title={cite.contentSha256}>
                              {shortHash(cite.contentSha256)}
                            </span>
                          </>
                        ) : null}
                      </div>
                      {cite.snippet && (
                        <div className="mt-1 text-xs italic text-muted-foreground line-clamp-2">
                          &ldquo;{cite.snippet}&rdquo;
                        </div>
                      )}
                    </div>
                    <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {state.kind === "answer" && (
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Fragment>
              <span>
                Answered from {state.retrieval.candidatesUsed} source
                {state.retrieval.candidatesUsed === 1 ? "" : "s"} in your
                workspace
              </span>
              <span>·</span>
              <span>{formatLatency(state.latencyMs)}</span>
            </Fragment>
          </div>
        </div>
      )}
    </div>
  );
}
