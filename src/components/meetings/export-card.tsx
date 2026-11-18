"use client";

import { useState } from "react";
import { CircleCheck, Download, FileText, Flag, History, Loader2, Map, ScrollText } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { cn } from "~/lib/utils";

type ExportMeetingStatus = "CCO_SIGNED_OFF" | "FINALIZED";

export function ExportCard({
  meetingId,
  meetingStatus,
  hasExtraction,
}: {
  meetingId: string;
  meetingStatus: ExportMeetingStatus;
  hasExtraction: boolean;
}): React.ReactElement {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFinalized = meetingStatus === "FINALIZED";

  const runExport = async (): Promise<void> => {
    setIsExporting(true);
    setError(null);
    try {
      const response = await fetch(`/api/meetings/${meetingId}/export`, {
        method: "POST",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
        };
        const message = data.details ?? data.error ?? "Failed to export audit pack";
        throw new Error(message);
      }
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "audit_pack.zip";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1]!;
        }
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsExporting(false);
    }
  };

  if (!hasExtraction) {
    return (
      <section className="space-y-3" aria-labelledby="export-card-heading">
        <h3 id="export-card-heading" className="text-[13px] font-medium text-muted-foreground">
          Audit pack export
        </h3>
        <Alert variant="default">
          <AlertDescription className="text-[13px]">
            Extraction data is required to export. Reprocess the meeting first.
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  return (
    <section className="space-y-3" aria-labelledby="export-card-heading">
      <h3 id="export-card-heading" className="sr-only">
        Audit pack export
      </h3>
      <div
        className={cn(
          "rounded-xl px-5 py-5 shadow-sm",
          isFinalized
            ? "border-2 border-brand bg-card"
            : "border border-border bg-card",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 gap-y-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              isFinalized
                ? "bg-brand-light text-brand"
                : "bg-warning-bg text-semantic-warning",
            )}
          >
            <CircleCheck className="h-3 w-3" aria-hidden />
            {isFinalized ? "Finalized" : "Ready to finalize"}
          </span>
          <h4 className="text-[14px] font-medium text-foreground">
            {isFinalized ? "Audit pack ready for export" : "Audit pack (draft export)"}
          </h4>
        </div>
        <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
          {isFinalized
            ? "All three sign-off layers are complete. The audit pack includes the full compliance trail."
            : "CCO has signed off. Finalize the meeting to lock the audit pack. You can still download a draft export."}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2 text-[12px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-[13px] w-[13px] shrink-0 opacity-80" aria-hidden />
            Branded compliance PDF
          </div>
          <div className="flex items-center gap-2">
            <Map className="h-[13px] w-[13px] shrink-0 opacity-80" aria-hidden />
            Evidence map
          </div>
          <div className="flex items-center gap-2">
            <History className="h-[13px] w-[13px] shrink-0 opacity-80" aria-hidden />
            Version history
          </div>
          <div className="flex items-center gap-2">
            <ScrollText className="h-[13px] w-[13px] shrink-0 opacity-80" aria-hidden />
            Full transcript
          </div>
          <div className="flex items-center gap-2">
            <CircleCheck className="h-[13px] w-[13px] shrink-0 opacity-80" aria-hidden />
            Sign-off summary
          </div>
          <div className="flex items-center gap-2">
            <Flag className="h-[13px] w-[13px] shrink-0 opacity-80" aria-hidden />
            Flag resolution table
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            onClick={() => void runExport()}
            disabled={isExporting}
            className={cn(
              "rounded-md px-6 text-[14px] font-medium",
              isFinalized
                ? "bg-surface-strong text-white hover:bg-surface-strong/90"
                : "border border-input bg-background text-foreground shadow-sm hover:bg-muted/60",
            )}
            variant={isFinalized ? "default" : "outline"}
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Exporting…
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" aria-hidden />
                {isFinalized ? "Export audit pack" : "Export draft audit pack"}
              </>
            )}
          </Button>
        </div>
        {error ? (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </section>
  );
}
