# Contributing to ClaimSarathi

## Getting started

1. `npm install` at the repo root (npm workspaces install everything for `apps/*` and `packages/*`).
2. Copy `.env.example` to `.env` and adjust if needed.
3. `docker compose up -d postgres` to start the database.
4. `npm run db:migrate --workspace apps/api` then `npm run db:seed --workspace apps/api`.
5. `npm run dev:api` and `npm run dev:web` in separate terminals.

See [README.md](./README.md) for the full setup walkthrough and [docs/architecture.md](./docs/architecture.md) for how the pieces fit together.

## Ground rules

- **Strict TypeScript everywhere.** No `any` without a comment explaining why it's unavoidable.
- **Validate at every API boundary.** Every route handler in `apps/api` validates its input with a Zod schema from `packages/shared`. Never trust a request body, query param, or path param without parsing it first.
- **The claim state machine is server-side, full stop.** `apps/api/src/modules/claims/claim-state-machine.ts` is the only place a claim's stage may change. The client sends an intent ("move to Surveyor Assigned"); the server decides if that's a legal transition from the claim's current stage. Never add a code path that lets a client set `currentStage` directly.
- **Every document mutation is audited.** Uploads, new versions, tag changes, views, and downloads all write a `DocumentAuditLog` row. If you add a new way to touch a document, add the corresponding audit action.
- **No hardcoded user-facing strings.** All UI text goes through the i18n layer (`apps/web/src/i18n/en.json` and `ne.json`). If you add a string in English, add its Nepali counterpart in the same PR — a missing key should never silently fall back in production.
- **Insurer-agnostic.** Don't hardcode "Shikhar" (or any single insurer) into logic, enums, or schemas. Insurer identity is data (`Policy.insurerName`), not code.

## Testing expectations

The trust-critical paths — the claim state machine and the document checksum/audit logic — have tests in `apps/api/tests/`. If you touch either:

- Add a test for every new transition or every new rejection case (illegal jump, missing actor, etc.) in `claim-state-machine.test.ts`.
- Add a test for every new document lifecycle event in `document-checksum.test.ts` covering both the checksum computation and the resulting audit log entry.

Run everything with:

```bash
npm run typecheck
npm run lint
npm run test
```

All three run in CI on every PR (see `.github/workflows/ci.yml`).

## Commit style

Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`). Keep commits scoped to one logical change.

## Branching / PRs

- Branch from `main`, open a PR against `main`.
- CI (lint + typecheck + test) must pass before merge.
- Prefer small, reviewable PRs over one giant diff.
