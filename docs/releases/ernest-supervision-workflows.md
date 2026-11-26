# Contextual supervision and daily review

This release addresses the workflow objections raised during the Ernest discussion. It does not claim to eliminate discovery/subpoena exposure, establish regulatory compliance, or prove savings before a measured pilot.

## Implemented

- Daily Review groups authorised firms, activity in a fixed 24-hour window, outstanding observations from all earlier dates, remediation tasks and meeting samples. An explicit cutoff is shareable; current disposition status is not an immutable historical snapshot. The page discloses ingestion blocks, failed jobs and available connection status. It does not delay ingestion or silently create an email notification schedule. Per-meeting draft-ready emails are limited to adviser uploaders; compliance reviewers use the daily batch.
- Portfolio access comes from active CCO/compliance memberships rather than a hard-coded demonstration customer list. Cross-firm record links switch to the authorised workspace before opening the record.
- Controls store applicability, recommendation trigger keywords, required evidence/sources, policy basis, exceptions and effective date. Saving invalidates approval. Approval records a full version snapshot; concurrent edits invalidate approval attempts. Trigger keywords route contextual review instructions; free-text exceptions and external documents are assessed by the reviewer, not automatically adjudicated.
- Legacy suppression does not suppress new disclosure observations. Generic unrelated disclosure text cannot clear another category's concern. Approved matching controls require human review even when generic disclosure language is nearby. New disclosure observations use WARN rather than an unsupported critical finding. Existing decisions/severity are preserved.
- No-finding decisions require a decision basis, rationale, evidence reference and explicit no-further-action confirmation. Pending/planned follow-up cannot be quick-closed. Notes remain outstanding and can be followed by a subsequent disposition.
- Required remediation tasks need a completion note. Submission and approval validate retrievable evidence appropriate to the resolution type and any recorded acknowledgement requirement. All remediation goes to explicit verification; non-critical items are no longer auto-approved. Verification requires a rationale. Sealed records cannot be edited through remediation. Sign-off and finalization reject outstanding flags; a finalization exception note cannot bypass remediation.
- Media disposal checks Legal Hold, serializes the destructive operation against workspace hold changes, and preserves source media under a hold. Bulk cross-tenant flush and application-level sealed-record deletion probes are disabled. Reprocessing retains original observations and dispositions and cannot reset certified records; webhook retries cannot overwrite already processed records.
- The generic integration worker calls a registered adapter and requires provider acknowledgement. Unsupported/no-op deliveries fail. Zoho notes and SharePoint deposits retain returned provider record IDs. Retries use their actual dedicated jobs. Delivery status distinguishes acknowledged, pending and legacy success without a receipt; connection status alone is not archive confirmation.
- Unsupported compliance health scoring and SEC-ready labels are replaced with operational completion metrics. Classification confidence is not presented as a violation probability in the flag and priority inbox views.
- Pilot measurement records reviewer-entered comparable baseline/review/setup/rework time, item counts, false positives and sampled missed concerns. It has no assumed savings, hourly rate or price. Measurements are saved as audit events.

## Migration and release checks

1. Apply `20261126030000_contextual_controls` to an isolated preview database before exercising the new UI. It adds nullable `DisclosureCategory.controlConfig` and `IntegrationSyncLog.externalId`; it does not rewrite historical flags, seal bytes or firm policy decisions.
2. Run Prisma generation, type checking, unit tests, UI tests and Next build. Use test-only database configuration for build checks; these do not prove production connectivity.
3. Verify with two authorised firms and an unauthorised account: cross-firm navigation works only for current memberships, and adviser accounts cannot enter portfolio supervision or record supervisory decisions.
4. Confirm a hold prevents normal DISCARD processing and explicit media purge, including a hold committed before the destructive boundary. Check external bucket lifecycle rules, backups, archive copies and provider retention/hold settings separately. The application cannot enforce those systems' policies.
5. Configure both QStash signing keys. Production meeting-processing, CRM-note and SharePoint-deposit jobs return 503 when verification cannot be initialized; they never fall back to unsigned writes.
6. Use a synthetic record for the full path: capture, adviser certification, contextual review, remediation assignment, completed outreach evidence, CCO verification, finalization, sealed export and actual SharePoint delivery receipt. Open the remote artefact and verify the expected record/hash. Exercise provider failure and retry; queued jobs must not display as delivered.
7. Review old finalized records whose closure notes only describe future actions. Do not silently change their disposition or regenerate their seals. Use the approved correction/supersession process and preserve the original evidence.
8. Account access remains subject to existing subscription rules. This release does not bypass expired trials, grant access, set a retention/disposal policy or create a commercial pricing commitment.

## Ernest demonstration (approximately five minutes)

1. Open Daily Review and explain the activity window, source gaps and historical backlog.
2. Open a synthetic annuity recommendation with approved contextual instructions. Show the source quote and policy/evidence requirements; explain that it is an observation requiring judgment.
3. Show a no-finding example backed by existing evidence and a separate case requiring follow-up. The latter remains in remediation after a promise to send an email.
4. Attach an actual synthetic outreach record, complete the required actions and submit for verification. Record the CCO's verification rationale; then finalize and export.
5. Show the provider acknowledgement and retrieve the deposited artefact. Clearly identify unsupported or simulated custodian/reporting connections; do not present them as integrations.
6. Show pilot measurements from comparable tasks. Agree the comparison method, sampling and commercial scope with Ernest; do not promise a percentage reduction in advance.

## Decisions outside an engineering change

The firm's approved records policy and counsel determine what to retain and when disposal is permitted. Product labels cannot make a record undiscoverable. Live OAuth connections, storage enforcement and delivery retrieval require credentials and operator verification. Pilot baseline selection, prices and notification/escalation policies require firm agreement. None of those decisions is silently defaulted by this release.
