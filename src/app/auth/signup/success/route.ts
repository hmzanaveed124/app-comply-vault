import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { stripe } from "~/server/stripe";
import { getOnboardingTypeFromLineItems, getPlanFromLineItems } from "~/server/billing/stripe-utils";

const successSchema = z.object({
  session_id: z.string().min(1),
  intent: z.enum(["solo", "team", "onboarding"]).optional(),
  currency: z.enum(["USD", "GBP"]).optional(),
});

const normalizeCurrency = (currency?: string | null) =>
  currency ? currency.toUpperCase() : undefined;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = successSchema.safeParse({
    session_id: url.searchParams.get("session_id"),
    intent: url.searchParams.get("intent") ?? undefined,
    currency: url.searchParams.get("currency") ?? undefined,
  });

  if (!parsed.success) {
    redirect("/auth/signin");
  }

  const { session_id, intent, currency } = parsed.data;

  let plan: "SOLO" | "TEAM" | null =
    intent === "solo" ? "SOLO" : intent === "team" ? "TEAM" : null;
  let onboarding: "STANDARD" | "PREMIUM" | null = null;
  let detectedCurrency: "USD" | "GBP" | undefined = currency;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    const lineItems = await stripe.checkout.sessions.listLineItems(session_id, { limit: 100 });
    if (!plan) {
      plan = getPlanFromLineItems(lineItems);
    }
    onboarding = getOnboardingTypeFromLineItems(lineItems);
    if (!detectedCurrency && session.currency) {
      detectedCurrency = normalizeCurrency(session.currency) as "USD" | "GBP";
    }

    const payload = {
      sessionId: session_id,
      plan,
      currency: detectedCurrency,
      onboarding,
    };
    const cookieValue = encodeURIComponent(JSON.stringify(payload));
    (await cookies()).set("cv_checkout_context", cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 30,
    });
  } catch (error) {
    console.error("Failed to fetch checkout session:", error);
  }

  const redirectParams = new URLSearchParams();
  if (plan) {
    redirectParams.set("intent", plan.toLowerCase());
  }
  if (detectedCurrency) {
    redirectParams.set("currency", detectedCurrency);
  }
  if (onboarding) {
    redirectParams.set("onboarding", onboarding.toLowerCase());
  }

  const query = redirectParams.toString();
  redirect(`/onboarding${query ? `?${query}` : ""}`);
}
