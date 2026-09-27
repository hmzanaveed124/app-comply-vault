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

const REVIEW_URL = "https://www.complyvault.co/#cta";
const LOGO_URL = "https://app.complyvault.co/ComplyVaultLogo.png";

const STATUS_COLOR: Record<AreaStatus, string> = {
  covered: "#16856b",
  partial: "#d49a45",
  gap: "#d56f59",
  effort: "#d56f59",
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
  const { answers, result } = input;
  const strong = strongestCoverage(result);
  const gaps = keyGapAreas(result);
  const duplication = detectDuplicationSignals(answers);
  const observations = prioritizedObservations(answers, result);
  const friction = supervisoryFrictionSummary(answers, result);

  // The displayed seven-area chart is a status map, not the eight-input score.
  const chartRows = result.areaDetails.map((area) => {
    const color = STATUS_COLOR[area.status];
    const width = area.status === "covered" ? 100 : area.status === "partial" ? 50 : 12;
    return `<tr><td style="padding:9px 10px 9px 0;width:40%;font-size:13px;color:#243e39;">${escapeHtml(area.label)}</td><td style="padding:9px 0;width:39%;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr><td style="background:#e8eeeb;height:9px;line-height:9px;"><div style="width:${width}%;height:9px;line-height:9px;background:${color};">&nbsp;</div></td></tr></table></td><td style="padding:9px 0 9px 10px;width:21%;font-size:12px;color:${color};font-weight:bold;white-space:nowrap;">${escapeHtml(STATUS_LABEL[area.status])}</td></tr>`;
  }).join("");
  const counts = {
    covered: result.areaDetails.filter((area) => area.status === "covered").length,
    partial: result.areaDetails.filter((area) => area.status === "partial").length,
    attention: result.areaDetails.filter((area) => area.status === "gap" || area.status === "effort").length,
  };
  const leadIssue = answers.examRetrieval === "days"
    ? "You reported that retrieving a typical evidence trail can take a day or more. An examiner or internal reviewer may ask for a record before your team has reconstructed how it was handled."
    : answers.examRetrieval === "hours"
      ? "You reported that retrieving a typical evidence trail takes hours. The delay is a useful place to test which handoffs consume time."
      : answers.reviewEvidence !== "single" || answers.issueTracking !== "workflow"
        ? "Your answers suggest that review decisions and follow-up live in more than one place. Test whether someone outside the original review can reconstruct one closed matter."
        : "Your answers suggest fast retrieval and a connected review trail. Test that impression with one real closed matter rather than relying on the system inventory alone.";
  const drill = answers.archive !== "yes"
    ? "First confirm which communication channels are retained and whether one record can be retrieved with its original context. Do this before evaluating an additional supervisory tool."
    : "Pick one closed client issue from the last quarter. Ask a colleague who did not handle it to locate the original record, reviewer decision, any follow-up, and proof of closure. Time the exercise and note each system opened or person contacted.";
  const whyNow = answers.examRetrieval === "days"
    ? "A day-or-more retrieval path is already a measurable bottleneck. Run the drill this week, while the people and records are available, and set a target for the next attempt."
    : "Run the drill this week. A concrete retrieval time and a list of missing links give your team a baseline for the next review cycle.";

  const strongHtml =
    strong.length > 0
      ? `<ul>${strong.map((item) => `<li><strong>${escapeHtml(item.label)}</strong> — ${escapeHtml(item.detail)}</li>`).join("")}</ul>`
      : "<p>No areas scored as fully covered. The priorities below focus on foundational gaps first.</p>";

  const gapsHtml =
    gaps.length > 0
      ? `<ul>${gaps.slice(0, 3).map((item) => `<li><strong>${escapeHtml(item.label)}</strong> (${escapeHtml(item.status)}) — ${escapeHtml(item.detail)}</li>`).join("")}</ul>`
      : "<p>No partial coverage, gaps or high-friction areas were flagged from your answers.</p>";

  const duplicationHtml =
    duplication.length > 0
      ? `<ul>${duplication.slice(0, 2).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "<p>Your answers did not indicate clear multi-system duplication in CRM, policy, evidence or issue tracking.</p>";

  const observationsHtml = `<ol>${observations.slice(0, 3).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;

  const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;background:#f2f5f3;font-family:Arial,Helvetica,sans-serif;color:#17332e;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f2f5f3;"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e0e9e4;">
      <tr><td style="background:#103f34;padding:19px 28px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;"><img src="${LOGO_URL}" width="36" height="36" alt="" style="display:block;border:0;width:36px;height:36px;"></td><td style="vertical-align:middle;padding-left:10px;color:#ffffff;font-size:21px;font-weight:bold;letter-spacing:-.4px;">ComplyVault</td></tr></table></td></tr>
      <tr><td style="padding:29px 28px 12px;"><div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#16856b;">YOUR STACK REVIEW</div><h1 style="font-size:26px;line-height:1.2;margin:9px 0 12px;color:#103f34;">Your next evidence bottleneck</h1><p style="font-size:15px;line-height:1.5;margin:0;color:#405b53;">${escapeHtml(leadIssue)}</p></td></tr>
      <tr><td style="padding:16px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e9f3ef;"><tr><td style="padding:17px;width:34%;border-right:1px solid #d3e4dc;"><div style="font-size:30px;font-weight:bold;color:#103f34;">${result.score}<span style="font-size:14px;">/100</span></div><div style="font-size:11px;color:#48665d;">Operational coverage indicator</div></td><td style="padding:17px;font-size:13px;line-height:1.6;color:#234b40;"><b>${counts.covered}</b> covered &nbsp;·&nbsp; <b>${counts.partial}</b> partial &nbsp;·&nbsp; <b>${counts.attention}</b> need attention<br>Fragmentation signal: <b>${escapeHtml(result.salesContext.stackFragmentation)}</b></td></tr></table><p style="font-size:11px;line-height:1.45;color:#668076;margin:8px 0 0;">The score uses eight weighted answers. The chart below maps seven operational areas; neither is a regulatory compliance rating.</p></td></tr>
      <tr><td style="padding:8px 28px 20px;"><h2 style="font-size:17px;margin:0 0 6px;color:#103f34;">Where the stack holds together</h2><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${chartRows}</table><p style="font-size:11px;color:#668076;margin:7px 0 0;">Chart shows answer-derived status by area, not a comparison with other firms.</p></td></tr>
      <tr><td style="padding:0 28px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fff5ea;border-left:4px solid #d49a45;"><tr><td style="padding:17px 19px;"><h2 style="font-size:16px;margin:0 0 8px;color:#633d17;">Run this evidence drill this week</h2><p style="font-size:14px;line-height:1.5;margin:0 0 9px;color:#403b30;">${escapeHtml(drill)}</p><p style="font-size:13px;line-height:1.5;margin:0;color:#634b2b;"><b>Record:</b> minutes to reconstruct · systems searched · missing links · owner of the next fix.</p></td></tr></table></td></tr>
      <tr><td style="padding:0 28px 17px;"><h2 style="font-size:17px;margin:0 0 8px;color:#103f34;">What your answers suggest</h2><p style="font-size:14px;line-height:1.5;margin:0 0 12px;color:#405b53;">${escapeHtml(friction)}</p><h3 style="font-size:14px;margin:0 0 6px;color:#103f34;">Strongest coverage</h3>${strongHtml}<h3 style="font-size:14px;margin:15px 0 6px;color:#103f34;">Key gaps and friction areas</h3>${gapsHtml}<h3 style="font-size:14px;margin:15px 0 6px;color:#103f34;">Duplication / split-system signals</h3>${duplicationHtml}<h3 style="font-size:14px;margin:15px 0 6px;color:#103f34;">Prioritized observations</h3>${observationsHtml}</td></tr>
      <tr><td style="padding:0 28px 27px;"><p style="font-size:14px;line-height:1.5;color:#405b53;">${escapeHtml(whyNow)}</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#16856b" style="padding:14px 19px;"><a href="${REVIEW_URL}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;">Request a 20-minute Stack Review →</a></td></tr></table><p style="font-size:12px;color:#668076;line-height:1.4;">The link opens our request form; our team will follow up to schedule. If it does not open, email <a href="mailto:contact@complyvault.co?subject=Stack%20Review%20request" style="color:#16856b;">contact@complyvault.co</a>.</p></td></tr>
      <tr><td style="background:#f2f5f3;padding:19px 28px;color:#668076;font-size:11px;line-height:1.5;">Based only on your self-reported answers. This is an operational stack assessment, not legal advice, a regulatory examination, or a determination of compliance with SEC or state requirements.</td></tr>
    </table></td></tr></table></body></html>`;

  const text = [
    "Your detailed ComplyVault Stack Review",
    "",
    "Overall result",
    leadIssue,
    result.headline,
    result.body,
    `Operational coverage score: ${result.score} / 100`,
    `Stack fragmentation (from answers): ${result.salesContext.stackFragmentation}`,
    `Status map: ${counts.covered} covered, ${counts.partial} partial, ${counts.attention} need attention (seven areas).`,
    "The score uses eight weighted answers; neither it nor the status map is a regulatory compliance rating.",
    "",
    "Run this evidence drill this week",
    drill,
    "Record minutes to reconstruct, systems searched, missing links, and owner of the next fix.",
    whyNow,
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
    `Request a 20-minute Stack Review: ${REVIEW_URL}`,
    "The link opens a request form; our team will follow up to schedule. Or email contact@complyvault.co.",
  ].join("\n");

  return {
    subject: "Your detailed ComplyVault Stack Review",
    html,
    text,
  };
}
