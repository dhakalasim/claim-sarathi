/**
 * Single source of truth for the claim status pipeline.
 *
 * Both the server-side state machine (apps/api) and the frontend status
 * timeline (apps/web) import this graph, so the UI can never render or
 * accept a transition the API would reject.
 */
export const CLAIM_STAGES = [
  "REGISTERED",
  "DOCUMENTS_UNDER_REVIEW",
  "SURVEYOR_ASSIGNED",
  "ASSESSMENT_COMPLETE",
  "APPROVED",
  "REJECTED",
  "PAYMENT_PROCESSED",
] as const;

export type ClaimStage = (typeof CLAIM_STAGES)[number];

/** Terminal stages: once reached, no further transition is legal. */
export const TERMINAL_STAGES: ReadonlySet<ClaimStage> = new Set([
  "REJECTED",
  "PAYMENT_PROCESSED",
]);

/**
 * Allowed forward transitions, keyed by current stage.
 * A claim may also be REJECTED from any non-terminal stage (an insurer can
 * decline a claim at any point once it has been registered).
 */
export const CLAIM_STAGE_TRANSITIONS: Readonly<Record<ClaimStage, readonly ClaimStage[]>> = {
  REGISTERED: ["DOCUMENTS_UNDER_REVIEW", "REJECTED"],
  DOCUMENTS_UNDER_REVIEW: ["SURVEYOR_ASSIGNED", "REJECTED"],
  SURVEYOR_ASSIGNED: ["ASSESSMENT_COMPLETE", "REJECTED"],
  ASSESSMENT_COMPLETE: ["APPROVED", "REJECTED"],
  APPROVED: ["PAYMENT_PROCESSED"],
  REJECTED: [],
  PAYMENT_PROCESSED: [],
};

export function isValidClaimStageTransition(from: ClaimStage, to: ClaimStage): boolean {
  return CLAIM_STAGE_TRANSITIONS[from].includes(to);
}

/** Stages considered "in flight" for SLA breach monitoring (admin dashboard). */
export const SLA_MONITORED_STAGES: readonly ClaimStage[] = CLAIM_STAGES.filter(
  (stage) => !TERMINAL_STAGES.has(stage),
);

/** Number of days a claim may sit in a single non-terminal stage before it's flagged. */
export const SLA_BREACH_DAYS = 7;

export const CLAIM_TYPES = ["MOTOR", "PROPERTY", "HEALTH", "TRAVEL", "AGRI"] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const DOCUMENT_TAGS = [
  "CITIZENSHIP",
  "POLICY_COPY",
  "BILL",
  "PHOTO",
  "SURVEYOR_REPORT",
  "OTHER",
] as const;
export type DocumentTag = (typeof DOCUMENT_TAGS)[number];

export const ROLES = ["POLICYHOLDER", "BRANCH_OFFICER", "SURVEYOR", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];
