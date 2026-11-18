"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Label } from "~/components/ui/label";

type WelcomeProps = {
  workspace: {
    id: string;
    name: string;
    billingStatus: string;
    planTier: string;
    billingCurrency: string;
    onboardingType: string | null;
    trialEndsAt: string | null;
  };
  entitlements: {
    maxUsers: number;
    maxUploadsPerPeriod: number;
    allowApiAccess: boolean;
    allowZipExport: boolean;
    exportsWatermarked: boolean;
  };
  usage: {
    uploadsUsed: number;
    membersCount: number;
  };
  trialExpired: boolean;
  trialDaysRemaining: number | null;
};

export default function WelcomeClient({
  workspace,
  entitlements,
  usage,
  trialExpired,
  trialDaysRemaining,
}: WelcomeProps) {
  const [currency, setCurrency] = useState(workspace.billingCurrency);
  const initialOnboarding =
    workspace.onboardingType?.toLowerCase() === "standard" ||
    workspace.onboardingType?.toLowerCase() === "premium"
      ? workspace.onboardingType.toLowerCase()
      : "none";
  const [onboarding, setOnboarding] = useState(initialOnboarding);
  const initialPlan = workspace.planTier === "TEAM" ? "TEAM" : "SOLO";
  const [plan, setPlan] = useState<"SOLO" | "TEAM">(initialPlan);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId: workspace.id,
          plan,
          currency,
          onboarding: onboarding.toUpperCase(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to start checkout");
      }

      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error("Checkout error:", error);
      alert(error instanceof Error ? error.message : "Failed to start checkout");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Plan and usage</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {workspace.billingStatus === "TRIALING"
            ? `Trial workspace for ${workspace.name}`
            : `Workspace: ${workspace.name}`}
        </p>
      </div>

      <Button asChild><a href="/onboarding">Continue workspace setup</a></Button>

      {workspace.billingStatus === "TRIALING" ? (
        <Card>
          <CardHeader>
            <CardTitle>Trial status</CardTitle>
            <CardDescription>
              {trialExpired
                ? "Trial expired — upgrade to continue using paid features."
                : `Trial active — ${trialDaysRemaining ?? 0} day(s) remaining.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Uploads: {usage.uploadsUsed}/{entitlements.maxUploadsPerPeriod}
              </Badge>
              <Badge variant="outline">Members: {usage.membersCount}/{entitlements.maxUsers}</Badge>
              {entitlements.exportsWatermarked && (
                <Badge variant="secondary">Exports watermarked</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Exports are watermarked during trial.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Plan overview</CardTitle>
            <CardDescription>
              {workspace.planTier === "TEAM"
                ? "Team plan"
                : workspace.planTier === "FREE"
                  ? "Free Trial"
                  : "Solo plan"}{" "}
              for {workspace.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">
                Uploads: {usage.uploadsUsed}/{entitlements.maxUploadsPerPeriod}
              </Badge>
              <Badge variant="outline">Members: {usage.membersCount}/{entitlements.maxUsers}</Badge>
              {!entitlements.exportsWatermarked && (
                <Badge variant="secondary">Exports full access</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {workspace.billingStatus === "ACTIVE" ? (
        <Card>
          <CardHeader>
            <CardTitle>Workspace active</CardTitle>
            <CardDescription>Your subscription is active.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = "/interaction-log")}>
              Open interaction log
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
