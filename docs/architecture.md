# Architecture

## Entity-relationship diagram

```
┌─────────────┐        ┌──────────────┐        ┌──────────────────┐
│    User     │1      *│    Policy    │1      *│       Claim       │
│─────────────│◄───────│──────────────│◄───────│───────────────────│
│ id          │policy-  │ id           │policy   │ id                │
│ email       │holder   │ policyNumber │Id       │ claimNumber       │
│ phone       │        │ insurerName  │        │ policyId          │
│ passwordHash│        │ policyholderId        │ policyholderId    │
│ fullName    │        │ claimType    │        │ claimType         │
│ role        │        │ startDate    │        │ incidentDate      │
│ branchId    │        │ endDate      │        │ description       │
│ locale      │        └──────────────┘        │ currentStage      │
└─────────────┘                                 │ branchOfficerId ──┼──┐
       ▲  ▲  ▲                                  │ surveyorId     ──┼──┤
       │  │  │                                  │ stageEnteredAt    │  │
       │  │  └───────────(branchOfficer)─────────┘                  │  │
       │  └──────────────(surveyor)───────────────────────────────────┘  │
       └─────────────────(policyholder, actor, uploadedBy)────────────────┘
                                                        │
                    ┌───────────────────────────────────┼───────────────────────┐
                    │                                    │                       │
                    ▼                                    ▼                       ▼
          ┌───────────────────┐               ┌──────────────────┐   ┌──────────────────┐
          │ ClaimStageEvent   │               │    Document       │   │  Notification     │
          │───────────────────│               │───────────────────│   │───────────────────│
          │ id                │               │ id                │   │ id                │
          │ claimId           │               │ claimId           │   │ userId            │
          │ fromStage (null?) │               │ tag               │   │ claimId (null?)   │
          │ toStage           │               │ fileName          │   │ channel           │
          │ actorId ──────────┼──► User        │ storageKey        │   │ status            │
          │ note              │               │ mimeType          │   │ subject           │
          │ createdAt         │               │ sizeBytes         │   │ body              │
          └───────────────────┘               │ checksum          │   │ sentAt            │
                append-only,                  │ version           │   │ error             │
                never mutated                 │ supersedesId ─────┼─┐ │ createdAt         │
                                               │ uploadedById ─────┼─┤ └──────────────────┘
                                               └───────────────────┘ │
                                                         │            │ self-relation:
                                                         ▼            │ Document.supersedesId
                                              ┌────────────────────┐  │ → Document.id
                                              │ DocumentAuditLog   │  │ (version chain)
                                              │────────────────────│  │
                                              │ id                 │  │
                                              │ documentId         │  │
                                              │ action             │  │
                                              │ actorId ───────────┼──┘
                                              │ metadata (json)    │
                                              │ createdAt          │
                                              └────────────────────┘
                                                append-only,
                                                never mutated
```

**Cardinality summary:**

- `User (policyholder) 1—* Policy` — a policyholder can hold multiple policies.
- `Policy 1—* Claim` — a policy can have multiple claims filed against it over its life.
- `User 1—* Claim` in three distinct roles — `policyholder` (who filed it), `branchOfficer` (who owns it at the branch), `surveyor` (who's assessing it). These are three separate nullable foreign keys on `Claim`, not a single "assignee" field, because a claim genuinely has up to three concurrently-relevant people attached to it.
- `Claim 1—* ClaimStageEvent` — the full stage history, append-only.
- `Claim 1—* Document` — every file attached to the claim.
- `Document 0..1—0..1 Document` (self-relation via `supersedesId`/`supersededBy`) — a version chain. The "current" version of a document is the one nothing else supersedes.
- `Document 1—* DocumentAuditLog` — every touch (upload, version, tag change, view, download), append-only.
- `User 1—* Notification`, `Claim 0..1—* Notification` — a notification is always tied to a recipient user and usually to the claim that triggered it.

## Key design decisions

### The claim stage graph lives in one place

`packages/shared/src/constants/claim-stages.ts` defines the seven stages and the legal transitions between them (`CLAIM_STAGE_TRANSITIONS`) as a single exported graph. Both `apps/api`'s state machine and `apps/web`'s status timeline import this same constant. This means:

- The frontend can never render a "next stage" button for an illegal transition, because it's reading the same allow-list the server enforces.
- Adding, removing, or reordering a stage is a one-file change, not a hunt across two codebases for every place the pipeline is encoded.

### Stage transitions are server-authoritative, always

`apps/api/src/modules/claims/claim-state-machine.ts` (`assertValidClaimStageTransition`) is the *only* function permitted to decide whether a claim may move from one stage to another. It:

1. Reads the claim's real current stage from the database (never a client-supplied value).
2. Rejects any transition out of a terminal stage (`APPROVED`'s further move to `PAYMENT_PROCESSED` aside — see the graph — `REJECTED` and `PAYMENT_PROCESSED` are dead ends).
3. Checks the transition exists in the shared graph.
4. Checks the acting user's role is permitted to *initiate* a move into that target stage (e.g. only a `SURVEYOR` can mark `ASSESSMENT_COMPLETE`; `ADMIN` can always override, as a support break-glass).

`claims.service.ts` calls this inside a Prisma transaction that updates `Claim.currentStage` and appends a `ClaimStageEvent` atomically — the event log and the claim's denormalized "current stage" field can never disagree.

### Documents: checksummed on write, re-verified on read, audited on every touch

Upload flow (`documents.service.ts`): compute a sha256 checksum of the incoming bytes → save via the `StorageAdapter` → write the `Document` row with that checksum → write a `DocumentAuditLog` row (`UPLOADED` or `VERSIONED`), all inside one transaction.

Read flow: read bytes back from the `StorageAdapter` → recompute the checksum → compare against what's stored on the `Document` row. A mismatch throws `ChecksumMismatchError` instead of silently serving a corrupted or tampered file. Every read is itself audited (`VIEWED` / `DOWNLOADED`).

Versioning uses a self-relation (`Document.supersedesId` → `Document.id`) rather than a separate `DocumentVersion` table. This keeps "what's the latest version of this document" a simple "find the one nothing else supersedes" query, while the full version chain is still walkable.

### Storage and notifications are both behind interfaces, on purpose

- `StorageAdapter` (`apps/api/src/storage/storage.interface.ts`) is the only thing claim/document logic talks to for file bytes. `LocalDiskStorageAdapter` is what's wired up today; `S3StorageAdapter` is a stub future teams can fill in without touching any calling code.
- `SmsProvider` / `EmailProvider` (`apps/api/src/modules/notifications/providers/`) are the same pattern for outbound notifications. `ConsoleSmsProvider` / `ConsoleEmailProvider` just log locally; a Sparrow SMS integration (see `docs/roadmap.md`) plugs in by implementing `SmsProvider` and swapping the constructor argument in `NotificationsService`.

### Insurer-agnostic by construction

`Policy.insurerName` is a plain string column, not an enum or a foreign key to a hardcoded "Shikhar Insurance" record. Nothing in the claims, documents, or notification logic branches on which insurer a policy belongs to. Onboarding a second insurer is a data-entry exercise, not a migration.
