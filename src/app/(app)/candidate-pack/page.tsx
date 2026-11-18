import { redirect } from "next/navigation";
import { isRelease1DemoEnabled } from "~/lib/feature-flags";
import { requireAppAccess } from "~/server/auth/guards";
import { getInboundDocumentRequest } from "~/server/document-request/get-inbound";
import { CandidatePackClient } from "./candidate-pack-client";

export default async function CandidatePackPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}): Promise<React.JSX.Element> {
  if (!isRelease1DemoEnabled()) redirect("/dashboard");

  const access = await requireAppAccess();
  if (!access.ok) {
    if (access.status === 401) redirect("/auth/signin");
    return <div className="p-6 text-destructive">{access.error}</div>;
  }
  if (access.session.user.role !== "OWNER_CCO") redirect("/dashboard");

  const params = await searchParams;
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  let initialRequestText = "";
  let letterTitle: string | null = null;
  if (from === "letter") {
    const letter = await getInboundDocumentRequest(access.workspaceId);
    if (letter) {
      initialRequestText = letter.requestItemText;
      letterTitle = letter.title;
    }
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <header className="mb-6 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Candidate Pack</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Confirm the interpreted scope, review candidate evidence, acknowledge
          gaps, then approve — attestation is written to the audit log.
        </p>
        {letterTitle ? (
          <p className="mt-2 text-sm text-text-primary">
            From inbound letter: {letterTitle}
          </p>
        ) : null}
      </header>
      <CandidatePackClient initialRequestText={initialRequestText} />
    </main>
  );
}
