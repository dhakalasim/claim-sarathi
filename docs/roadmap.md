# Roadmap

Backlog beyond the MVP scaffold, grouped so each item can be copy-pasted into a GitHub issue more or less as-is. Titles are written as issue titles; the body under each is the issue description.

## MVP hardening

### Rate-limit auth endpoints
`/auth/login` and `/auth/register` currently have no throttling. Add per-IP and per-identifier rate limiting (e.g. `@fastify/rate-limit`) before this goes anywhere near production traffic.

### Refresh tokens / session revocation
JWTs are currently long-lived (`JWT_EXPIRES_IN=7d`) with no revocation path. Add a refresh-token flow or a server-side session/blocklist so a compromised token or an offboarded employee's access can actually be cut off.

### Claim list pagination in the UI
`ClaimListPage`, `BranchQueuePage`, `SurveyorQueuePage`, and `AdminDashboardPage` all call `GET /claims` but only render `res.items` — the API already paginates (`page`, `pageSize`, `total`), the frontend needs pagination controls.

### Document upload progress + client-side size/type validation
`PhotoUpload` accepts files with no client-side size check ahead of the 15MB server limit, and no upload progress indicator. Bad on a slow mobile connection, which is the primary use case.

### Branch officer assignment UI
`POST /claims/:id/assign` exists on the API but there's no frontend for a branch officer or admin to actually assign a surveyor to a claim. Needed before the surveyor queue means anything in practice.

### Structured logging + request IDs
Fastify's default logger is on, but there's no correlation ID threaded through a request's lifecycle for tracing a single claim's API calls across services.

### Integration tests for the claims and documents routes
Current tests cover the state machine and checksum logic in isolation (by design — those are the trust-critical paths). Add route-level tests (e.g. with a test database or Prisma mocking) covering auth + RBAC + validation end-to-end.

## Insurer admin portal

### Insurer onboarding flow
Right now `Policy.insurerName` is free text seeded manually. Build an admin UI to onboard a new insurer: branch list, staff invites, and default SLA thresholds — without any code change, in line with the insurer-agnostic design in `docs/architecture.md`.

### Per-insurer SLA configuration
`SLA_BREACH_DAYS` is a single global constant (`packages/shared/src/constants/claim-stages.ts`). Different insurers will want different thresholds per claim type. Move this to per-insurer, per-claim-type configuration.

### Insurer-branded policyholder-facing pages
The web app currently shows the ClaimSarathi brand only. Support per-insurer theming/logo on the policyholder-facing pages once a second insurer is onboarded.

### Claims analytics dashboard for insurer admins
Beyond the SLA-breach flag list, insurer admins will want aggregate views: average time-in-stage, claims by type/branch, rejection rate trends.

## Sparrow SMS integration

### Implement `SparrowSmsProvider`
Implement `SmsProvider` (`apps/api/src/modules/notifications/providers/sms-provider.interface.ts`) against the Sparrow SMS API, and wire it in behind `SMS_PROVIDER=sparrow` in `env.ts`. Keep `ConsoleSmsProvider` as the local-dev default.

### Delivery status webhooks
Sparrow SMS (and most Nepali SMS gateways) support delivery receipts. Add a webhook endpoint to update `Notification.status` from `SENT` to a confirmed-delivered state, and handle bounces.

### SMS template localization
Notification bodies are currently a single hardcoded English string in `notifications.service.ts`. Route them through the `en`/`ne` i18n resources so a Nepali-locale policyholder gets an SMS in Nepali.

## Nepali OCR for document auto-tagging

### Evaluate OCR providers for Devanagari + Nepali citizenship documents
Research which OCR engines (Tesseract with Nepali trained data, cloud OCR APIs) reliably extract text from Nepali citizenship certificates and policy documents.

### Auto-suggest document tags on upload
When a policyholder uploads a document without explicitly picking a tag, run OCR and suggest `CITIZENSHIP` / `POLICY_COPY` / `BILL` / `SURVEYOR_REPORT` based on extracted text, surfaced as a confirm-or-correct step rather than a silent auto-tag (a wrong auto-tag is worse than no auto-tag).

### Extract structured fields from surveyor reports
Once OCR is in place, explore pulling structured fields (assessed amount, damage category) out of scanned surveyor reports directly into `Claim` metadata, reducing manual re-entry by branch officers.

## WhatsApp/Viber status bot

### Viber bot for claim status lookup
Customers already use Viber for claims-related contact with insurers in Nepal. Build a bot that accepts a claim number (or is linked to a phone number on file) and replies with current stage — same underlying data as the policyholder web view, different channel.

### WhatsApp Business API integration
Same idea via WhatsApp Business API for policyholders who prefer it. Likely shares a common "claim status responder" service with the Viber bot rather than being built twice.

### Two-way document upload via chat
Stretch goal: let a policyholder send a photo directly in Viber/WhatsApp and have it land in the document vault tagged `PHOTO`, with the same checksum/audit trail as a web upload.

## NIA compliance / audit export

### Research Nepal Insurance Authority (NIA) reporting requirements
Identify what claims data and audit trail NIA (or its then-current successor body) requires insurers to retain and report, and on what cadence.

### Immutable audit export (PDF/CSV) per claim
Generate a full audit trail export for a single claim — every stage event, every document action — as a downloadable, tamper-evident report suitable for a regulator or dispute.

### Data retention policy enforcement
Once retention requirements are known, implement enforced retention (and safe deletion only after the retention window) for claims, documents, and audit logs rather than indefinite storage by default.

### Compliance officer role
Evaluate whether NIA reporting requires a fifth role (e.g. `compliance_officer`) with read-only, audit-focused access distinct from `admin`'s operational access.
