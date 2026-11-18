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
import type { M365WorkspaceStatus } from "~/lib/types/evidence";

type MailFolder = { id: string; displayName: string };

export function M365MailClient({
  workspaceStatus,
  connected,
  adminConsent,
  mailbox,
  error,
}: {
  workspaceStatus: M365WorkspaceStatus;
  connected?: boolean;
  adminConsent?: boolean;
  mailbox?: string;
  error?: string;
}) {
  const [connections, setConnections] = useState<MailboxConnectionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMailbox, setNewMailbox] = useState("");
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [syncPending, setSyncPending] = useState<string | null>(null);
  const [folders, setFolders] = useState<MailFolder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [backfillFrom, setBackfillFrom] = useState("");

  useEffect(() => {
    if (connected) toast.success("Mailbox connected");
    if (adminConsent) toast.success("Admin consent granted — add mailboxes below");
    if (error) toast.error(error);
  }, [connected, adminConsent, error]);

  useEffect(() => {
    void loadConnections();
  }, []);

  async function loadConnections(): Promise<void> {
    setLoading(true);
    const res = await fetch("/api/mailbox/connections");
    const json = (await res.json()) as { success: boolean; data?: MailboxConnectionDto[] };
    if (json.success && json.data) {
      setConnections(json.data.filter((c) => c.provider === "M365"));
    }
    setLoading(false);
  }

  async function addMailbox(): Promise<void> {
    if (!newMailbox) return;
    const res = await fetch("/api/mailbox/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mailboxAddress: newMailbox }),
    });
    const json = (await res.json()) as { success: boolean; error?: string };
    if (!json.success) {
      toast.error(json.error ?? "Failed to add mailbox");
      return;
    }
    setNewMailbox("");
    await loadConnections();
    toast.success("Mailbox added");
  }

  async function loadFolders(connectionId: string): Promise<void> {
    const conn = connections.find((c) => c.id === connectionId);
    if (
      conn?.consentMode === "APPLICATION" &&
      !workspaceStatus.connected
    ) {
      toast.error(
        "Complete Admin consent first — workspace M365 token is missing"
      );
      return;
    }

    setSelectedConnection(connectionId);
    const res = await fetch(`/api/mailbox/connections/${connectionId}/folders`);
    const json = (await res.json()) as { success: boolean; data?: MailFolder[]; error?: string };
    if (!json.success) {
      toast.error(json.error ?? "Could not load folders");
      return;
    }
    setFolders(json.data ?? []);
    setSelectedFolders(conn?.scopeFolders ?? []);
    setBackfillFrom(conn?.backfillFrom?.slice(0, 10) ?? "");
  }

  async function saveScope(connectionId: string): Promise<void> {
    if (selectedFolders.length === 0) {
      toast.error("Select at least one folder");
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
        <h1 className="text-2xl font-semibold text-text-primary">Microsoft 365 Mail</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Controlled ingestion — selected mailboxes, folders and date ranges only.
        </p>
      </div>

      {!workspaceStatus.oauthConfigured && (
        <div className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm text-warning-text">
          <p className="font-medium">Azure OAuth not configured on the server</p>
          <p className="mt-1">
            Set <code className="text-xs">M365_MAIL_CLIENT_ID</code> and{" "}
            <code className="text-xs">M365_MAIL_CLIENT_SECRET</code> in Vercel (or{" "}
            <code className="text-xs">.env</code> locally).{" "}
            <code className="text-xs">TEAMS_*</code> is optional — only used as a fallback
            if you already have a Teams Azure app.
          </p>
        </div>
      )}

      {workspaceStatus.oauthConfigured && !workspaceStatus.connected && (
        <div className="rounded-lg border border-warning-border bg-warning-bg p-4 text-sm text-warning-text">
          <p className="font-medium">M365 mail integration not connected</p>
          <p className="mt-1">
            Before loading folders or syncing, connect once using one of the buttons below:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Admin consent</strong> — for application mode (add mailboxes manually,
              then backfill multiple advisers)
            </li>
            <li>
              <strong>Connect my mailbox</strong> — for delegated mode (one mailbox per OAuth
              sign-in)
            </li>
          </ul>
        </div>
      )}

      {workspaceStatus.connected && (
        <p className="text-sm text-success-text">
          Workspace token active
          {workspaceStatus.consentMode ? ` (${workspaceStatus.consentMode})` : ""}
          {workspaceStatus.tenantId ? ` · tenant ${workspaceStatus.tenantId}` : ""}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button asChild className="bg-brand text-text-primary hover:bg-brand">
          <a href="/api/integrations/m365-mail/connect">Connect my mailbox (delegated)</a>
        </Button>
        <Button asChild variant="outline">
          <a href="/api/integrations/m365-mail/admin-consent">Admin consent (application)</a>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/communications">View threads</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/mailbox/triage">Participant triage</Link>
        </Button>
      </div>

      {mailbox && (
        <p className="text-sm text-success-text">Connected mailbox: {decodeURIComponent(mailbox)}</p>
      )}

      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-medium">Add mailbox (application mode)</h2>
        <div className="flex gap-2">
          <Input
            placeholder="adviser@firm.com"
            value={newMailbox}
            onChange={(e) => setNewMailbox(e.target.value)}
          />
          <Button onClick={() => void addMailbox()}>Add</Button>
        </div>
      </section>

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
                  <p className="font-medium">{c.mailboxAddress}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.status} · {c.consentMode} · last sync{" "}
                    {c.lastSyncAt ? new Date(c.lastSyncAt).toLocaleString() : "never"}
                  </p>
                  {c.lastErrorMessage && (
                    <p className="text-xs text-destructive">{c.lastErrorMessage}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void loadFolders(c.id)}>
                    Folders
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
