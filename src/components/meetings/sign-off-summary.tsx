import { Award, Check, Clock, Scale, ShieldCheck, User } from "lucide-react";
import { cn } from "~/lib/utils";
import { ADVISOR_SIGNOFF_ATTESTATION, CCO_SIGNOFF_ATTESTATION } from "~/lib/meeting-signoff-copy";

export type SignOffSummaryRow = {
  role: "advisor" | "cm" | "cco";
  name: string;
  subtitle: string;
  attestationLine: string;
  completedAt: Date;
};

function roleStyles(role: SignOffSummaryRow["role"]): {
  iconWrap: string;
  icon: string;
  subtitle: string;
} {
  switch (role) {
    case "advisor":
      return {
        iconWrap: "bg-brand-light text-brand",
        icon: "text-brand",
        subtitle: "text-brand",
      };
    case "cm":
      return {
        iconWrap: "bg-info-bg text-semantic-info",
        icon: "text-semantic-info",
        subtitle: "text-semantic-info",
      };
    case "cco":
      return {
        iconWrap: "bg-warning-bg text-semantic-warning",
        icon: "text-semantic-warning",
        subtitle: "text-semantic-warning",
      };
  }
}

function RoleIcon({ role }: { role: SignOffSummaryRow["role"] }): React.ReactElement {
  const s = roleStyles(role);
  const iconCls = cn("h-4 w-4", s.icon);
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full sm:h-[36px] sm:w-[36px]",
        s.iconWrap,
      )}
      aria-hidden
    >
      {role === "advisor" ? (
        <User className={iconCls} strokeWidth={2} />
      ) : role === "cm" ? (
        <ShieldCheck className={iconCls} strokeWidth={2} />
      ) : (
        <Scale className={iconCls} strokeWidth={2} />
      )}
    </div>
  );
}

function SignOffRowView({ row }: { row: SignOffSummaryRow }): React.ReactElement {
  const s = roleStyles(row.role);
  return (
    <div className="flex gap-4 py-3.5 first:pt-0 last:pb-0">
      <RoleIcon role={row.role} />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-[14px] font-medium leading-snug text-foreground">{row.name}</p>
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-light text-brand"
            aria-hidden
          >
            <Check className="h-3 w-3" strokeWidth={2.5} />
          </span>
        </div>
        <p className={cn("text-[12px] font-normal", s.subtitle)}>{row.subtitle}</p>
        <p className="text-[12px] italic leading-relaxed text-muted-foreground">{row.attestationLine}</p>
        <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Clock className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
          <time dateTime={row.completedAt.toISOString()}>
            {row.completedAt.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </time>
        </p>
      </div>
    </div>
  );
}

export function SignOffSummary({ rows }: { rows: SignOffSummaryRow[] }): React.ReactElement | null {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-labelledby="sign-off-summary-heading">
      <h3
        id="sign-off-summary-heading"
        className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground"
      >
        <Award className="h-[15px] w-[15px] shrink-0 text-muted-foreground" aria-hidden />
        Sign-off summary
      </h3>
      <div className="rounded-xl border border-border bg-card px-5 py-1 shadow-sm">
        {rows.map((row, i) => (
          <div key={`${row.role}-${row.completedAt.toISOString()}`}>
            {i > 0 ? <div className="h-px bg-border" role="separator" /> : null}
            <SignOffRowView row={row} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function buildSignOffRowsFromMeeting(input: {
  workspaceName: string;
  advisorName: string | null;
  advisorCertifiedAt: Date | null;
  cmName: string | null;
  cmReviewedAt: Date | null;
  cmReviewSummary: { resolved: number; noted: number; escalated: number } | null;
  ccoName: string | null;
  ccoSignedOffAt: Date | null;
}): SignOffSummaryRow[] {
  const rows: SignOffSummaryRow[] = [];

  if (input.advisorCertifiedAt && input.advisorName) {
    rows.push({
      role: "advisor",
      name: input.advisorName,
      subtitle: `Advisor · ${input.workspaceName}`,
      attestationLine: ADVISOR_SIGNOFF_ATTESTATION,
      completedAt: input.advisorCertifiedAt,
    });
  }

  if (input.cmReviewedAt && input.cmName && input.cmReviewSummary) {
    const { resolved, noted, escalated } = input.cmReviewSummary;
    const total = resolved + noted + escalated;
    rows.push({
      role: "cm",
      name: input.cmName,
      subtitle: "Compliance manager",
      attestationLine: `${total} flags reviewed: ${resolved} resolved${noted > 0 ? `, ${noted} noted` : ""}${
        escalated > 0 ? `, ${escalated} escalated to CCO` : ""
      }`,
      completedAt: input.cmReviewedAt,
    });
  }

  if (input.ccoSignedOffAt && input.ccoName) {
    rows.push({
      role: "cco",
      name: input.ccoName,
      subtitle: `Chief compliance officer · ${input.workspaceName}`,
      attestationLine: CCO_SIGNOFF_ATTESTATION,
      completedAt: input.ccoSignedOffAt,
    });
  }

  return rows;
}
