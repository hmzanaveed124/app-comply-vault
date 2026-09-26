import { Resend } from "resend";
import type { AssessmentAnswers, AssessmentResultSummary } from "./types";
import { buildDetailedReviewEmail } from "./detailed-review";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

type LeadEmailInput = {
  email: string;
  firmName?: string;
  role?: string;
  assessmentId: string;
  answers: AssessmentAnswers;
  result: AssessmentResultSummary;
  attribution?: {
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
  };
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendDetailedStackReviewEmail(
  input: LeadEmailInput,
): Promise<{ success: boolean; id?: string }> {
  const from = process.env.EMAIL_FROM || "noreply@complyvault.co";
  const content = buildDetailedReviewEmail({
    answers: input.answers,
    result: input.result,
    firmName: input.firmName,
  });

  const payload = {
    from,
    to: input.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  };

  if (!resend) {
    console.log("📧 [DEV MODE] Detailed stack review email would be sent");
    console.log("Subject:", payload.subject);
    return { success: true, id: "dev-mode" };
  }

  try {
    const result = await resend.emails.send(payload);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return { success: true, id: result.data?.id || "sent" };
  } catch (error) {
    console.error("Error sending detailed stack review email");
    return { success: false };
  }
}

export async function sendStackAssessmentLeadNotification(
  input: LeadEmailInput,
): Promise<{ success: boolean }> {
  const notificationEmail =
    process.env.ASSESSMENT_NOTIFICATION_EMAIL ||
    process.env.TRIAL_NOTIFICATION_EMAIL ||
    "support@complyvault.com";
  const from = process.env.EMAIL_FROM || "noreply@complyvault.co";
  const source =
    [input.attribution?.utmSource, input.attribution?.utmMedium, input.attribution?.utmCampaign]
      .filter(Boolean)
      .join(" / ") || "direct / unknown";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; line-height: 1.6;">
      <h2>New Stack Assessment Lead</h2>
      <div style="background:#f3f4f6;padding:16px;border-radius:8px;">
        <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
        ${input.firmName ? `<p><strong>Firm:</strong> ${escapeHtml(input.firmName)}</p>` : ""}
        ${input.role ? `<p><strong>Role:</strong> ${escapeHtml(input.role)}</p>` : ""}
        <p><strong>Assessment ID:</strong> ${escapeHtml(input.assessmentId)}</p>
        <p><strong>Score:</strong> ${input.result.score}/100</p>
        <p><strong>Headline:</strong> ${escapeHtml(input.result.headline)}</p>
        <p><strong>Supervisory evidence:</strong> ${escapeHtml(input.result.salesContext.supervisoryEvidence)}</p>
        <p><strong>Communications coverage:</strong> ${escapeHtml(input.result.salesContext.communicationsCoverage)}</p>
        <p><strong>Exam retrieval:</strong> ${escapeHtml(input.result.salesContext.examRetrieval)}</p>
        <p><strong>Stack fragmentation:</strong> ${escapeHtml(input.result.salesContext.stackFragmentation)}</p>
        <p><strong>Source:</strong> ${escapeHtml(source)}</p>
      </div>
    </div>
  `;

  if (!resend) {
    console.log("📧 [DEV MODE] Assessment lead notification would be sent");
    return { success: true };
  }

  try {
    const result = await resend.emails.send({
      from,
      to: notificationEmail,
      subject: `Stack Assessment Lead: ${input.email}`,
      html,
    });
    if (result.error) {
      throw new Error(result.error.message);
    }
    return { success: true };
  } catch (error) {
    console.error("Error sending assessment lead notification");
    return { success: false };
  }
}
