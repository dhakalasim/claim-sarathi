# ClaimSarathi

Claims tracking and document management for Nepal's non-life insurance market.

## The problem

Policyholders in Nepal have almost no visibility into their insurance claims once they're filed. A claim moves between a branch office, a surveyor, and head office — and at each handoff, status lives in someone's memory or a phone call, not in a shared system. Customers report claim delays, misplaced paperwork, and unreliable phone support as the norm, not the exception. Physical documents get lost or re-requested, sometimes more than once, because there's no single record of what was submitted, when, or by whom.

ClaimSarathi is a claims pipeline that:

- gives **policyholders** a real-time view of where their claim stands,
- gives **insurers** (branch officers, surveyors, admins) a structured queue instead of a filing cabinet and a phone line,
- and makes documents **impossible to lose quietly** — every upload is checksummed and every access is logged.

The initial design partner is **Shikhar Insurance**, but nothing in the data model or business logic assumes a single insurer — `Policy.insurerName` is data, not code, so onboarding additional insurers later doesn't require a schema change.

## Architecture at a glance

```
apps/api      Fastify + TypeScript API. Owns the Postgres database (via Prisma),
              the claim state machine, document storage, and notification stubs.
apps/web      React + Vite + TypeScript + Tailwind frontend. Mobile-first —
              most policyholders will use this on a phone.
packages/shared  Zod schemas, the claim stage graph, and shared TypeScript types.
              Both apps import from here so validation rules and the stage
              graph can never drift between frontend and backend.
```

See [docs/architecture.md](docs/architecture.md) for the entity-relationship diagram and the reasoning behind key design decisions (the state machine, document versioning, the storage/notification abstractions).

### Why a monorepo with a shared package

The claim status pipeline (`REGISTERED → DOCUMENTS_UNDER_REVIEW → SURVEYOR_ASSIGNED → ASSESSMENT_COMPLETE → APPROVED/REJECTED → PAYMENT_PROCESSED`) is defined once, in `packages/shared/src/constants/claim-stages.ts`. The API's state machine enforces it server-side; the web app's status timeline renders from the same source. A client can never display — or attempt — a transition the server doesn't already consider legal.

### Trust boundaries that matter

- **Stage transitions are never client-supplied.** A client can only express an *intent* ("move this claim to Surveyor Assigned"). The server reads the claim's actual current stage from the database and validates the transition through `apps/api/src/modules/claims/claim-state-machine.ts` before anything is written.
- **Every document is checksummed on upload** (sha256) and **re-verified on every read**. If the bytes coming back from storage don't match what was recorded at upload time, the read fails loudly instead of silently serving a corrupted file.
- **Every document touch is audited** — upload, new version, tag change, view, download — as an append-only `DocumentAuditLog` row. Nothing about a document's history is ever overwritten or deleted.

## Tech stack

| Layer | Choice |
|---|---|
| API | Node.js, TypeScript, Fastify, Prisma, PostgreSQL |
| Web | React, TypeScript, Vite, Tailwind CSS |
| Validation | Zod, shared between API and web via `packages/shared` |
| Auth | JWT, role-based access control (`policyholder`, `branch_officer`, `surveyor`, `admin`) |
| File storage | Local disk by default, behind a `StorageAdapter` interface (S3-compatible adapter stubbed) |
| i18n | English and Nepali (`en`, `ne`) from day one, via `react-i18next` |

## Getting started

### Prerequisites

- Node.js 20+
- Docker (for Postgres, or run the full stack via `docker compose`)

### Local development

```bash
# 1. Install dependencies (npm workspaces install apps/* and packages/* together)
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. Start Postgres (or run the whole stack — see below)
docker compose up -d postgres

# 4. Apply the database schema and generate the Prisma client
npm run db:generate --workspace @claimsarathi/api
npm run db:migrate --workspace @claimsarathi/api

# 5. Seed realistic demo data (3 users per role, 10 claims across every stage and claim type)
npm run db:seed --workspace @claimsarathi/api

# 6. Run the API and the web app in separate terminals
npm run dev:api
npm run dev:web
```

The API listens on `http://localhost:4000`, the web app on `http://localhost:5173`.

All seeded demo users share the password `Password123!` — see `apps/api/prisma/seed.ts` for the full list of seeded emails (e.g. `sita.sharma@example.com` as a policyholder, `suresh.koirala@shikhar.example` as a branch officer, `bishnu.adhikari@shikhar.example` as a surveyor, `sunita.bhattarai@shikhar.example` as an admin).

### Running everything via Docker Compose

```bash
docker compose up --build
```

This starts Postgres, the API, and the web app together. Run the migrate/seed commands above once against the containerized database if you haven't already (`docker compose exec api npm run db:migrate:deploy` then `docker compose exec api npm run db:seed`).

### Tests, lint, typecheck

```bash
npm run test        # all workspaces — includes the claim state machine and document checksum tests
npm run lint
npm run typecheck
```

## Project layout

```
apps/
  api/                Fastify API — routes, services, the claim state machine, storage adapters
  web/                React frontend — pages, components, i18n
packages/
  shared/             Zod schemas, claim stage graph, shared types
docs/
  architecture.md     ERD and key design decisions
  roadmap.md          Issue-ready backlog beyond the MVP
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for coding conventions and what's expected of a PR.

## Screenshots

_Coming soon — screenshots of the policyholder claim timeline, the intake form, and the admin SLA dashboard will go here once the UI has real data behind it._

## License

[MIT](LICENSE)
