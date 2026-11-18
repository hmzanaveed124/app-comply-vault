import { Resend } from "resend";
import { ROLE_CONFIG, type WorkspaceRoleKey } from "~/lib/role-config";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendInvitationEmail({
  email,
  workspaceName,
  invitationToken,
  role,
  inviterName,
  inviterRole,
}: {
  email: string;
  workspaceName: string;
  invitationToken: string;
  role: "OWNER_CCO" | "MEMBER" | "ADVISOR";
  inviterName: string;
  inviterRole: string;
}): Promise<{ success: boolean; id: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const invitationUrl = `${baseUrl}/invitations/accept?token=${invitationToken}`;

  const roleConfig = ROLE_CONFIG[role as WorkspaceRoleKey];
  const roleLabel = roleConfig.label;
  const roleSummary = roleConfig.summary;
  const steps = roleConfig.steps;

  const stepsHtml = steps
    .map((step, index) => `<li style="margin-bottom: 6px;">${index + 1}. ${step}</li>`)
    .join("");
  const stepsText = steps.map((step, index) => `${index + 1}. ${step}`).join("\n");

  const emailContent = {
    from: process.env.EMAIL_FROM || "noreply@ria-compliance.com",
    to: email,
    subject: `${inviterName} invited you to join ${workspaceName} on ComplyVault`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h2>You've been invited to join ${workspaceName}</h2>
        <p>${inviterName} (${inviterRole}) has invited you to join as ${roleLabel}.</p>

        <div style="background-color: #e9f3ee; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #117A4B;">
          <p style="margin: 0;"><strong>Your Role:</strong> ${roleLabel}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: #4b5563;">${roleSummary}</p>
        </div>

        <div style="margin: 30px 0;">
          <a href="${invitationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #117A4B; color: white; text-decoration: none; border-radius: 6px;">
            Accept Invitation
          </a>
        </div>

        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666; font-size: 12px;">${invitationUrl}</p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p><strong>Getting started:</strong></p>
          <ol style="padding-left: 20px; margin: 10px 0;">
            ${stepsHtml}
          </ol>
          <p style="margin-top: 15px;">This invitation will expire in 7 days.</p>
        </div>
      </div>
    `,
    text: `
You've been invited to join ${workspaceName} on ComplyVault.

${inviterName} (${inviterRole}) has invited you to join as ${roleLabel}.
${roleSummary}

Accept your invitation by visiting:
${invitationUrl}

Getting started:
${stepsText}

This invitation will expire in 7 days.
    `,
  };

  if (!resend) {
    console.log("📧 [DEV MODE] Invitation email would be sent:");
    console.log("To:", email);
    console.log("Subject:", emailContent.subject);
    console.log("Invitation URL:", invitationUrl);
    return { success: true, id: "dev-mode" };
  }

  try {
    const result = await resend.emails.send(emailContent);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return { success: true, id: result.data?.id || "sent" };
  } catch (error) {
    console.error("Error sending invitation email:", error);
    throw new Error("Failed to send invitation email");
  }
}
/**
 * Send welcome email with onboarding checklist when workspace is provisioned
 */
export async function sendWelcomeEmail({
  email,
  workspaceName,
  userName,
}: {
  email: string;
  workspaceName: string;
  userName: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const onboardingUrl = `${baseUrl}/onboarding`;
  const settingsUrl = `${baseUrl}/settings/media-posture`;
  const uploadUrl = `${baseUrl}/upload`;

  const emailContent = {
    from: process.env.EMAIL_FROM || "noreply@ria-compliance.com",
    to: email,
    subject: `Welcome to Comply Vault - ${workspaceName} Trial`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h2>Welcome to Comply Vault, ${userName}!</h2>
        <p>Your trial workspace <strong>${workspaceName}</strong> has been successfully created.</p>
          <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 12px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Trial Active:</strong> Your 7-day free trial has started.</p>
          </div>
        
        <h3 style="margin-top: 30px 0 15px 0;">Onboarding Checklist</h3>
        <p>Get started with these steps:</p>
        <ol style="padding-left: 20px;">
          <li style="margin-bottom: 10px;">
            <strong>Complete Workspace Setup</strong><br>
            <a href="${settingsUrl}" style="color: #2563eb;">Choose how source recordings are retained</a>
          </li>
          <li style="margin-bottom: 10px;">
            <strong>Take the Walkthrough</strong><br>
            Follow the guided setup to see how a meeting becomes a reviewed record
          </li>
          <li style="margin-bottom: 10px;">
            <strong>Upload Your First Meeting</strong><br>
            <a href="${uploadUrl}" style="color: #2563eb;">Upload a meeting recording</a> to see the system in action
          </li>
          <li style="margin-bottom: 10px;">
            <strong>Review and Finalize</strong><br>
            Review the extracted fields, make any edits, and finalize your first record
          </li>
        </ol>
        
        <div style="margin: 30px 0;">
          <a href="${onboardingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            Start guided setup
          </a>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          <p><strong>Trial Period:</strong> Your 7-day free trial starts today and includes access to core features.</p>
          <p><strong>Support:</strong> If you need help, reply to this email or contact support@complyvault.com</p>
        </div>
      </div>
    `,
    text: `
      Welcome to Comply Vault, ${userName}!
      
      Your trial workspace ${workspaceName} has been successfully created.
      
      Trial Active: Your 7-day free trial has started.
      
      Onboarding Checklist:
      1. Complete Workspace Setup: ${settingsUrl}
      2. Take the walkthrough: ${onboardingUrl}
      3. Upload Your First Meeting: ${uploadUrl}
      4. Review and Finalize: Review the extracted fields and finalize your first record
      
      Start guided setup: ${onboardingUrl}
      
      Trial Period: Your 7-day free trial starts today and includes access to core features.
      Support: If you need help, reply to this email or contact support@complyvault.com
    `,
  };

  // In development without Resend API key, log the email instead
  if (!resend) {
    console.log("📧 [DEV MODE] Welcome email would be sent:");
    console.log("To:", email);
    console.log("Subject:", emailContent.subject);
    console.log("Workspace:", workspaceName);
    return { success: true, id: "dev-mode" };
  }

  try {
    const result = await resend.emails.send(emailContent);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return { success: true, id: result.data?.id || "sent" };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    // Don't throw - email failures shouldn't block the workflow
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Send email notification when meeting draft is ready for review
 */
export async function sendDraftReadyEmail({
  email,
  clientName,
  meetingDate,
  meetingId,
}: {
  email: string;
  clientName: string;
  meetingDate: Date;
  meetingId: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const meetingUrl = `${baseUrl}/meetings/${meetingId}`;

  const emailContent = {
    from: process.env.EMAIL_FROM || "noreply@ria-compliance.com",
    to: email,
    subject: `Draft Ready for Review: ${clientName} - ${meetingDate.toLocaleDateString()}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Meeting Draft is Ready for Review</h2>
        <p>The transcription for your meeting with <strong>${clientName}</strong> on <strong>${meetingDate.toLocaleDateString()}</strong> is complete and ready for your review.</p>
        <p>Click the button below to review and finalize the meeting record:</p>
        <a href="${meetingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Review Meeting
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${meetingUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This is an automated notification from Comply Vault.</p>
      </div>
    `,
    text: `
      Your Meeting Draft is Ready for Review
      
      The transcription for your meeting with ${clientName} on ${meetingDate.toLocaleDateString()} is complete and ready for your review.
      
      Review the meeting: ${meetingUrl}
      
      This is an automated notification from Comply Vault.
    `,
  };

  // In development without Resend API key, log the email instead
  if (!resend) {
    console.log("📧 [DEV MODE] Draft ready email would be sent:");
    console.log("To:", email);
    console.log("Subject:", emailContent.subject);
    console.log("Meeting URL:", meetingUrl);
    return { success: true, id: "dev-mode" };
  }

  try {
    const result = await resend.emails.send(emailContent);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return { success: true, id: result.data?.id || "sent" };
  } catch (error) {
    console.error("Error sending draft ready email:", error);
    // Don't throw - email failures shouldn't block the workflow
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Send email when integration token refresh fails — Epic 6 Story 6.2
 */
export async function sendIntegrationReconnectEmail({
  email,
  workspaceName,
  provider,
}: {
  email: string;
  workspaceName: string;
  provider: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const integrationsUrl = `${baseUrl}/integrations`;

  const providerLabel = provider.replace(/_/g, " ");

  const emailContent = {
    from: process.env.EMAIL_FROM || "noreply@ria-compliance.com",
    to: email,
    subject: `ComplyVault: Reconnect required — ${providerLabel}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Integration Reconnect Required</h2>
        <p>Your <strong>${providerLabel}</strong> connection for <strong>${workspaceName}</strong> has expired or failed to refresh.</p>
        <p>Please reconnect the integration to restore automatic syncing.</p>
        <a href="${integrationsUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Reconnect Integration
        </a>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This is an automated notification from ComplyVault.</p>
      </div>
    `,
    text: `Your ${providerLabel} connection for ${workspaceName} has expired. Please reconnect at ${integrationsUrl}`,
  };

  if (!resend) {
    console.log("📧 [DEV MODE] Integration reconnect email would be sent:", { to: email, provider });
    return { success: true, id: "dev-mode" };
  }

  try {
    const result = await resend.emails.send(emailContent);
    if (result.error) throw new Error(result.error.message);
    return { success: true, id: result.data?.id || "sent" };
  } catch (error) {
    console.error("Error sending integration reconnect email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Send confirmation when integration is disconnected — Epic 6 Story 6.6
 */
export async function sendIntegrationDisconnectEmail({
  email,
  workspaceName,
  provider,
}: {
  email: string;
  workspaceName: string;
  provider: string;
}) {
  const providerLabel = provider.replace(/_/g, " ");

  const emailContent = {
    from: process.env.EMAIL_FROM || "noreply@ria-compliance.com",
    to: email,
    subject: `ComplyVault: ${providerLabel} disconnected`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Integration Disconnected</h2>
        <p>Your <strong>${providerLabel}</strong> connection for <strong>${workspaceName}</strong> has been successfully disconnected.</p>
        <p>All integration credentials and configuration have been removed. Audit packs are unchanged.</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">This is an automated confirmation from ComplyVault.</p>
      </div>
    `,
    text: `Your ${providerLabel} connection for ${workspaceName} has been disconnected. Audit packs are unchanged.`,
  };

  if (!resend) {
    console.log("📧 [DEV MODE] Integration disconnect email would be sent:", { to: email, provider });
    return { success: true, id: "dev-mode" };
  }

  try {
    const result = await resend.emails.send(emailContent);
    if (result.error) throw new Error(result.error.message);
    return { success: true, id: result.data?.id || "sent" };
  } catch (error) {
    console.error("Error sending integration disconnect email:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Weekly activity digest (Epic 5 Story 5.1) — no client names in body (metadata only)
 */
export async function sendWeeklyActivityDigest({
  email,
  workspaceName,
  stats,
  periodLabel,
}: {
  email: string;
  workspaceName: string;
  periodLabel: string;
  stats: {
    newMeetings: number;
    finalized: number;
    draftReady: number;
    openFlags: number;
  };
}): Promise<{ success: boolean; id?: string; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const onboardingUrl = `${baseUrl}/onboarding`;

  const emailContent = {
    from: process.env.EMAIL_FROM || "noreply@ria-compliance.com",
    to: email,
    subject: `ComplyVault weekly summary — ${workspaceName} (${periodLabel})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
        <h2>Weekly activity</h2>
        <p>Workspace: <strong>${escapeHtml(workspaceName)}</strong></p>
        <p>Period: <strong>${escapeHtml(periodLabel)}</strong></p>
        <ul>
          <li>New meetings created: <strong>${stats.newMeetings}</strong></li>
          <li>Records finalized: <strong>${stats.finalized}</strong></li>
          <li>Draft ready for review: <strong>${stats.draftReady}</strong></li>
          <li>Open flags (all meetings): <strong>${stats.openFlags}</strong></li>
        </ul>
        <p><a href="${onboardingUrl}">Open dashboard</a></p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">ComplyVault — compliance documentation for RIAs</p>
      </div>
    `,
    text: `Weekly activity for ${workspaceName} (${periodLabel}):
New meetings: ${stats.newMeetings}
Finalized: ${stats.finalized}
Draft ready: ${stats.draftReady}
Open flags: ${stats.openFlags}
Dashboard: ${onboardingUrl}
`,
  };

  if (!resend) {
    console.log("📧 [DEV MODE] Weekly digest would be sent:", { to: email, workspaceName, stats });
    return { success: true, id: "dev-mode" };
  }

  try {
    const result = await resend.emails.send(emailContent);
    if (result.error) {
      throw new Error(result.error.message);
    }
    return { success: true, id: result.data?.id || "sent" };
  } catch (error) {
    console.error("Error sending weekly digest:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

