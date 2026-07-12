import { describe, expect, it } from "vitest";
import {
  ForbiddenClaimStageActorError,
  IllegalClaimStageTransitionError,
  assertValidClaimStageTransition,
  getAllowedNextStages,
} from "../src/modules/claims/claim-state-machine.js";

describe("claim state machine", () => {
  it("allows the standard happy-path transitions", () => {
    expect(() =>
      assertValidClaimStageTransition({ fromStage: "REGISTERED", toStage: "DOCUMENTS_UNDER_REVIEW", actorRole: "BRANCH_OFFICER" }),
    ).not.toThrow();

    expect(() =>
      assertValidClaimStageTransition({ fromStage: "DOCUMENTS_UNDER_REVIEW", toStage: "SURVEYOR_ASSIGNED", actorRole: "BRANCH_OFFICER" }),
    ).not.toThrow();

    expect(() =>
      assertValidClaimStageTransition({ fromStage: "SURVEYOR_ASSIGNED", toStage: "ASSESSMENT_COMPLETE", actorRole: "SURVEYOR" }),
    ).not.toThrow();

    expect(() =>
      assertValidClaimStageTransition({ fromStage: "ASSESSMENT_COMPLETE", toStage: "APPROVED", actorRole: "BRANCH_OFFICER" }),
    ).not.toThrow();

    expect(() =>
      assertValidClaimStageTransition({ fromStage: "APPROVED", toStage: "PAYMENT_PROCESSED", actorRole: "BRANCH_OFFICER" }),
    ).not.toThrow();
  });

  it("allows rejection from any non-terminal stage", () => {
    for (const fromStage of ["REGISTERED", "DOCUMENTS_UNDER_REVIEW", "SURVEYOR_ASSIGNED", "ASSESSMENT_COMPLETE"] as const) {
      expect(() =>
        assertValidClaimStageTransition({ fromStage, toStage: "REJECTED", actorRole: "BRANCH_OFFICER" }),
      ).not.toThrow();
    }
  });

  it("rejects illegal forward jumps (skipping stages)", () => {
    expect(() =>
      assertValidClaimStageTransition({ fromStage: "REGISTERED", toStage: "SURVEYOR_ASSIGNED", actorRole: "BRANCH_OFFICER" }),
    ).toThrow(IllegalClaimStageTransitionError);

    expect(() =>
      assertValidClaimStageTransition({ fromStage: "REGISTERED", toStage: "PAYMENT_PROCESSED", actorRole: "ADMIN" }),
    ).toThrow(IllegalClaimStageTransitionError);
  });

  it("rejects illegal backward transitions", () => {
    expect(() =>
      assertValidClaimStageTransition({ fromStage: "SURVEYOR_ASSIGNED", toStage: "REGISTERED", actorRole: "ADMIN" }),
    ).toThrow(IllegalClaimStageTransitionError);
  });

  it("rejects any transition once a claim has reached a terminal stage", () => {
    expect(() =>
      assertValidClaimStageTransition({ fromStage: "PAYMENT_PROCESSED", toStage: "APPROVED", actorRole: "ADMIN" }),
    ).toThrow(IllegalClaimStageTransitionError);

    expect(() =>
      assertValidClaimStageTransition({ fromStage: "REJECTED", toStage: "REGISTERED", actorRole: "ADMIN" }),
    ).toThrow(IllegalClaimStageTransitionError);
  });

  it("rejects a legal stage transition attempted by the wrong role", () => {
    expect(() =>
      assertValidClaimStageTransition({ fromStage: "REGISTERED", toStage: "DOCUMENTS_UNDER_REVIEW", actorRole: "POLICYHOLDER" }),
    ).toThrow(ForbiddenClaimStageActorError);

    expect(() =>
      assertValidClaimStageTransition({ fromStage: "SURVEYOR_ASSIGNED", toStage: "ASSESSMENT_COMPLETE", actorRole: "BRANCH_OFFICER" }),
    ).toThrow(ForbiddenClaimStageActorError);
  });

  it("always permits ADMIN as a break-glass override for legal transitions", () => {
    expect(() =>
      assertValidClaimStageTransition({ fromStage: "SURVEYOR_ASSIGNED", toStage: "ASSESSMENT_COMPLETE", actorRole: "ADMIN" }),
    ).not.toThrow();
  });

  it("exposes the allowed next stages for UI rendering", () => {
    expect(getAllowedNextStages("REGISTERED")).toEqual(["DOCUMENTS_UNDER_REVIEW", "REJECTED"]);
    expect(getAllowedNextStages("PAYMENT_PROCESSED")).toEqual([]);
    expect(getAllowedNextStages("REJECTED")).toEqual([]);
  });
});
