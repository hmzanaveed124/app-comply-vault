import type { AssessmentAnswers } from "./types";
import type { AssessmentResultSummary, AreaStatus } from "./types";

export type DetailedReviewEmailContent = {
  subject: string;
  html: string;
  text: string;
};

const STATUS_LABEL: Record<AreaStatus, string> = {
  covered: "Covered",
  partial: "Partial",
  gap: "Gap",
  effort: "High friction",
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Answer-derived duplication / split-system signals only.
 * Never invents tools or findings beyond the assessment responses.
 */
export function detectDuplicationSignals(answers: AssessmentAnswers): string[] {
  const signals: string[] = [];
  if (answers.crm === "some" || answers.crm === "no") {
    signals.push(
      "Client / CRM information appears split across more than one place rather than a single primary record.",
    );
  }
  if (answers.policyCentral === "partial" || answers.policyCentral === "no") {
    signals.push(
      "Current policies appear spread across locations or versions, which creates duplication risk for the 'source of truth'.",
    );
  }
  if (answers.reviewEvidence === "scattered") {
    signals.push(
      "Evidence of compliance decisions is kept across email, CRM, notes and other systems rather than one case record.",
    );
  }
  if (answers.issueTracking === "spreadsheet" || answers.issueTracking === "inbox") {
    signals.push(
      "Open matters are tracked outside a dedicated workflow (spreadsheet / inbox / individual follow-up), which often duplicates status across channels.",
    );
  }
  return signals;
}

export function strongestCoverage(
  result: AssessmentResultSummary,
): Array<{ label: string; detail: string }> {
  return result.areaDetails
    .filter((area) => area.status === "covered")
    .map((area) => ({ label: area.label, detail: area.detail }));
}

export function keyGapAreas(
  result: AssessmentResultSummary,
): Array<{ label: string; status: string; detail: string }> {
  return result.areaDetails
    .filter(
      (area) =>
        area.status === "gap" || area.status === "effort" || area.status === "partial",
    )
    .map((area) => ({
      label: area.label,
      status: STATUS_LABEL[area.status],
      detail: area.detail,
    }));
}

/**
 * 3-5 prioritized observations derived strictly from answers + scoring gaps.
 */
export function prioritizedObservations(
  answers: AssessmentAnswers,
  result: AssessmentResultSummary,
): string[] {
  const observations: string[] = result.gaps.map(
    (gap) => `${gap.title}: ${gap.body}`,
  );

  if (
    answers.biggestPain === "exam" &&
    !observations.some((item) => item.toLowerCase().includes("exam-retrieval"))
  ) {
    observations.push(
      "Exam preparation is your main friction: prioritize a documented retrieval path for one representative issue before adding more review tooling.",
    );
  }

  if (
    answers.priority === "visibility" &&
    (answers.commReview === "manual" || answers.commReview === "none")
  ) {
    observations.push(
      "You want better supervisory visibility, but communications review is still largely manual or inconsistent — narrow the review set before expanding coverage.",
    );
  }

  return observations.slice(0, 5);
}

export function supervisoryFrictionSummary(
  answers: AssessmentAnswers,
  result: AssessmentResultSummary,
): string {
  const evidence = result.salesContext.supervisoryEvidence;
  const exam = result.salesContext.examRetrieval;
  const parts = [
    `Supervisory evidence: ${evidence}.`,
    `Exam retrieval: ${exam}.`,
  ];
  if (
    answers.reviewEvidence !== "single" ||
    answers.issueTracking !== "workflow"
  ) {
    parts.push(
      "The handoff between finding an item, recording judgement and closing the loop still looks manual or fragmented based on your answers.",
    );
  } else {
    parts.push(
      "Your answers suggest a relatively centralized decision trail; the remaining question is whether retrieval stays fast under exam pressure.",
    );
  }
  return parts.join(" ");
}

export function buildDetailedReviewEmail(input: {
  answers: AssessmentAnswers;
  result: AssessmentResultSummary;
  firmName?: string;
}): DetailedReviewEmailContent {
  const { answers, result, firmName } = input;
  const strong = strongestCoverage(result);
  const gaps = keyGapAreas(result);
  const duplication = detectDuplicationSignals(answers);
  const observations = prioritizedObservations(answers, result);
  const friction = supervisoryFrictionSummary(answers, result);
  const greetingFirm = firmName ? ` for ${firmName}` : "";

  const strongHtml =
    strong.length > 0
      ? `<ul>${strong.map((item) => `<li><strong>${escapeHtml(item.label)}</strong> — ${escapeHtml(item.detail)}</li>`).join("")}</ul>`
      : "<p>No areas scored as fully covered. The priorities below focus on foundational gaps first.</p>";

  const gapsHtml =
    gaps.length > 0
      ? `<ul>${gaps.map((item) => `<li><strong>${escapeHtml(item.label)}</strong> (${escapeHtml(item.status)}) — ${escapeHtml(item.detail)}</li>`).join("")}</ul>`
      : "<p>No partial coverage, gaps or high-friction areas were flagged from your answers.</p>";

  const duplicationHtml =
    duplication.length > 0
      ? `<ul>${duplication.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "<p>Your answers did not indicate clear multi-system duplication in CRM, policy, evidence or issue tracking.</p>";

  const observationsHtml = `<ol>${observations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; line-height: 1.6; color: #111;">
      <h2>Your detailed ComplyVault Stack Review${escapeHtml(greetingFirm)}</h2>
      <p>This note goes beyond the on-page snapshot. It highlights strongest coverage, key gaps, duplication signals and prioritized actions — derived only from the answers you provided.</p>

      <h3>Overall result</h3>
      <p><strong>${escapeHtml(result.headline)}</strong></p>
      <p>${escapeHtml(result.body)}</p>
      <p><strong>Operational coverage score:</strong> ${result.score} / 100<br/>
      <strong>Stack fragmentation (from answers):</strong> ${escapeHtml(result.salesContext.stackFragmentation)}</p>

      <h3>Strongest coverage</h3>
      ${strongHtml}

      <h3>Key gaps and friction areas</h3>
      ${gapsHtml}

      <h3>Duplication / split-system signals</h3>
      ${duplicationHtml}

      <h3>Supervisory / evidence friction</h3>
      <p>${escapeHtml(friction)}</p>

      <h3>Prioritized observations</h3>
      ${observationsHtml}

      <p style="font-size: 13px; color: #555; border-top: 1px solid #ddd; padding-top: 16px; margin-top: 24px;">
        This is an operational stack assessment based on your self-reported answers. It is not legal advice, not a regulatory examination, and not a determination of compliance with SEC or state requirements.
      </p>
      <p>If you want to walk through these priorities live, you can book a 20-minute Stack Review at
        <a href="https://complyvault.co/#cta">complyvault.co/#cta</a>.
      </p>
    </div>
  `;

  const text = [
    `Your detailed ComplyVault Stack Review${greetingFirm}`,
    "",
    "Overall result",
    result.headline,
    result.body,
    `Operational coverage score: ${result.score} / 100`,
    `Stack fragmentation (from answers): ${result.salesContext.stackFragmentation}`,
    "",
    "Strongest coverage",
    ...(strong.length
      ? strong.map((item) => `- ${item.label}: ${item.detail}`)
      : ["- No areas scored as fully covered."]),
    "",
    "Key gaps and friction areas",
    ...(gaps.length
      ? gaps.map((item) => `- ${item.label} (${item.status}): ${item.detail}`)
      : ["- No partial coverage, gaps or high-friction areas were flagged."]),
    "",
    "Duplication / split-system signals",
    ...(duplication.length ? duplication.map((item) => `- ${item}`) : [
      "- No clear multi-system duplication signals from your answers.",
    ]),
    "",
    "Supervisory / evidence friction",
    friction,
    "",
    "Prioritized observations",
    ...observations.map((item, index) => `${index + 1}. ${item}`),
    "",
    "This is an operational stack assessment based on your self-reported answers. It is not legal advice, not a regulatory examination, and not a determination of compliance with SEC or state requirements.",
    "",
    "Book a 20-minute Stack Review: https://complyvault.co/#cta",
  ].join("\n");

  return {
    subject: "Your detailed ComplyVault Stack Review",
    html,
    text,
  };
}
