"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Check, Circle } from "lucide-react";

interface ReadyForCCOButtonProps {
  meetingId: string;
  currentStatus: boolean;
  meetingStatus: string;
}

export default function ReadyForCCOButton({
  meetingId,
  currentStatus,
  meetingStatus,
}: ReadyForCCOButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(currentStatus);
  const router = useRouter();

  // Only show for DRAFT_READY or DRAFT meetings
  if (meetingStatus !== "DRAFT_READY" && meetingStatus !== "DRAFT") {
    return null;
  }

  const handleToggle = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/meetings/${meetingId}/ready-for-cco`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ready: !isReady }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update ready for CCO status");
      }

      setIsReady(!isReady);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <Button
        onClick={handleToggle}
        disabled={isLoading}
        variant={isReady ? "default" : "outline"}
        className="w-full sm:w-auto"
      >
        {isReady ? (
          <>
            <span className="mr-2 flex h-4 w-4 items-center justify-center rounded-full bg-semantic-success text-white">
              <Check className="h-1 w-1" />
            </span>
            Marked Ready for CCO
          </>
        ) : (
          <>
            <Circle className="mr-2 h-4 w-4" />
            Mark Ready for CCO
          </>
        )}
      </Button>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <p className="text-xs text-muted-foreground">
        {isReady
          ? "This meeting is marked as ready for CCO review. The CCO will see it highlighted in their review queue."
          : "Mark this meeting as ready when you've completed your review and want the CCO to finalize it."}
      </p>
    </div>
  );
}

