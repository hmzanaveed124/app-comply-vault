"use client";

import { useState } from "react";
import type { ExtractionData } from "~/server/extraction/types";
import { getTopicTitle, getTopicDescription } from "~/lib/topics";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";

interface ExtractedFieldsProps {
  extraction: ExtractionData | null | undefined;
  flags: Array<{
    id: string;
    type: string;
    severity: string;
    status: string;
    evidence: any;
  }>;
}

export default function ExtractedFields({ extraction, flags }: ExtractedFieldsProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Scroll to transcript segment when evidence link is clicked
  const scrollToTimestamp = (startTime: number) => {
    // Find the segment with matching timestamp
    const segmentElement = document.querySelector(
      `[data-timestamp="${Math.floor(startTime)}"]`
    );
    if (segmentElement) {
      segmentElement.scrollIntoView({ behavior: "smooth", block: "center" });
      // Highlight the segment temporarily
      segmentElement.classList.add("bg-warning-bg");
      setTimeout(() => {
        segmentElement.classList.remove("bg-warning-bg");
      }, 2000);
    }
  };

  const findFlagsForItem = (field: string, startTime?: number) => {
    if (startTime === undefined) return [];
    return flags.filter((flag) => {
      const evidenceStart = flag.evidence?.recommendation?.startTime ?? flag.evidence?.startTime;
      return flag.evidence?.recommendation && field === "recommendations"
        ? Math.floor(evidenceStart) === Math.floor(startTime)
        : false;
    });
  };

  const scrollToFlag = (flagId: string) => {
    const flagElement = document.getElementById(`flag-${flagId}`);
    if (flagElement) {
      flagElement.scrollIntoView({ behavior: "smooth", block: "center" });
      flagElement.classList.add("ring-2", "ring-red-300");
      setTimeout(() => {
        flagElement.classList.remove("ring-2", "ring-red-300");
      }, 2000);
    }
  };

  if (!extraction) {
    return (
      <Alert>
        <AlertDescription>
          Extraction is in progress or not available yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto">
      {/* Topics */}
      {extraction.topics && extraction.topics.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Topics</h3>
          <ul className="space-y-3">
            {extraction.topics.map((topic, idx) => {
              const title = getTopicTitle(topic);
              const description = getTopicDescription(topic);
              const showDesc = description && title !== description;
              return (
                <li key={idx} className="text-sm">
                  <span className="font-medium text-text-primary">{title}</span>
                  {showDesc && (
                    <p className="text-text-secondary mt-0.5 ml-0">{description}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {extraction.recommendations && extraction.recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            Recommendations ({extraction.recommendations.length})
          </h3>
          <ul className="space-y-3">
            {extraction.recommendations.map((rec, idx) => {
              const matchedFlags = findFlagsForItem("recommendations", rec.startTime);
              return (
              <li
                key={idx}
                className="border-l-2 border-success-border pl-3"
                data-claim-field="recommendations"
                data-claim-start={Math.floor(rec.startTime ?? 0)}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-text-primary flex-1">{rec.text}</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => scrollToTimestamp(rec.startTime)}
                    className="ml-2 h-auto p-0 text-xs"
                  >
                    {formatTime(rec.startTime)}
                  </Button>
                </div>
                {matchedFlags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {matchedFlags.map((flag) => (
                      <Badge
                        key={flag.id}
                        variant="destructive"
                        className="cursor-pointer"
                        onClick={() => scrollToFlag(flag.id)}
                      >
                        Flag: {flag.type.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                )}
                {rec.confidence !== undefined && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      Confidence: {(rec.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </li>
            );
            })}
          </ul>
        </div>
      )}

      {/* Disclosures */}
      {extraction.disclosures && extraction.disclosures.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            Disclosures ({extraction.disclosures.length})
          </h3>
          <ul className="space-y-3">
            {extraction.disclosures.map((dis, idx) => (
              <li key={idx} className="border-l-2 border-warning-border pl-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-text-primary flex-1">{dis.text}</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => scrollToTimestamp(dis.startTime)}
                    className="ml-2 h-auto p-0 text-xs"
                  >
                    {formatTime(dis.startTime)}
                  </Button>
                </div>
                {dis.confidence !== undefined && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      Confidence: {(dis.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Decisions */}
      {extraction.decisions && extraction.decisions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            Decisions ({extraction.decisions.length})
          </h3>
          <ul className="space-y-3">
            {extraction.decisions.map((dec, idx) => (
              <li key={idx} className="border-l-2 border-purple-500 pl-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-text-primary flex-1">{dec.text}</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => scrollToTimestamp(dec.startTime)}
                    className="ml-2 h-auto p-0 text-xs"
                  >
                    {formatTime(dec.startTime)}
                  </Button>
                </div>
                {dec.confidence !== undefined && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      Confidence: {(dec.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Follow-ups */}
      {extraction.followUps && extraction.followUps.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            Follow-ups ({extraction.followUps.length})
          </h3>
          <ul className="space-y-3">
            {extraction.followUps.map((fu, idx) => (
              <li key={idx} className="border-l-2 border-info-border pl-3">
                <div className="flex items-start justify-between">
                  <p className="text-sm text-text-primary flex-1">{fu.text}</p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => scrollToTimestamp(fu.startTime)}
                    className="ml-2 h-auto p-0 text-xs"
                  >
                    {formatTime(fu.startTime)}
                  </Button>
                </div>
                {fu.confidence !== undefined && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      Confidence: {(fu.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(!extraction.topics || extraction.topics.length === 0) &&
        (!extraction.recommendations || extraction.recommendations.length === 0) &&
        (!extraction.disclosures || extraction.disclosures.length === 0) &&
        (!extraction.decisions || extraction.decisions.length === 0) &&
        (!extraction.followUps || extraction.followUps.length === 0) && (
          <Alert>
            <AlertDescription>
              No fields were extracted from this transcript.
            </AlertDescription>
          </Alert>
        )}

      {/* Soft Gap Prompts */}
      <SoftGapPrompts extraction={extraction} />
    </div>
  );
}

/**
 * Soft Gap Prompter Component
 * Displays prompts when recommendations are detected but risk disclosures are not
 */
function SoftGapPrompts({ extraction }: { extraction: ExtractionData | null | undefined }) {
  const [dismissedPrompts, setDismissedPrompts] = useState<Set<string>>(new Set());

  if (!extraction) return null;

  // Find recommendations without corresponding risk disclosures
  const recommendations = extraction.recommendations || [];
  const disclosures = extraction.disclosures || [];

  // Simple heuristic: if there are recommendations but no disclosures, show a prompt
  // In a more sophisticated version, we'd match recommendations to specific disclosures
  const hasRecommendations = recommendations.length > 0;
  const hasDisclosures = disclosures.length > 0;
  const needsPrompt = hasRecommendations && !hasDisclosures;

  if (!needsPrompt || dismissedPrompts.has("no-disclosures")) {
    return null;
  }

  const promptId = "no-disclosures";

  return (
    <Alert variant="default" className="mt-4">
      <div className="flex items-start justify-between w-full">
        <div className="flex-1">
          <h4 className="text-sm font-semibold mb-1">
            Soft Gap Prompt
          </h4>
          <AlertDescription>
            {recommendations.length} recommendation{recommendations.length > 1 ? "s" : ""} detected, but no risk disclosure{recommendations.length > 1 ? "s" : ""} found.
            Please confirm if risk was discussed or add disclosure if needed.
          </AlertDescription>
          {recommendations.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              First recommendation at {formatTime(recommendations[0]!.startTime)}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissedPrompts(new Set([...dismissedPrompts, promptId]))}
          className="ml-2 h-auto p-1"
          aria-label="Dismiss prompt"
        >
          ×
        </Button>
      </div>
    </Alert>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

