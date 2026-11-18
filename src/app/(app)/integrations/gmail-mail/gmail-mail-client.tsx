"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  StatefulButton,
  pendingButtonState,
} from "~/components/ui/stateful-button";
import { Input } from "~/components/ui/input";
import { toast } from "~/lib/toast";
import type { MailboxConnectionDto } from "~/lib/types/evidence";
import type { GmailWorkspaceStatus } from "~/lib/types/evidence";
import { isRelease1DemoEnabled } from "~/lib/feature-flags";
import { ConnectProgress } from "~/app/(app)/mailbox/connect-progress";
import { ZeroSetupReveal } from "~/components/mailbox/zero-setup-reveal";

type MailFolder = { id: string; displayName: string };

const TEST_MAILBOX_RE = /complyvaultco@gmail\.com/i;

function displayMailboxAddress(address: string): string {
  const alias = process.env.NEXT_PUBLIC_DEMO_MAILBOX_LABEL?.trim();
  if (alias) return alias;
  if (TEST_MAILBOX_RE.test(address)) return "compliance@complyvault.co";
  return address;
}

export function GmailMailClient({
  workspaceStatus,
  connected,
  mailbox,
  error,
}: {
  workspaceStatus: GmailWorkspaceStatus;
  connected?: boolean;
  mailbox?: string;
  error?: string;
}) {
  const [connections, setConnections] = useState<MailboxConnectionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState<string | null>(null);
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [backfillFrom, setBackfillFrom] = useState("");
  const [revealCounts, setRevealCounts] = useState({
    heldIdentityCount: 0,
    openFlagCount: 0,
    parkedCount: 0,
  });
  const release1 = isRelease1DemoEnabled();

  useEffect(() => {
    if (connected) {
      toast.success(
        release1
          ? "Mailbox connected — first evidence is ready"
          : "Mailbox connected"
      );
    }
    if (error) toast.error(error);
  }, [connected, error, release1]);

  useEffect(() => {
    void loadConnections();
  }, []);

  useEffect(() => {
    if (!release1) return;
    void (async () => {
      try {
        const res = await fetch("/api/needs-attention");
        const json = (await res.json()) as {
          success?: boolean;
          data?: Array<{ kind: string }>;
        };
        if (!json.success || !json.data) return;
        setRevealCounts({
          heldIdentityCount: json.data.filter((i) => i.kind === "held_identity")
            .length,
          openFlagCount: json.data.filter((i) => i.kind === "flag").length,
          parkedCount: json.data.filter((i) => i.kind === "parked_ingest")
            .length,
        });
      } catch {
        // Reveal counts are best-effort for the demo surface.
      }
    })();
  }, [release1, connections.length]);

  async function loadConnections(): Promise<void> {
    setLoading(true);
    const res = await fetch("/api/mailbox/connections");
    const json = (await res.json()) as { success: boolean; data?: MailboxConnectionDto[] };
    if (json.success && json.data) {
      setConnections(json.data.filter((c) => c.provider === "GMAIL"));
    }
    setLoading(false);
  }

  async function loadFolders(connectionId: string): Promise<void> {
    setSelectedConnection(connectionId);
    const res = await fetch(`/api/mailbox/connections/${connectionId}/folders`);
    const json = (await res.json()) as { success: boolean; data?: MailFolder[]; error?: string };
    if (!json.success) {
      toast.error(json.error ?? "Could not load labels");
      return;
    }
    setFolders(json.data ?? []);
    const conn = connections.find((c) => c.id === connectionId);
    setSelectedFolders(conn?.scopeFolders ?? []);
    setBackfillFrom(conn?.backfillFrom?.slice(0, 10) ?? "");
  }

  async function saveScope(connectionId: string): Promise<void> {
    if (selectedFolders.length === 0) {
      toast.error("Select at least one label");
      return;
    }
    const res = await fetch(`/api/mailbox/connections/${connectionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scopeFolders: selectedFolders,
        backfillFrom: backfillFrom ? new Date(backfillFrom).toISOString() : undefined,
      }),
    });
    const json = (await res.json()) as { success: boolean; error?: string };
    if (!json.success) {
      toast.error(json.error ?? "Failed to save scope");
      return;
    }
    toast.success("Scope saved");
    await loadConnections();
  }

  async function startSync(connectionId: string, kind: "BACKFILL" | "DELTA"): Promise<void> {
    const key = `${connectionId}-${kind}`;
    setSyncPending(key);
    try {
      const res = await fetch(`/api/mailbox/connections/${connectionId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const json = (await res.json()) as { success: boolean; data?: { jobId: string }; error?: string };
      if (!json.success) {
        toast.error(json.error ?? "Sync failed");
        return;
      }
      toast.success(`${kind} job started`);
      await loadConnections();
    } finally {
      setSyncPending(null);
    }
  }

  function toggleFolder(folderId: string): void {
    setSelectedFolders((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          {release1 ? "Connect mailbox" : "Gmail"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {release1
            ? "Zero setup to first evidence — no client records to type. Select labels and date range only."
            : "Controlled ingestion — selected mailbox, labels and date ranges only."}
        </p>
      </div>

      {release1 && (
        <ConnectProgress
          currentStage={
            connections.length > 0
              ? "resolving"
              : connected
                ? "ingesting"
                : "authorising"
          }
        />
      )}

      {release1 && (connections.length > 0 || connected) && (
        <ZeroSetupReveal
          {...revealCounts}
          lastSyncAt={
            connections
              .map((c) => c.lastSyncAt)
              .filter((v): v is string => Boolean(v))
              .sort()
              .at(-1) ?? null
          }
        />
      )}

      {!workspaceStatus.oauthConfigured && (
        <div className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm text-warning-text">
          <p className="font-medium">Google OAuth not configured on the server</p>
          <p className="mt-1">
            Set <code className="text-xs">GMAIL_MAIL_CLIENT_ID</code> and{" "}
            <code className="text-xs">GMAIL_MAIL_CLIENT_SECRET</code> in Vercel (or{" "}
            <code className="text-xs">.env</code> locally). Enable the Gmail API and add the{" "}
            <code className="text-xs">gmail.readonly</code> scope on your Google Cloud OAuth app.
          </p>
        </div>
      )}

      {workspaceStatus.oauthConfigured && !workspaceStatus.connected && (
        <div className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm text-warning-text">
          <p className="font-medium">Gmail integration not connected</p>
          <p className="mt-1">
            Click <strong>Connect my mailbox</strong> below and sign in with Google to grant
            read-only access. Then select labels and run a backfill.
          </p>
        </div>
      )}

      {workspaceStatus.connected && (
        <p className="text-sm text-success-text">Workspace Gmail token active (delegated)</p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild className="bg-brand text-text-primary hover:bg-brand">
          <a href="/api/integrations/gmail-mail/connect">Connect my mailbox</a>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/communications">View threads</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/mailbox/triage">Participant triage</Link>
        </Button>
      </div>

      {mailbox && (
        <p className="text-sm text-success-text">
          Connected mailbox: {displayMailboxAddress(decodeURIComponent(mailbox))}
        </p>
      )}

      <section className="space-y-4">
        <h2 className="font-medium">Connections</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No mailboxes connected yet.</p>
        ) : (
          connections.map((c) => (
            <div key={c.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{displayMailboxAddress(c.mailboxAddress)}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.status} · {c.consentMode} · last sync{" "}
                    {c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : "never"}
                  </p>
                  {c.lastErrorMessage && (
                    <p className="text-xs text-destructive">{c.lastErrorMessage}</p>
                  )}
                  {c.scopeFolders.length === 0 && (
                    <p className="mt-2 rounded-md border border-warning-border bg-warning-bg px-2 py-1.5 text-xs text-warning-text">
                      No labels selected yet — threads won&apos;t sync until you scope
                      the mailbox. Click <strong>Labels</strong>, choose at least one
                      label, <strong>Save scope</strong>, then run <strong>Backfill</strong>.
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void loadFolders(c.id)}>
                    Labels
                  </Button>
                  <StatefulButton
                    size="sm"
                    state={pendingButtonState(syncPending === `${c.id}-BACKFILL`)}
                    loadingText="Starting…"
                    onClick={() => void startSync(c.id, "BACKFILL")}
                    className="bg-brand text-text-primary hover:bg-brand"
                    disabled={syncPending !== null}
                  >
                    Backfill
                  </StatefulButton>
                  <StatefulButton
                    size="sm"
                    variant="secondary"
                    state={pendingButtonState(syncPending === `${c.id}-DELTA`)}
                    loadingText="Starting…"
                    onClick={() => void startSync(c.id, "DELTA")}
                    disabled={syncPending !== null}
                  >
                    Delta sync
                  </StatefulButton>
                </div>
              </div>

              {selectedConnection === c.id && (
                <div className="space-y-3 border-t pt-3">
                  <Input
                    type="date"
                    value={backfillFrom}
                    onChange={(e) => setBackfillFrom(e.target.value)}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    {folders.map((f) => (
                      <label key={f.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedFolders.includes(f.id)}
                          onChange={() => toggleFolder(f.id)}
                        />
                        {f.displayName}
                      </label>
                    ))}
                  </div>
                  <Button size="sm" onClick={() => void saveScope(c.id)}>
                    Save scope
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
