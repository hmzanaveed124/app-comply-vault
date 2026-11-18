"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "~/lib/toast";
import { Button } from "~/components/ui/button";
import {
  StatefulButton,
  pendingButtonState,
} from "~/components/ui/stateful-button";
import { Input } from "~/components/ui/input";
import { CheckCircle2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  zoomHasBaseListUserRecordingsOnly,
  zoomRecordingListScopesLikelyMissing,
} from "~/lib/zoom-scopes";

const PROVIDER_LABELS: Record<string, string> = {
  ZOOM: "Zoom",
  TEAMS: "Microsoft Teams",
  SHAREPOINT: "SharePoint",
  GOOGLE_DRIVE: "Google Drive",
  SMARTVAULT: "SmartVault",
  REDTAIL: "Redtail CRM",
  WEALTHBOX: "Wealthbox",
  SALESFORCE: "Salesforce",
  DOCUSIGN: "DocuSign",
  RIA_IN_A_BOX: "RIA in a Box",
  COMPLYSCI: "ComplySci",
  SLACK: "Slack",
  TEAMS_BOT: "Teams Bot",
  ZOHO_CRM: "Zoho CRM",
  GMAIL_MAIL: "Gmail (email evidence)",
  M365_MAIL: "Microsoft 365 Mail (email evidence)",
};

// Mail connectors are managed on their own OAuth pages (label scoping,
// backfill, delta sync) rather than the generic credential card below.
const MAIL_PROVIDERS = new Set(["GMAIL_MAIL", "M365_MAIL"]);

const STATUS_LABELS: Record<string, string> = {
  CONNECTED: "Live",
  WARNING_RETRYING: "Attention",
  ERROR_ACTION_REQUIRED: "Error",
  NOT_CONNECTED: "Not Connected",
};

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: "bg-success-bg text-success-text",
  WARNING_RETRYING: "bg-warning-bg text-warning-text",
  ERROR_ACTION_REQUIRED: "bg-danger-bg text-danger-text",
  NOT_CONNECTED: "bg-surface-muted text-text-secondary",
};

type Integration = {
  id: string;
  provider: string;
  status: string;
  expiresAt: string | null;
  lastSyncAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  connectedAt: string;
  accountEmail?: string | null;
  recordingScope?: string;
  rootFolder?: string;
  oauthScopes?: string | null;
};

type Failure = {
  id: string;
  meetingId: string | null;
  action: string;
  errorMessage: string | null;
  attempts: number;
  createdAt: string;
};

export function IntegrationsClient({
  workspaceId,
  initialIntegrations,
  zoomConnected,
  zoomEmail,
  zoomError,
  zoomErrorDescription,
  teamsConnected,
  teamsEmail,
  teamsError,
  teamsErrorDescription,
  sharepointConnected,
  sharepointEmail,
  sharepointError,
  sharepointErrorDescription,
  zohoCrmConnected,
  zohoCrmAccount,
  zohoCrmError,
  zohoCrmErrorDescription,
}: {
  workspaceId: string;
  initialIntegrations: Integration[];
  zoomConnected?: boolean;
  zoomEmail?: string | null;
  zoomError?: string | null;
  zoomErrorDescription?: string | null;
  teamsConnected?: boolean;
  teamsEmail?: string | null;
  teamsError?: string | null;
  teamsErrorDescription?: string | null;
  sharepointConnected?: boolean;
  sharepointEmail?: string | null;
  sharepointError?: string | null;
  sharepointErrorDescription?: string | null;
  zohoCrmConnected?: boolean;
  zohoCrmAccount?: string | null;
  zohoCrmError?: string | null;
  zohoCrmErrorDescription?: string | null;
}) {
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [expandedFailures, setExpandedFailures] = useState<string | null>(null);
  const [failures, setFailures] = useState<Record<string, Failure[]>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const router = useRouter();

  const hasZoom = integrations.some((i) => i.provider === "ZOOM");
  const hasTeams = integrations.some((i) => i.provider === "TEAMS");
  const hasSharePoint = integrations.some((i) => i.provider === "SHAREPOINT");
  const hasZohoCrm = integrations.some((i) => i.provider === "ZOHO_CRM");
  const hasGmailMail = integrations.some((i) => i.provider === "GMAIL_MAIL");
  const hasM365Mail = integrations.some((i) => i.provider === "M365_MAIL");

  useEffect(() => {
    if (
      (zoomConnected && zoomEmail && integrations.some((i) => i.provider === "ZOOM")) ||
      (teamsConnected && teamsEmail && integrations.some((i) => i.provider === "TEAMS")) ||
      (sharepointConnected && sharepointEmail && integrations.some((i) => i.provider === "SHAREPOINT")) ||
      (zohoCrmConnected && zohoCrmAccount && integrations.some((i) => i.provider === "ZOHO_CRM"))
    ) {
      window.history.replaceState({}, "", "/integrations");
    }
  }, [
    zoomConnected,
    zoomEmail,
    teamsConnected,
    teamsEmail,
    sharepointConnected,
    sharepointEmail,
    zohoCrmConnected,
    zohoCrmAccount,
    integrations,
  ]);

  function handleConnectZoom() {
    setConnectLoading(true);
    window.location.href = "/api/integrations/zoom/connect";
  }

  function handleConnectTeams() {
    setConnectLoading(true);
    window.location.href = "/api/integrations/teams/connect";
  }

  function handleConnectSharePoint() {
    setConnectLoading(true);
    window.location.href = "/api/integrations/sharepoint/connect";
  }

  function handleConnectZohoCrm() {
    setConnectLoading(true);
    window.location.href = "/api/integrations/zoho-crm/connect";
  }

  async function handleDisconnect(credentialId: string) {
    if (!confirm("Disconnect this integration? Credentials and config will be removed. Audit packs are unchanged.")) return;
    setLoading(credentialId);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/integrations/${credentialId}/disconnect`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      setIntegrations((prev) => prev.filter((i) => i.id !== credentialId));
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setLoading(null);
    }
  }

  async function toggleFailures(credentialId: string) {
    if (expandedFailures === credentialId) {
      setExpandedFailures(null);
      return;
    }
    if (!failures[credentialId]) {
      const res = await fetch(`/api/workspaces/${workspaceId}/integrations/${credentialId}/failures`);
      if (res.ok) {
        const { failures: f } = await res.json();
        setFailures((prev) => ({ ...prev, [credentialId]: f }));
      }
    }
    setExpandedFailures(credentialId);
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Connect your tools to automatically sync audit packs, send notifications, and more.
      </p>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Email mailboxes</h2>
        <p className="text-sm text-muted-foreground">
          Ingest client email as compliance evidence — read-only, and only the labels
          and date range you select. After connecting, choose labels and run a Backfill
          so threads appear under Communications.
        </p>
        <div className="rounded-lg border p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">Gmail</p>
            <p className="text-sm text-muted-foreground">
              Read-only Gmail ingestion (selected labels only)
            </p>
          </div>
          <Button asChild variant={hasGmailMail ? "outline" : "default"}>
            <Link href="/integrations/gmail-mail">
              {hasGmailMail ? "Manage mailbox" : "Connect"}
            </Link>
          </Button>
        </div>
        <div className="rounded-lg border p-4 flex items-center justify-between">
          <div>
            <p className="font-medium">Microsoft 365 Mail</p>
            <p className="text-sm text-muted-foreground">
              Read-only Outlook / Exchange ingestion (selected folders only)
            </p>
          </div>
          <Button asChild variant={hasM365Mail ? "outline" : "default"}>
            <Link href="/integrations/m365-mail">
              {hasM365Mail ? "Manage mailbox" : "Connect"}
            </Link>
          </Button>
        </div>
      </div>

      {zoomConnected && zoomEmail && (
        <div className="rounded-lg border border-success-border bg-success-bg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success-text shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-success-text">Zoom connected successfully</p>
            <p className="text-sm text-success-text mt-1">
              Your Zoom account ({zoomEmail}) is now connected. Meeting recordings will automatically sync to ComplyVault.
            </p>
          </div>
        </div>
      )}

      {teamsConnected && teamsEmail && (
        <div className="rounded-lg border border-success-border bg-success-bg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success-text shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-success-text">Microsoft Teams connected successfully</p>
            <p className="text-sm text-success-text mt-1">
              Your Teams account ({teamsEmail}) is now connected. Meeting recordings will automatically sync to ComplyVault.
            </p>
          </div>
        </div>
      )}

      {teamsError && (
        <div className="rounded-lg border border-danger-border bg-danger-bg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger-text shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger-text">Teams connection failed</p>
            <p className="text-sm text-danger-text mt-1">
              {teamsErrorDescription ?? "Please try again."}
            </p>
          </div>
        </div>
      )}

      {zoomError && (
        <div className="rounded-lg border border-danger-border bg-danger-bg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger-text shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger-text">Zoom connection failed</p>
            <p className="text-sm text-danger-text mt-1">
              {zoomErrorDescription || zoomError === "access_denied"
                ? "You denied access or cancelled the connection."
                : zoomError === "invalid_callback"
                  ? "Invalid or expired connection request. Please try again."
                  : zoomErrorDescription ?? "Please try again."}
            </p>
          </div>
        </div>
      )}

      {sharepointConnected && sharepointEmail && (
        <div className="rounded-lg border border-success-border bg-success-bg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success-text shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-success-text">SharePoint / OneDrive connected</p>
            <p className="text-sm text-success-text mt-1">
              {sharepointEmail} — finalized audit packs can be filed automatically under your root folder
              (see below).
            </p>
          </div>
        </div>
      )}

      {sharepointError && (
        <div className="rounded-lg border border-danger-border bg-danger-bg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger-text shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger-text">SharePoint connection failed</p>
            <p className="text-sm text-danger-text mt-1">
              {sharepointErrorDescription ?? "Please try again. Ensure the Azure app has Files.ReadWrite.All and Sites.ReadWrite.All (delegated) with admin consent."}
            </p>
          </div>
        </div>
      )}

      {zohoCrmConnected && zohoCrmAccount && (
        <div className="rounded-lg border border-success-border bg-success-bg p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-success-text shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-success-text">Zoho CRM connected</p>
            <p className="text-sm text-success-text mt-1">
              {zohoCrmAccount} — notes sync when a meeting reaches draft-ready (match Contact by client name
              or set Contact ID on the meeting).
            </p>
          </div>
        </div>
      )}

      {zohoCrmError && (
        <div className="rounded-lg border border-danger-border bg-danger-bg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-danger-text shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-danger-text">Zoho CRM connection failed</p>
            <p className="text-sm text-danger-text mt-1">
              {zohoCrmErrorDescription ??
                "Check Zoho API Console redirect URI, client id/secret, and CRM scopes (Contacts read, Notes create)."}
            </p>
          </div>
        </div>
      )}

      {integrations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No integrations connected yet.</p>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Integration connections (Zoom, Teams, SharePoint, etc.) will appear here once configured.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <StatefulButton
              onClick={handleConnectZoom}
              state={pendingButtonState(connectLoading)}
              loadingText="Redirecting…"
              size="lg"
              disabled={connectLoading}
            >
              Connect Zoom
            </StatefulButton>
            <StatefulButton
              onClick={handleConnectTeams}
              state={pendingButtonState(connectLoading)}
              loadingText="Redirecting…"
              variant="outline"
              size="lg"
              disabled={connectLoading}
            >
              Connect Teams
            </StatefulButton>
            <StatefulButton
              onClick={handleConnectSharePoint}
              state={pendingButtonState(connectLoading)}
              loadingText="Redirecting…"
              variant="outline"
              size="lg"
              disabled={connectLoading}
            >
              Connect SharePoint
            </StatefulButton>
            <StatefulButton
              onClick={handleConnectZohoCrm}
              state={pendingButtonState(connectLoading)}
              loadingText="Redirecting…"
              variant="outline"
              size="lg"
              disabled={connectLoading}
            >
              Connect Zoho CRM
            </StatefulButton>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {!hasZoom && (
            <div className="rounded-lg border p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Zoom</p>
                <p className="text-sm text-muted-foreground">
                  Auto-sync meeting recordings to ComplyVault
                </p>
              </div>
              <StatefulButton
                onClick={handleConnectZoom}
                state={pendingButtonState(connectLoading)}
                loadingText="Redirecting…"
                disabled={connectLoading}
              >
                Connect
              </StatefulButton>
            </div>
          )}
          {!hasTeams && (
            <div className="rounded-lg border p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Microsoft Teams</p>
                <p className="text-sm text-muted-foreground">
                  Auto-sync Teams meeting recordings to ComplyVault
                </p>
              </div>
              <StatefulButton
                onClick={handleConnectTeams}
                state={pendingButtonState(connectLoading)}
                loadingText="Redirecting…"
                variant="outline"
                disabled={connectLoading}
              >
                Connect
              </StatefulButton>
            </div>
          )}
          {!hasSharePoint && (
            <div className="rounded-lg border p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">SharePoint / OneDrive</p>
                <p className="text-sm text-muted-foreground">
                  File finalized audit packs under ComplyVault/AuditPacks/Year/Month on your default drive
                </p>
              </div>
              <StatefulButton
                onClick={handleConnectSharePoint}
                state={pendingButtonState(connectLoading)}
                loadingText="Redirecting…"
                variant="outline"
                disabled={connectLoading}
              >
                Connect
              </StatefulButton>
            </div>
          )}
          {!hasZohoCrm && (
            <div className="rounded-lg border p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">Zoho CRM</p>
                <p className="text-sm text-muted-foreground">
                  Add a note to the matched Contact when an audit pack is ready for review
                </p>
              </div>
              <StatefulButton
                onClick={handleConnectZohoCrm}
                state={pendingButtonState(connectLoading)}
                loadingText="Redirecting…"
                variant="outline"
                disabled={connectLoading}
              >
                Connect
              </StatefulButton>
            </div>
          )}
          {integrations.filter((int) => !MAIL_PROVIDERS.has(int.provider)).map((int) => (
            <div key={int.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium flex items-center gap-2">
                    {PROVIDER_LABELS[int.provider] ?? int.provider}
                    {int.provider === "TEAMS" && (
                      <a
                        href="/integrations/teams/manifest"
                        className="text-xs text-primary hover:underline"
                      >
                        Teams App manifest
                      </a>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {int.accountEmail ? `${int.accountEmail} • ` : ""}
                    Connected {new Date(int.connectedAt).toLocaleDateString()}
                    {int.lastSyncAt &&
                      ` • Last sync: ${new Date(int.lastSyncAt).toLocaleString()}`}
                  </p>
                  {int.lastErrorMessage && (
                    <p className="text-sm text-danger-text mt-1">{int.lastErrorMessage}</p>
                  )}
                  {int.provider === "ZOOM" &&
                    zoomRecordingListScopesLikelyMissing(int.oauthScopes ?? null) && (
                      <div className="mt-3 rounded-md border border-warning-border bg-warning-bg p-3 text-sm text-warning-text">
                        <p className="font-medium">
                          {zoomHasBaseListUserRecordingsOnly(int.oauthScopes ?? null)
                            ? "Zoom listing scope present — elevate tier for List recordings API"
                            : "Zoom recording scopes look incomplete"}
                        </p>
                        <p className="mt-1 text-warning-text/90">
                          {zoomHasBaseListUserRecordingsOnly(int.oauthScopes ?? null) ? (
                            <>
                              Zoom issued{" "}
                              <code className="rounded bg-warning-bg/80 px-1">
                                cloud_recording:read:list_user_recordings
                              </code>{" "}
                              and related recording scopes, but{" "}
                              <code className="rounded bg-warning-bg/80 px-1">
                                GET /users/…/recordings
                              </code>{" "}
                              often returns error 4711 until the token also includes{" "}
                              <code className="rounded bg-warning-bg/80 px-1">
                                cloud_recording:read:list_user_recordings:admin
                              </code>
                              ,{" "}
                              <code className="rounded bg-warning-bg/80 px-1">
                                cloud_recording:read:list_user_recordings:master
                              </code>
                              , or classic{" "}
                              <code className="rounded bg-warning-bg/80 px-1">recording:read</code>{" "}
                              (when Zoom exposes it). Search those IDs under Add Scopes; if{" "}
                              <code className="rounded bg-warning-bg/80 px-1">:admin</code> never
                              appears, switch this General app to{" "}
                              <strong>Admin-managed</strong> (Basic Information) or contact Zoom
                              support — user-managed apps sometimes cannot obtain{" "}
                              <code className="rounded bg-warning-bg/80 px-1">:admin</code>.
                            </>
                          ) : (
                            <>
                              Sync may fail with error 4711 until Zoom puts{" "}
                              <code className="rounded bg-warning-bg/80 px-1">
                                list_user_recordings:admin
                              </code>{" "}
                              or{" "}
                              <code className="rounded bg-warning-bg/80 px-1">
                                list_user_recordings:master
                              </code>{" "}
                              (or classic{" "}
                              <code className="rounded bg-warning-bg/80 px-1">recording:read</code>)
                              on the access token. Match Development vs Production in the Marketplace
                              with your Vercel{" "}
                              <code className="rounded bg-warning-bg/80 px-1">ZOOM_CLIENT_ID</code>,
                              then Disconnect → Connect Zoom.
                            </>
                          )}
                        </p>
                        {int.oauthScopes != null && int.oauthScopes.length > 0 ? (
                          <p className="mt-2 break-all font-mono text-xs text-warning-text/80">
                            Granted scopes on token: {int.oauthScopes}
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-warning-text/80">
                            No scope string stored yet — reconnect Zoom after deploying the latest app
                            version.
                          </p>
                        )}
                      </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      STATUS_STYLES[int.status] ?? "bg-surface-muted text-text-secondary"
                    }`}
                  >
                    {STATUS_LABELS[int.status] ?? int.status.replace(/_/g, " ")}
                  </span>
                  {int.provider === "ZOOM" && (
                    <StatefulButton
                      variant="outline"
                      size="sm"
                      state={pendingButtonState(loading === `sync-${int.id}`)}
                      loadingText="Syncing…"
                      onClick={async () => {
                        setLoading(`sync-${int.id}`);
                        try {
                          const res = await fetch(
                            `/api/workspaces/${workspaceId}/integrations/zoom/sync`,
                            { method: "POST" }
                          );
                          const data = (await res.json()) as {
                            success?: boolean;
                            enqueued?: number;
                            message?: string;
                            error?: string;
                            zoomMessage?: string;
                            zoomHint?: string;
                            zoomCode?: number;
                          };
                          if (res.ok && data.success) {
                            toast.success(data.message ?? `${data.enqueued ?? 0} recording(s) queued.`);
                            router.refresh();
                          } else {
                            const is4711 = data.zoomCode === 4711;
                            const detail =
                              data.zoomMessage != null &&
                              data.zoomMessage.length > 0 &&
                              !(is4711 && data.zoomHint)
                                ? `: ${data.zoomMessage}`
                                : "";
                            const hint =
                              data.zoomHint != null && data.zoomHint.length > 0
                                ? ` ${data.zoomHint}`
                                : "";
                            toast.error((data.error ?? "Sync failed") + detail + hint);
                          }
                        } catch {
                          toast.error("Sync failed");
                        } finally {
                          setLoading(null);
                        }
                      }}
                      disabled={loading !== null && loading !== `sync-${int.id}`}
                    >
                      Sync from Zoom
                    </StatefulButton>
                  )}
                  <StatefulButton
                    variant="outline"
                    size="sm"
                    state={pendingButtonState(loading === int.id)}
                    loadingText="Disconnecting…"
                    onClick={() => handleDisconnect(int.id)}
                    disabled={loading !== null}
                  >
                    Disconnect
                  </StatefulButton>
                </div>
              </div>
              {int.provider === "SHAREPOINT" && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <span className="text-sm text-muted-foreground">Root folder (under your default drive):</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Input
                      className="w-56 max-w-full"
                      defaultValue={int.rootFolder ?? "ComplyVault"}
                      onBlur={async (e) => {
                        const v = e.target.value.trim() || "ComplyVault";
                        const res = await fetch(
                          `/api/workspaces/${workspaceId}/integrations/sharepoint/config`,
                          {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ rootFolder: v }),
                          }
                        );
                        if (res.ok) {
                          toast.success("SharePoint path updated");
                          router.refresh();
                        } else {
                          const err = (await res.json()) as { error?: string };
                          toast.error(err.error ?? "Update failed");
                        }
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      → {`{root}/AuditPacks/YYYY/MM/`}
                    </span>
                  </div>
                </div>
              )}
              {int.provider === "ZOOM" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Recording scope:</span>
                  <Select
                    value={int.recordingScope ?? "all"}
                    onValueChange={async (v) => {
                      const res = await fetch(
                        `/api/workspaces/${workspaceId}/integrations/zoom/scope`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ recordingScope: v }),
                        }
                      );
                      if (res.ok) router.refresh();
                    }}
                  >
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All meetings</SelectItem>
                      <SelectItem value="external_only">
                        External participants only
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="text-sm text-info-text hover:underline"
                  onClick={() => toggleFailures(int.id)}
                >
                  {expandedFailures === int.id ? "Hide" : "View"} failed syncs
                </button>
                {int.provider === "ZOHO_CRM" && (
                  <Link
                    href="/integrations/zoho"
                    className="text-sm text-info-text hover:underline"
                  >
                    View tasks &amp; meetings →
                  </Link>
                )}
                {expandedFailures === int.id && (
                  <div className="mt-2 rounded border bg-muted/50 p-3 text-sm">
                    {(failures[int.id] ?? []).length === 0 ? (
                      <p className="text-muted-foreground">No failed syncs in the last 10.</p>
                    ) : (
                      <ul className="space-y-2">
                        {(failures[int.id] ?? []).map((f) => (
                          <li key={f.id} className="border-b pb-2 last:border-0">
                            <span className="text-muted-foreground">
                              {f.meetingId ? `Meeting ${f.meetingId.slice(0, 8)}…` : "N/A"} • {f.action} • {new Date(f.createdAt).toLocaleString()}
                            </span>
                            {f.errorMessage && (
                              <p className="text-danger-text mt-1">{f.errorMessage}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
