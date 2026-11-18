"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { parseBillingIntent } from "~/lib/billing-intent";

export default function NewWorkspacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { intent, currency, onboarding } = parseBillingIntent(searchParams);
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          name,
          intent: intent || undefined,
          currency: currency || undefined,
          onboarding: onboarding || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create workspace");
      }

      const data = await response.json();
      
      setSuccess(data.message || "Workspace created successfully! Redirecting...");
      setTimeout(() => {
        window.location.href = "/onboarding";
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const intentLabel =
    intent === "solo" ? "Solo" : intent === "team" ? "Team" : "Free Trial";
  const trialCopy =
    intent === "solo"
      ? "You selected the Solo plan. Create your workspace to continue."
      : intent === "team"
      ? "You selected the Team plan. Create your workspace to continue."
      : "Start your 7-day free trial.";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Your {intentLabel} Workspace</CardTitle>
          <CardDescription>
            Set up your firm&apos;s compliance documentation system. {trialCopy}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Workspace Name</Label>
              <Input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder='e.g., "Smith Financial Advisors"'
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                This will be your firm&apos;s workspace name
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="w-full"
              >
                {isLoading ? "Creating..." : `Create ${intentLabel} Workspace`}
              </Button>
              {intent === "trial" && (
                <p className="text-xs text-center text-muted-foreground">
                  By creating a workspace, you agree to start your 7-day trial.
                </p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}


