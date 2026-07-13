import type { Role } from "@claimsarathi/shared";

/**
 * Whether a claim is within a given role/user's authorized scope — the same
 * rule ClaimsService.listClaims applies via its Prisma `where` clause,
 * extracted here as a pure function so the AI assistant's tools can enforce
 * it on every individual claim they're asked to fetch. The assistant must
 * never trust a model-supplied claim number as pre-authorized: a user could
 * prompt-inject a claim that isn't theirs, and the underlying
 * ClaimsService.getClaimById has no built-in ownership check.
 */
export function isClaimInScope(
  claim: { policyholderId: string; surveyorId: string | null; branchOfficerId: string | null },
  scope: { role: Role; userId: string },
): boolean {
  switch (scope.role) {
    case "ADMIN":
      return true;
    case "POLICYHOLDER":
      return claim.policyholderId === scope.userId;
    case "SURVEYOR":
      return claim.surveyorId === scope.userId;
    case "BRANCH_OFFICER":
      return claim.branchOfficerId === scope.userId;
  }
}
