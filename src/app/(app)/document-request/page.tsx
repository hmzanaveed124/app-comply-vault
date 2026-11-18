import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { isRelease1DemoEnabled } from "~/lib/feature-flags";
import { requireAppAccess } from "~/server/auth/guards";
import { getInboundDocumentRequest } from "~/server/document-request/get-inbound";

export default async function DocumentRequestPage(): Promise<React.JSX.Element> {
  if (!isRelease1DemoEnabled()) redirect("/dashboard");

  const access = await requireAppAccess();
  if (!access.ok) {
    if (access.status === 401) redirect("/auth/signin");
    return <div className="p-6 text-destructive">{access.error}</div>;
  }
  if (access.session.user.role !== "OWNER_CCO") redirect("/dashboard");

  const letter = await getInboundDocumentRequest(access.workspaceId);
  if (!letter) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Document request</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No inbound document-request letter is on file for this workspace.
        </p>
        <Button asChild className="mt-6" variant="outline">
          <Link href="/candidate-pack">Open Candidate Pack</Link>
        </Button>
      </main>
    );
  }

  const hashShort = `${letter.contentSha256.slice(0, 12)}…`;

  return (
    <main className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--cv-brand-glow),_transparent_55%),linear-gradient(180deg,var(--cv-surface-page)_0%,var(--cv-surface-card)_100%)]"
      />
      <div className="relative mx-auto max-w-3xl px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Inbound · {letter.arrivedLabel}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">
          {letter.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-normal">
            Document request
          </Badge>
          <span className="font-mono text-xs text-muted-foreground" title={letter.contentSha256}>
            {hashShort}
          </span>
        </div>

        <article className="mt-8 border border-text-primary/10 bg-surface-muted px-8 py-10 shadow-[0_24px_60px_-40px_rgba(13,40,24,0.45)] sm:px-12">
          <pre className="whitespace-pre-wrap font-serif text-[15px] leading-7 text-text-primary">
            {letter.body}
          </pre>
        </article>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild className="bg-surface-strong hover:bg-surface-strong/90">
            <Link href="/candidate-pack?from=letter">Assemble Candidate Pack</Link>
          </Button>
          <p className="text-sm text-muted-foreground">
            Confirm scope → candidate evidence → coverage and gaps → approval.
          </p>
        </div>
      </div>
    </main>
  );
}
