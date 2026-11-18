"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ExtractionData } from "~/server/extraction/types";
import { getTopicTitle, getTopicDescription } from "~/lib/topics";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";

interface EditableFieldsProps {
  meetingId: string;
  extraction: ExtractionData | null | undefined;
  isReadOnly?: boolean;
  transcript?: { segments: Array<{ startTime: number; endTime: number; speaker: string; text: string }> } | null;
  flags: Array<{
    id: string;
    type: string;
    severity: string;
    status: string;
    evidence: any;
  }>;
}

export default function EditableFields({
  meetingId,
  extraction,
  isReadOnly = false,
  transcript,
  flags,
}: EditableFieldsProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState<{
    fieldType: string;
    index: number;
  } | null>(null);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editStartTime, setEditStartTime] = useState<number | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for timestamp clicks from transcript
  useEffect(() => {
    const handleSetTimestamp = (event: CustomEvent<{ timestamp: number }>) => {
      if (isAdding || isEditing) {
        setEditStartTime(event.detail.timestamp);
      }
    };

    window.addEventListener('setTimestamp', handleSetTimestamp as EventListener);
    return () => {
      window.removeEventListener('setTimestamp', handleSetTimestamp as EventListener);
    };
  }, [isAdding, isEditing]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

  const scrollToTimestamp = (startTime: number) => {
    const segmentElement = document.querySelector(
      `[data-timestamp="${Math.floor(startTime)}"]`
    );
    if (segmentElement) {
      segmentElement.scrollIntoView({ behavior: "smooth", block: "center" });
      segmentElement.classList.add("bg-warning-bg");
      setTimeout(() => {
        segmentElement.classList.remove("bg-warning-bg");
      }, 2000);
    }
  };

  const handleEdit = async (
    fieldType: string,
    action: "update" | "add" | "remove",
    index?: number,
    item?: any
  ) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/edit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fieldType,
          action,
          index,
          item,
          reason: editReason || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save edit");
      }

      // Refresh the page to show updated data
      router.refresh();
      setIsEditing(null);
      setIsAdding(null);
      setEditValue("");
      setEditReason("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsSaving(false);
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

  const renderEditableList = (
    fieldType: "topics" | "recommendations" | "disclosures" | "decisions" | "followUps",
    items: any[],
    label: string,
    borderColor: string
  ) => {
    if (isReadOnly) {
      // Read-only view
      if (items.length === 0) return null;
      return (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            {label} ({items.length})
          </h3>
          <ul className="space-y-3">
            {items.map((item, idx) => {
              const matchedFlags = findFlagsForItem(fieldType, item.startTime);
              return (
              <li
                key={idx}
                className={`border-l-2 ${borderColor} pl-3`}
                data-claim-field={fieldType}
                data-claim-start={Math.floor(item.startTime ?? 0)}
              >
                <div className="flex items-start justify-between">
                  <p className="text-sm text-text-primary flex-1">{item.text}</p>
                  {item.startTime !== undefined && (
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => scrollToTimestamp(item.startTime)}
                      className="ml-2 h-auto p-0 text-xs"
                    >
                      {formatTime(item.startTime)}
                    </Button>
                  )}
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
                {item.confidence !== undefined && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      Confidence: {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </li>
            );
            })}
          </ul>
        </div>
      );
    }

    // Editable view
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text-primary">
            {label} ({items.length})
          </h3>
          {!isReadOnly && (
            <Dialog open={isAdding === fieldType} onOpenChange={(open) => setIsAdding(open ? fieldType : null)}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add {label.slice(0, -1)}</DialogTitle>
                  <DialogDescription>
                    Add a new item to {label.toLowerCase()}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="add-text">Text</Label>
                    <Textarea
                      id="add-text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Enter text..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="add-timestamp">Timestamp (seconds, optional)</Label>
                    <Input
                      id="add-timestamp"
                      type="number"
                      min="0"
                      step="1"
                      value={editStartTime ?? ""}
                      onChange={(e) => setEditStartTime(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="e.g., 120 for 2:00"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the timestamp in seconds, or click a timestamp in the transcript to link this item
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="add-reason">Reason (optional)</Label>
                    <Input
                      id="add-reason"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      placeholder="Why are you adding this?"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAdding(null);
                      setEditValue("");
                      setEditReason("");
                      setEditStartTime(undefined);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (editValue.trim()) {
                        const startTime = editStartTime ?? 0;
                        const endTime = startTime + 10; // Default 10 second duration
                        handleEdit(fieldType, "add", undefined, {
                          text: editValue.trim(),
                          startTime,
                          endTime,
                          snippet: editValue.trim(),
                        });
                      }
                    }}
                    disabled={!editValue.trim() || isSaving}
                  >
                    Add
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <ul className="space-y-3">
          {items.map((item, idx) => {
            const matchedFlags = findFlagsForItem(fieldType, item.startTime);
            return (
            <li
              key={idx}
              className={`border-l-2 ${borderColor} pl-3`}
              data-claim-field={fieldType}
              data-claim-start={Math.floor(item.startTime ?? 0)}
            >
              {isEditing?.fieldType === fieldType && isEditing.index === idx ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="edit-text" className="text-xs">Text</Label>
                    <Textarea
                      id="edit-text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Enter text..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-timestamp" className="text-xs">Timestamp (seconds)</Label>
                    <Input
                      id="edit-timestamp"
                      type="number"
                      min="0"
                      step="1"
                      value={editStartTime ?? item.startTime ?? ""}
                      onChange={(e) => setEditStartTime(e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="e.g., 120 for 2:00"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Click a timestamp in the transcript to link this item
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (editValue.trim()) {
                          const startTime = editStartTime ?? item.startTime ?? 0;
                          const endTime = item.endTime ?? startTime + 10;
                          handleEdit(fieldType, "update", idx, {
                            ...item,
                            text: editValue.trim(),
                            startTime,
                            endTime,
                          });
                        }
                      }}
                      disabled={!editValue.trim() || isSaving}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(null);
                        setEditValue("");
                        setEditReason("");
                        setEditStartTime(undefined);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <p className="text-sm text-text-primary flex-1">{item.text}</p>
                  <div className="flex items-center gap-2 ml-2">
                    {item.startTime !== undefined && (
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => scrollToTimestamp(item.startTime)}
                        className="h-auto p-0 text-xs"
                      >
                        {formatTime(item.startTime)}
                      </Button>
                    )}
                    {!isReadOnly && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsEditing({ fieldType, index: idx });
                            setEditValue(item.text);
                            setEditReason("");
                            setEditStartTime(item.startTime);
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Are you sure you want to remove this item?")) {
                              handleEdit(fieldType, "remove", idx);
                            }
                          }}
                          className="h-8 w-8 p-0 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
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
              {item.confidence !== undefined && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-xs text-text-secondary">
                    Confidence: {(item.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </li>
          );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-h-[600px] overflow-y-auto">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

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
      {renderEditableList(
        "recommendations",
        extraction.recommendations || [],
        "Recommendations",
        "border-success-border"
      )}

      {/* Disclosures */}
      {renderEditableList(
        "disclosures",
        extraction.disclosures || [],
        "Disclosures",
        "border-warning-border"
      )}

      {/* Decisions */}
      {renderEditableList(
        "decisions",
        extraction.decisions || [],
        "Decisions",
        "border-purple-500"
      )}

      {/* Follow-ups */}
      {renderEditableList(
        "followUps",
        extraction.followUps || [],
        "Follow-ups",
        "border-info-border"
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

function SoftGapPrompts({ extraction }: { extraction: ExtractionData | null | undefined }) {
  const [dismissedPrompts, setDismissedPrompts] = useState<Set<string>>(new Set());

  if (!extraction) return null;

  const recommendations = extraction.recommendations || [];
  const disclosures = extraction.disclosures || [];
  const hasRecommendations = recommendations.length > 0;
  const hasDisclosures = disclosures.length > 0;
  const needsPrompt = hasRecommendations && !hasDisclosures;

  if (!needsPrompt || dismissedPrompts.has("no-disclosures")) {
    return null;
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const firstRecommendation = recommendations[0];

  return (
    <Alert variant="default" className="mt-6 border-warning-border bg-warning-bg dark:bg-semantic-warning/20">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="h-5 w-5 text-warning-text dark:text-warning-text"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-warning-text dark:text-warning-text mb-1">
                Soft Gap Prompt
              </h4>
              <AlertDescription className="text-warning-text dark:text-warning-text">
                <div className="space-y-2">
                  <p>
                    <strong>{recommendations.length}</strong> recommendation{recommendations.length > 1 ? "s" : ""} detected, but{" "}
                    <strong>no risk disclosure{recommendations.length > 1 ? "s" : ""} found</strong>.
                  </p>
                  <p className="text-xs">
                    Please confirm if risk was discussed or add disclosure if needed.
                  </p>
                  {firstRecommendation && (
                    <div className="mt-2 p-2 bg-warning-bg dark:bg-semantic-warning/30 rounded text-xs">
                      <div className="font-medium mb-1">
                        First recommendation at {formatTime(firstRecommendation.startTime)}
                      </div>
                      <div className="text-warning-text dark:text-warning-text line-clamp-2">
                        "{firstRecommendation.text}"
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDismissedPrompts(new Set([...dismissedPrompts, "no-disclosures"]))}
              className="ml-2 h-auto p-1 text-warning-text hover:text-warning-text dark:text-warning-text dark:hover:text-warning-text"
              aria-label="Dismiss prompt"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </Alert>
  );
}

