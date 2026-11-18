"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { StatefulButton, type ButtonState } from "~/components/ui/stateful-button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

interface FinalizeButtonProps {
  meetingId: string;
  meetingStatus: string;
  userRole: string | null | undefined;
  evidenceCoverage: number | null;
  editedClaimsCount: number;
  openCriticalFlagsCount: number;
  openWarningFlagsCount: number;
  /** Render as compact control for ReviewActionBar */
  embedInActionBar?: boolean;
}

export default function FinalizeButton({
  meetingId,
  meetingStatus,
  userRole,
  evidenceCoverage,
  editedClaimsCount,
  openCriticalFlagsCount,
  openWarningFlagsCount,
  embedInActionBar,
}: FinalizeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [submitState, setSubmitState] = useState<ButtonState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [finalizeReason, setFinalizeReason] = useState<string>("");
  const [finalizeNote, setFinalizeNote] = useState<string>("");
  const router = useRouter();

  // CCO only, after three-layer CCO sign-off
  if (userRole !== "OWNER_CCO") {
    return null;
  }

  if (meetingStatus !== "CCO_SIGNED_OFF") {
    return null;
  }

  const handleFinalize = async () => {
    setIsLoading(true);
    setSubmitState("loading");
    setError(null);

    try {
      if (!finalizeReason) {
        throw new Error("Finalize reason is required");
      }
      if ((finalizeReason === "EXCEPTION_APPROVED" || finalizeReason === "OTHER") && !finalizeNote.trim()) {
        throw new Error("Finalize note is required for this reason");
      }

      const response = await fetch(`/api/meetings/${meetingId}/finalize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          finalizeReason,
          finalizeNote: finalizeNote.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to finalize meeting");
      }

      setIsOpen(false);
      setFinalizeReason("");
      setFinalizeNote("");
      setSubmitState("success");
      window.setTimeout(() => setSubmitState("idle"), 1500);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setSubmitState("error");
      window.setTimeout(() => setSubmitState("idle"), 2000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={embedInActionBar ? "contents" : "mt-4 space-y-2"}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="default"
            className={
              embedInActionBar
                ? "shrink-0 rounded-full bg-semantic-info px-5 text-[14px] font-medium text-white hover:bg-semantic-info/90"
                : "w-full sm:w-auto"
            }
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Finalize meeting
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalize Meeting</DialogTitle>
            <DialogDescription>
              Once finalized, this meeting record will become read-only and ready for export.
              This action cannot be undone. Are you sure you want to proceed?
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border p-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap gap-2">
              <span>Evidence coverage: {evidenceCoverage !== null ? `${(evidenceCoverage * 100).toFixed(1)}%` : "N/A"}</span>
              <span>Edited claims: {editedClaimsCount}</span>
              <span>Open critical: {openCriticalFlagsCount}</span>
              <span>Open warnings: {openWarningFlagsCount}</span>
            </div>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="finalizeReason">Finalize Reason</Label>
              <Select value={finalizeReason} onValueChange={setFinalizeReason}>
                <SelectTrigger id="finalizeReason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLETE_REVIEW">Complete review</SelectItem>
                  <SelectItem value="REQUIRED_CHANGES_ADDRESSED">Required changes addressed</SelectItem>
                  <SelectItem value="EXCEPTION_APPROVED">Exception approved</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="finalizeNote">Finalize Note</Label>
              <Textarea
                id="finalizeNote"
                value={finalizeNote}
                onChange={(e) => setFinalizeNote(e.target.value)}
                placeholder="Add context for this sign-off (required for exceptions or other)."
              />
              <p className="text-xs text-muted-foreground">
                Required for “Exception approved” and “Other”.
              </p>
            </div>
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <StatefulButton
              onClick={handleFinalize}
              state={submitState}
              loadingText="Finalizing..."
              successText="Finalized"
              errorText="Try again"
              disabled={isLoading && submitState === "idle"}
            >
              Confirm Finalize
            </StatefulButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {!embedInActionBar ? (
        <p className="text-xs text-muted-foreground">
          Finalizing this meeting will make it read-only and ready for export. Only workspace owners (CCO) can
          finalize meetings.
        </p>
      ) : null}
    </div>
  );
}

