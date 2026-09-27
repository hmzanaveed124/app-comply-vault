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
  const portfolioScope = answers.registration === "mixed" || answers.complianceModel === "outsourced";
  const sampleScope = portfolioScope ? "one firm in the portfolio" : "your firm";
  const headerTitle = answers.archive === "no"
    ? "Confirm what is retained first"
    : answers.archive === "unsure"
      ? "Confirm your archive coverage"
      : result.score >= 80 && answers.examRetrieval === "minutes"
        ? "Stress-test a strong foundation"
        : "Your next evidence bottleneck";
  const leadIssue = answers.archive === "no"
    ? "You reported no communications archive. First identify which channels are used and how records are retained and retrieved; a supervisory workflow cannot repair missing source coverage."
    : answers.archive === "unsure"
      ? "You are unsure what the archive covers. Confirm the capture and retrieval of each material channel before treating the rest of the stack as a dependable foundation."
      : answers.examRetrieval === "days"
    ? "You reported that retrieving a typical evidence trail can take a day or more. An examiner or internal reviewer may ask for a record before your team has reconstructed how it was handled."
    : answers.examRetrieval === "hours"
      ? "You reported that retrieving a typical evidence trail takes hours. The delay is a useful place to test which handoffs consume time."
      : answers.reviewEvidence !== "single" || answers.issueTracking !== "workflow"
        ? "Your answers suggest that review decisions and follow-up live in more than one place. Test whether someone outside the original review can reconstruct one closed matter."
        : "Your answers suggest fast retrieval and a connected review trail. Test that impression with one real closed matter rather than relying on the system inventory alone.";
  const drill = answers.archive !== "yes"
    ? `For ${sampleScope}, first confirm which communication channels are retained and whether one record can be retrieved with its original context. Do this before evaluating an additional supervisory tool.`
    : `Pick one closed client issue from the last quarter for ${sampleScope}. Ask a colleague who did not handle it to locate the original record, reviewer decision, any follow-up, and proof of closure. Time the exercise and note each system opened or person contacted.`;
  const whyNow = answers.archive !== "yes"
    ? "Confirm the retention inventory this week, then test retrieval of an actual source record. Record any channel that cannot be accounted for before choosing another layer."
    : answers.examRetrieval === "days"
    ? "A day-or-more retrieval path is already a measurable bottleneck. Run the drill this week, while the people and records are available, and set a target for the next attempt."
    : "Run the drill this week. A concrete retrieval time and a list of missing links give your team a baseline for the next review cycle.";

  const internalBrief = `For our ${result.profile.registration.toLowerCase()} setup (${result.profile.adviserCount} advisers; ${result.profile.complianceModel.toLowerCase()} compliance), our self-reported Stack Assessment returned an operational coverage indicator of ${result.score}/100. Our stated pain is ${result.profile.biggestPain.toLowerCase()}, and our priority is ${result.profile.priority.toLowerCase()}. ${answers.archive === "yes" ? "We report an archive in place" : "We have not yet confirmed a complete communications archive"}; ${answers.reviewEvidence === "single" && answers.issueTracking === "workflow" ? "we report a connected supervisory decision trail" : "our review and follow-up trail may be split across systems"}; and ${answers.examRetrieval === "days" ? "typical retrieval can take a day or more" : answers.examRetrieval === "hours" ? "typical retrieval takes hours" : "we report retrieval in minutes"}. These are questionnaire responses, not verified findings. We propose testing one representative matter for ${sampleScope}, preserving the source, review decision, follow-up and closure evidence, then assigning an owner to any missing handoff.`;

  const proofChecks = [
    {
      name: "Source coverage",
      signal: answers.archive === "yes"
        ? answers.meetings === "yes" ? "Archive and routine meeting capture reported" : answers.meetings === "sometimes" ? "Archive reported; meeting capture is inconsistent" : "Archive reported; meeting evidence is largely manual"
        : "Archive coverage unconfirmed or absent",
      request: answers.archive === "yes"
        ? `A source record and archive retrieval for ${sampleScope}, plus a recent meeting sample if meetings are in scope.`
        : `Channel inventory, retention owner, and one retrieval from each material channel for ${sampleScope}.`,
    },
    {
      name: "Review decision",
      signal: answers.reviewEvidence === "single" && answers.issueTracking === "workflow"
        ? "Connected decision trail reported"
        : "Decision evidence or issue status appears spread across places",
      request: "The reviewer, decision date, rationale, applicable policy version, and link to the source item.",
    },
    {
      name: "Closure",
      signal: answers.issueTracking === "workflow" ? "Dedicated workflow reported" : "Follow-up may rely on an inbox, spreadsheet, or informal process",
      request: "The action owner, due date, completed action, and evidence that closure was checked.",
    },
    {
      name: "Retrieval",
      signal: answers.examRetrieval === "days" ? "A day or more reported" : answers.examRetrieval === "hours" ? "Hours reported" : "Minutes reported",
      request: "A timed reconstruction by someone who did not handle the matter; log systems opened and missing links.",
    },
  ];
  const proofHtml = proofChecks.map((check, index) => `<tr><td style="padding:13px 0;border-top:1px solid #e3ebe6;vertical-align:top;width:31%;font-size:13px;font-weight:bold;color:#103f34;">${index + 1}. ${escapeHtml(check.name)}</td><td style="padding:13px 0;border-top:1px solid #e3ebe6;vertical-align:top;font-size:13px;line-height:1.45;color:#405b53;"><b>Reported:</b> ${escapeHtml(check.signal)}<br><b>Ask to see:</b> ${escapeHtml(check.request)}</td></tr>`).join("");
  const actionItems = result.gaps.slice(0, 3);
  const actionHtml = actionItems.map((item, index) => `<tr><td style="padding:11px 0;border-top:1px solid #e3ebe6;vertical-align:top;width:32px;color:#16856b;font-weight:bold;">0${index + 1}</td><td style="padding:11px 0;border-top:1px solid #e3ebe6;vertical-align:top;font-size:13px;line-height:1.45;color:#405b53;"><b style="color:#103f34;">${escapeHtml(item.title)}</b><br>${escapeHtml(item.body)}</td></tr>`).join("");

  const html = `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;padding:0;background:#f2f5f3;font-family:Arial,Helvetica,sans-serif;color:#17332e;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f2f5f3;"><tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #e0e9e4;">
      <tr><td bgcolor="#117a4b" style="background:#117a4b;padding:19px 28px;"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:middle;"><img src="${LOGO_URL}" width="36" height="36" alt="" style="display:block;border:0;width:36px;height:36px;"></td><td style="vertical-align:middle;padding-left:10px;color:#ffffff;font-size:21px;font-weight:bold;letter-spacing:-.4px;">ComplyVault</td></tr></table></td></tr>
      <tr><td style="padding:29px 28px 12px;"><div style="font-size:11px;font-weight:bold;letter-spacing:1.5px;color:#16856b;">YOUR STACK REVIEW</div><h1 style="font-size:26px;line-height:1.2;margin:9px 0 12px;color:#103f34;">${escapeHtml(headerTitle)}</h1><p style="font-size:15px;line-height:1.5;margin:0;color:#405b53;">${escapeHtml(leadIssue)}</p></td></tr>
      <tr><td style="padding:16px 28px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e9f3ef;"><tr><td style="padding:17px;width:34%;border-right:1px solid #d3e4dc;"><div style="font-size:30px;font-weight:bold;color:#103f34;">${result.score}<span style="font-size:14px;">/100</span></div><div style="font-size:11px;color:#48665d;">Operational coverage indicator</div></td><td style="padding:17px;font-size:13px;line-height:1.6;color:#234b40;"><b>${counts.covered}</b> covered &nbsp;·&nbsp; <b>${counts.partial}</b> partial &nbsp;·&nbsp; <b>${counts.attention}</b> need attention<br>Fragmentation signal: <b>${escapeHtml(result.salesContext.stackFragmentation)}</b></td></tr></table><p style="font-size:11px;line-height:1.45;color:#668076;margin:8px 0 0;">The score uses eight weighted answers. The chart below maps seven operational areas; neither is a regulatory compliance rating.</p></td></tr>
      <tr><td style="padding:8px 28px 20px;"><h2 style="font-size:17px;margin:0 0 6px;color:#103f34;">Where the stack holds together</h2><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${chartRows}</table><p style="font-size:11px;color:#668076;margin:7px 0 0;">Chart shows answer-derived status by area, not a comparison with other firms.</p></td></tr>
      <tr><td style="padding:0 28px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#e9f3ef;border-left:4px solid #16856b;"><tr><td style="padding:17px 19px;"><h2 style="font-size:16px;margin:0 0 8px;color:#103f34;">Brief for your CCO or operations meeting</h2><p style="font-size:14px;line-height:1.55;margin:0;color:#244b40;">${escapeHtml(internalBrief)}</p></td></tr></table></td></tr>
      <tr><td style="padding:0 28px 21px;"><h2 style="font-size:17px;margin:0 0 7px;color:#103f34;">Evidence to put on the table</h2><p style="font-size:13px;line-height:1.5;margin:0 0 6px;color:#405b53;">Use this as the agenda for a single-matter reconstruction. A reported control is only a starting point until someone can produce the underlying record.</p><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${proofHtml}</table></td></tr>
      <tr><td style="padding:0 28px 21px;"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#fff5ea;border-left:4px solid #d49a45;"><tr><td style="padding:17px 19px;"><h2 style="font-size:16px;margin:0 0 8px;color:#633d17;">Run this evidence drill this week</h2><p style="font-size:14px;line-height:1.5;margin:0 0 9px;color:#403b30;">${escapeHtml(drill)}</p><p style="font-size:13px;line-height:1.5;margin:0;color:#634b2b;"><b>Record:</b> retrieval time, systems searched, missing links, and whether another reviewer could follow the decision through closure. Assign one owner for each missing link.</p></td></tr></table></td></tr>
      <tr><td style="padding:0 28px 22px;"><h2 style="font-size:17px;margin:0 0 7px;color:#103f34;">Proposed order of work</h2><p style="font-size:13px;line-height:1.5;margin:0 0 5px;color:#405b53;">At the next team check-in, assign an owner and target date to the first broken handoff. Repeat the same retrieval test after the fix; compare the elapsed time and missing evidence.</p><table role="presentation" cellpadding="0" cellspacing="0" width="100%">${actionHtml}</table></td></tr>
      <tr><td style="padding:0 28px 27px;"><p style="font-size:14px;line-height:1.5;color:#405b53;">${escapeHtml(whyNow)}</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#16856b" style="padding:14px 19px;"><a href="${REVIEW_URL}" style="color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;display:inline-block;">Request a 20-minute Stack Review →</a></td></tr></table><p style="font-size:12px;color:#668076;line-height:1.4;">The link opens our request form; our team will follow up to schedule. If it does not open, email <a href="mailto:contact@complyvault.co?subject=Stack%20Review%20request" style="color:#16856b;">contact@complyvault.co</a>.</p></td></tr>
      <tr><td style="background:#f2f5f3;padding:19px 28px;color:#668076;font-size:11px;line-height:1.5;">Based only on your self-reported answers. This is an operational stack assessment, not legal advice, a regulatory examination, or a determination of compliance with SEC or state requirements.</td></tr>
    </table></td></tr></table></body></html>`;

  const text = [
    "Your detailed ComplyVault Stack Review",
    "",
    "Overall result",
    headerTitle,
    leadIssue,
    result.headline,
    result.body,
    `Operational coverage score: ${result.score} / 100`,
    `Stack fragmentation (from answers): ${result.salesContext.stackFragmentation}`,
    `Status map: ${counts.covered} covered, ${counts.partial} partial, ${counts.attention} need attention (seven areas).`,
    ...result.areaDetails.map((area) => `${area.label}: ${STATUS_LABEL[area.status]} - ${area.detail}`),
    "The score uses eight weighted answers; neither it nor the status map is a regulatory compliance rating.",
    "",
    "Brief for your CCO or operations meeting",
    internalBrief,
    "",
    "Evidence to put on the table",
    ...proofChecks.map((check, index) => `${index + 1}. ${check.name}: Reported: ${check.signal}. Ask to see: ${check.request}`),
    "",
    "Run this evidence drill this week",
    drill,
    "Record retrieval time, systems searched, missing links, and whether another reviewer could follow the decision through closure. Assign one owner for each missing link.",
    whyNow,
    "",
    "Proposed order of work",
    "At the next team check-in, assign an owner and target date to the first broken handoff. Repeat the same retrieval test after the fix; compare the elapsed time and missing evidence.",
    ...actionItems.map((item, index) => `${index + 1}. ${item.title}: ${item.body}`),
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
