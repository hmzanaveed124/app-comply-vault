"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "~/lib/toast";
import { Loader2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";

/**
 * CV-TR-16 — OWNER_CCO supersedes a sealed FINALIZED meeting.
 */
export function SupersedeMeetingButton({
  meetingId,
}: {
  meetingId: string;
}): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (): Promise<void> => {
    if (reason.trim().length < 10) {
      toast.error("Enter a narrative reason (at least 10 characters).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}/supersede`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { replacementMeetingId: string };
      };
      if (!res.ok || !data.success || !data.data) {
        toast.error(data.error ?? "Supersession failed");
        return;
      }
      toast.success("Replacement draft created. Original seal is unchanged.");
      router.push(`/meetings/${data.data.replacementMeetingId}`);
      router.refresh();
    } catch {
      toast.error("Supersession failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Supersede sealed record
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-surface-border bg-surface-muted p-4">
      <p className="text-sm text-text-primary">
        Creates a new draft meeting that carries the transcript forward. The
        sealed original stays FINALIZED with its seal and flags unchanged.
        This action is audit-logged.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="supersede-reason">Reason (required)</Label>
        <textarea
          id="supersede-reason"
          className="min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe why this sealed record must be corrected…"
          disabled={loading}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => void submit()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Confirm supersession
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={loading}
          onClick={() => {
            setOpen(false);
            setReason("");
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
