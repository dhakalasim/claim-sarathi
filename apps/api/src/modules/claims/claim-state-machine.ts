import {
  CLAIM_STAGE_TRANSITIONS,
  TERMINAL_STAGES,
  isValidClaimStageTransition,
  type ClaimStage,
  type Role,
} from "@claimsarathi/shared";

export class IllegalClaimStageTransitionError extends Error {
  constructor(
    public readonly fromStage: ClaimStage,
    public readonly toStage: ClaimStage,
  ) {
    super(`cannot transition claim from ${fromStage} to ${toStage}`);
    this.name = "IllegalClaimStageTransitionError";
  }
}

export class ForbiddenClaimStageActorError extends Error {
  constructor(role: Role, toStage: ClaimStage) {
    super(`role ${role} is not permitted to move a claim to ${toStage}`);
    this.name = "ForbiddenClaimStageActorError";
  }
}

/**
 * Which role(s) may *initiate* a transition into a given target stage.
 * ADMIN can always act, as a break-glass override for support cases.
 */
const STAGE_ENTRY_PERMISSIONS: Readonly<Record<ClaimStage, readonly Role[]>> = {
  REGISTERED: ["POLICYHOLDER"],
  DOCUMENTS_UNDER_REVIEW: ["BRANCH_OFFICER"],
  SURVEYOR_ASSIGNED: ["BRANCH_OFFICER"],
  ASSESSMENT_COMPLETE: ["SURVEYOR"],
  APPROVED: ["BRANCH_OFFICER"],
  REJECTED: ["BRANCH_OFFICER"],
  PAYMENT_PROCESSED: ["BRANCH_OFFICER"],
};

/**
 * The single authority for whether a claim may move from one stage to
 * another. This is pure and side-effect free by design: the caller
 * (claims.service.ts) is responsible for persisting the result. Never let a
 * client-supplied `currentStage` bypass this — always read the claim's real
 * current stage from the database before calling this.
 */
export function assertValidClaimStageTransition(params: {
  fromStage: ClaimStage;
  toStage: ClaimStage;
  actorRole: Role;
}): void {
  const { fromStage, toStage, actorRole } = params;

  if (TERMINAL_STAGES.has(fromStage)) {
    throw new IllegalClaimStageTransitionError(fromStage, toStage);
  }

  if (!isValidClaimStageTransition(fromStage, toStage)) {
    throw new IllegalClaimStageTransitionError(fromStage, toStage);
  }

  const allowedRoles = STAGE_ENTRY_PERMISSIONS[toStage];
  if (actorRole !== "ADMIN" && !allowedRoles.includes(actorRole)) {
    throw new ForbiddenClaimStageActorError(actorRole, toStage);
  }
}

export function getAllowedNextStages(fromStage: ClaimStage): readonly ClaimStage[] {
  return CLAIM_STAGE_TRANSITIONS[fromStage];
}
