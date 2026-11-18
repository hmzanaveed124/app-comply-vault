"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

type ParkedItem = {
  id: string;
  source: string;
  externalRef: string;
  occurredAt: string | null;
  parkedAt: string;
  status: string;
};

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleString();
}

export function ParkedIngestList({
  workspaceId,
  items,
  postureSet,
  canReplay,
}: {
  workspaceId: string;
  items: ParkedItem[];
  postureSet: boolean;
  canReplay: boolean;
}) {
  const router = useRouter();
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleReplay = async (id: string): Promise<void> => {
    setReplayingId(id);
    setError(null);
    try {
      const response = await fetch(
        `/api/workspaces/${workspaceId}/parked-ingests/${id}/replay`,
        { method: "POST" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to process recording",
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setReplayingId(null);
    }
  };

  if (items.length === 0) return null;

  return (
    <Card className="border-warning-border">
      <CardHeader>
        <CardTitle>
          Parked recordings ({items.length})
        </CardTitle>
        <CardDescription>
          These recordings arrived while no media policy was recorded and were not
          ingested. Nothing processes automatically under a policy chosen after the fact
          — each one needs an explicit action. Source platforms age recordings out, so
          process these promptly or they may become unrecoverable.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!postureSet && (
          <Alert>
            <AlertDescription>
              Record the media policy decision above before processing parked recordings.
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ul className="divide-y rounded-md border">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="space-y-1">
                <div className="text-sm font-medium capitalize">
                  {item.source} recording
                </div>
                <p className="text-xs text-muted-foreground">
                  Recorded {formatDate(item.occurredAt)} · Parked {formatDate(item.parkedAt)}
                </p>
                {item.status === "REPLAY_REQUESTED" && (
                  <p className="text-xs text-muted-foreground">
                    Processing requested — this entry clears once ingestion completes.
                  </p>
                )}
              </div>
              {canReplay && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReplay(item.id)}
                  disabled={!postureSet || replayingId !== null}
                >
                  {replayingId === item.id
                    ? "Processing..."
                    : item.status === "REPLAY_REQUESTED"
                      ? "Process again"
                      : "Process now"}
                </Button>
              )}
            </li>
          ))}
        </ul>

        {!canReplay && (
          <p className="text-xs text-muted-foreground">
            Only the workspace CCO can process parked recordings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
