"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

type SuccessClientProps = {
  workspaceId: string;
  plan: string | null;
  onboardingType: string;
};

export default function SuccessClient({ workspaceId }: SuccessClientProps) {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your subscription...");

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 12;
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/billing/status?workspaceId=${workspaceId}`,
        );
        if (!response.ok) {
          throw new Error("Failed to check billing status");
        }
        const data = await response.json();
        if (data.billingStatus === "ACTIVE") {
          router.replace("/onboarding");
          return;
        }
        setMessage("Finalizing your subscription details...");
      } catch (error) {
        setMessage("Still confirming your subscription...");
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        router.replace("/welcome");
        return;
      }
      setTimeout(poll, 2500);
    };

    poll();
    return () => {
      attempts = maxAttempts;
    };
  }, [router, workspaceId]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Payment received</CardTitle>
          <CardDescription>
            We&apos;re activating your workspace. This usually takes a few
            seconds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
