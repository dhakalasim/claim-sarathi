import { describe, expect, it } from "vitest";
import { isClaimInScope } from "../src/modules/assistant/scope.js";

/**
 * The AI assistant's get_claim_detail tool is the one place a client
 * message can influence which claim gets fetched by ID — a user could
 * prompt-inject a claim number that isn't theirs. isClaimInScope is the
 * enforcement point, independent of whatever the model decides to ask for.
 */
describe("assistant claim scope enforcement", () => {
  const claim = {
    policyholderId: "policyholder-1",
    surveyorId: "surveyor-1",
    branchOfficerId: "branch-1",
  };

  it("allows a policyholder to see only their own claim", () => {
    expect(isClaimInScope(claim, { role: "POLICYHOLDER", userId: "policyholder-1" })).toBe(true);
    expect(isClaimInScope(claim, { role: "POLICYHOLDER", userId: "someone-else" })).toBe(false);
  });

  it("allows the assigned surveyor but not an unassigned one", () => {
    expect(isClaimInScope(claim, { role: "SURVEYOR", userId: "surveyor-1" })).toBe(true);
    expect(isClaimInScope(claim, { role: "SURVEYOR", userId: "a-different-surveyor" })).toBe(false);
  });

  it("allows the assigned branch officer but not an unassigned one", () => {
    expect(isClaimInScope(claim, { role: "BRANCH_OFFICER", userId: "branch-1" })).toBe(true);
    expect(isClaimInScope(claim, { role: "BRANCH_OFFICER", userId: "a-different-branch-officer" })).toBe(false);
  });

  it("denies a policyholder impersonating a surveyor/branch officer id as their own userId", () => {
    // Guards against a subtle mix-up: someone's userId happening to equal
    // another claim's surveyorId/branchOfficerId must not grant them access
    // to a claim they don't actually own as a policyholder.
    expect(isClaimInScope(claim, { role: "POLICYHOLDER", userId: "surveyor-1" })).toBe(false);
    expect(isClaimInScope(claim, { role: "POLICYHOLDER", userId: "branch-1" })).toBe(false);
  });

  it("always allows admin, regardless of assignment", () => {
    expect(isClaimInScope(claim, { role: "ADMIN", userId: "anyone" })).toBe(true);
  });

  it("denies a surveyor/branch officer when the claim has no assignment yet", () => {
    const unassigned = { policyholderId: "policyholder-1", surveyorId: null, branchOfficerId: null };
    expect(isClaimInScope(unassigned, { role: "SURVEYOR", userId: "surveyor-1" })).toBe(false);
    expect(isClaimInScope(unassigned, { role: "BRANCH_OFFICER", userId: "branch-1" })).toBe(false);
  });
});
