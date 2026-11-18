/**
 * Epic 1 Story 1.6: Teams App Manifest — Generate, View, Check Status
 */

import { requireAppAccess } from "~/server/auth/guards";
import { db } from "~/server/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { ArrowLeft, CheckCircle2, Download, FileJson, AlertCircle } from "lucide-react";
import { TeamsManifestClient } from "./teams-manifest-client";

export default async function TeamsManifestPage() {
  const access = await requireAppAccess();
  if (!access.ok) {
    if (access.status === 401) redirect("/auth/signin");
    return (
      <div className="p-6">
        <p className="text-destructive">{access.error}</p>
      </div>
    );
  }
  if (access.session.user.role !== "OWNER_CCO") {
    return (
      <div className="p-6">
        <p className="text-destructive">Only workspace owners can access Teams App manifest.</p>
      </div>
    );
  }

  const teamsCredential = await db.integrationCredential.findUnique({
    where: {
      workspaceId_provider: { workspaceId: access.workspaceId, provider: "TEAMS" },
    },
  });
  const teamsConfig = await db.integrationConfig.findUnique({
    where: {
      workspaceId_provider: { workspaceId: access.workspaceId, provider: "TEAMS" },
    },
  });
  const teamsConnected = !!teamsCredential;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "https://app.complyvault.co";
  const configUrl = `${appUrl.replace(/\/$/, "")}/teams/config`;
  const sidepanelUrl = `${appUrl.replace(/\/$/, "")}/teams/sidepanel`;

  return (
    <div className="p-6 max-w-3xl">
      <Link
        href="/integrations"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Integrations
      </Link>

      <h1 className="text-2xl font-semibold mb-2">Teams App Manifest</h1>
      <p className="text-muted-foreground mb-8">
        Install ComplyVault in your Teams meetings to generate audit packs, view the last pack, or
        check status without leaving Teams.
      </p>

      <div className="space-y-6">
        {/* Check Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Check Status
            </CardTitle>
            <CardDescription>
              Verify your Teams integration and manifest configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {teamsConnected ? (
                <CheckCircle2 className="h-5 w-5 text-success-text" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning-text" />
              )}
              <div>
                <p className="font-medium">
                  Teams {teamsConnected ? "Connected" : "Not Connected"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {teamsConnected
                    ? "Your workspace has Teams linked. The app will use your existing connection."
                    : "Connect Teams in Integrations first to use the meeting app."}
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
              <p className="font-medium">App URLs (from environment)</p>
              <p className="text-muted-foreground break-all">Config: {configUrl}</p>
              <p className="text-muted-foreground break-all">Sidepanel: {sidepanelUrl}</p>
            </div>
          </CardContent>
        </Card>

        {/* Generate / View */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Generate & View Manifest
            </CardTitle>
            <CardDescription>
              Download the manifest JSON to sideload ComplyVault into Teams (Admin center or
              Developer Portal)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamsManifestClient />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Installation</CardTitle>
            <CardDescription>How to add ComplyVault to your Teams meetings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ol className="list-decimal list-inside space-y-2">
              <li>Download the manifest using the button above</li>
              <li>
                Add <code className="rounded bg-muted px-1">color.png</code> and{" "}
                <code className="rounded bg-muted px-1">outline.png</code> (192×192 and 32×32) to
                the same folder
              </li>
              <li>
                In Teams Admin Center or{" "}
                <a
                  href="https://dev.teams.microsoft.com/apps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Developer Portal
                </a>
                , upload the manifest as a custom app
              </li>
              <li>Install the app for your org or specific teams</li>
              <li>In a meeting, open the Apps panel and add ComplyVault</li>
            </ol>
            <p className="text-muted-foreground">
              The sidepanel will show: <strong>Generate Audit Pack</strong>,{" "}
              <strong>View Last Audit Pack</strong>, and <strong>Check Status</strong>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
