# Guided onboarding and an action-led Home

The first outcome is a meeting record the user understands and can move through review. Setup and integrations support that outcome.

## Journey

New workspace/signup/payment-success → `/onboarding` → recording retention decision (CCO) → first upload → transcript/summary review → the next review stage available to the user's role → finalization.

- Home replaces an empty metrics dashboard with getting-started guidance when there are neither meetings nor correspondence. Existing correspondence-only workspaces keep their overview.
- Returning users see a next-action card above the overview. It points to an actual available review stage, a processing record, first upload, existing correspondence or the interaction log.
- Actual progress comes from the database, independent of dashboard date filters. Hiding the guide and finishing the tour do not complete milestones.
- Owner/CCO, compliance manager and advisor get different tasks. Only the owner sees policy/integration/team setup links. Record actions follow the existing status workflow.
- A missing media decision continues to block new uploads. It does not prevent a user from continuing an existing review.
- The guide can be reopened through Getting started or the walkthrough button. Hiding it uses the existing per-membership dismissal endpoint and checks the HTTP result before hiding anything.
- While a recording is processing, visible pages refresh every 30 seconds. A recorded processing failure gets an attention message and no polling. No new jobs, compliance findings, approvals or messages are created by this feature.
- The existing billing/usage page stays at `/welcome`. Broken legacy payment redirect targets are replaced by `/onboarding`. Signup email points to the same guided setup.

## Review the UI

`/journey-preview` is a sample-data preview available only in development or Vercel Preview deployments. It supports switching scenario, role, Home/setup mode and light/dark theme, with the real walkthrough component. Task links lead to real application routes and require sign-in. The sample surface returns 404 in production. Authenticated onboarding remains behind the existing app layout/middleware.

## Validation

`npx vitest run src/lib/onboarding/journey.test.ts src/server/onboarding/load-workspace-journey.test.ts`, `npm run test:ui`, `npm run typecheck` and `next build`.

The tests cover workflow priorities, active membership and workspace scoping, role-specific stages, correspondence-only workspaces, processing failure copy, actual completion facts, dismissal failure and replaying the tour.

## Product boundary

This is the first-use and return-visit layer. It does not add a cross-system to-do list, predict compliance risk, send reminders, or redesign the compliance cockpit. Later proactive suggestions should follow real sources and explicit user actions rather than inventing urgency or creating new automatic findings.
