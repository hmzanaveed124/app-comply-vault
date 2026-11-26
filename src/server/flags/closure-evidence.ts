type Evidence = { type: string; url?: string | null; metadata?: unknown };
type RecordForClosure = {
  resolutionType: string;
  metadata?: unknown;
  tasks: Array<{ required: boolean; status: string }>;
  evidence: Evidence[];
};
export function hasSubstantiveEvidence(item: Evidence): boolean {
  if (
    ["DOCUMENT_LINK", "OUTREACH_PROOF", "ACKNOWLEDGEMENT"].includes(item.type)
  )
    return !!item.url && /^https?:\/\//.test(item.url);
  const data = item.metadata as {
    startTime?: unknown;
    snippet?: unknown;
    text?: unknown;
  } | null;
  return (
    item.type === "TRANSCRIPT_SNIPPET" &&
    typeof data?.startTime === "number" &&
    data.startTime >= 0 &&
    typeof (data.snippet ?? data.text) === "string" &&
    String(data.snippet ?? data.text).trim().length > 0
  );
}
export function remediationReadinessError(
  record: RecordForClosure,
): string | null {
  if (record.tasks.some((task) => task.required && task.status !== "COMPLETED"))
    return "Complete every required task before verification.";
  const evidence = record.evidence.filter(hasSubstantiveEvidence);
  const requiredType = (
    {
      ADD_CONTEXT: "TRANSCRIPT_SNIPPET",
      DISCLOSED_ELSEWHERE: "DOCUMENT_LINK",
      FOLLOW_UP_REQUIRED: "OUTREACH_PROOF",
    } as Record<string, string>
  )[record.resolutionType];
  if (requiredType && !evidence.some((item) => item.type === requiredType))
    return `Retrievable ${requiredType.toLowerCase().replaceAll("_", " ")} evidence is required before verification.`;
  if (!evidence.length)
    return "Supporting evidence is required before verification.";
  const metadata = record.metadata as {
    requireAcknowledgement?: boolean;
  } | null;
  if (
    metadata?.requireAcknowledgement &&
    !evidence.some((item) => item.type === "ACKNOWLEDGEMENT")
  )
    return "Acknowledgement evidence is required before verification.";
  return null;
}
