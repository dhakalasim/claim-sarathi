import { z } from "zod";
import { CLAIM_STAGES, CLAIM_TYPES } from "../constants/claim-stages.js";

export const claimTypeSchema = z.enum(CLAIM_TYPES);
export const claimStageSchema = z.enum(CLAIM_STAGES);

export const createClaimSchema = z.object({
  policyNumber: z.string().min(1),
  claimType: claimTypeSchema,
  incidentDate: z.coerce.date().max(new Date(), "incident date cannot be in the future"),
  description: z.string().min(10).max(5000),
});
export type CreateClaimInput = z.infer<typeof createClaimSchema>;

/**
 * The client only ever expresses an *intent* to move to a target stage.
 * Whether that's legal from the claim's current stage is decided entirely
 * server-side by the claim state machine — never trust this as the truth.
 */
export const transitionClaimStageSchema = z.object({
  toStage: claimStageSchema,
  note: z.string().max(2000).optional(),
});
export type TransitionClaimStageInput = z.infer<typeof transitionClaimStageSchema>;

export const assignClaimSchema = z.object({
  branchOfficerId: z.string().uuid().optional(),
  surveyorId: z.string().uuid().optional(),
});
export type AssignClaimInput = z.infer<typeof assignClaimSchema>;

export const claimStageEventSchema = z.object({
  id: z.string().uuid(),
  fromStage: claimStageSchema.nullable(),
  toStage: claimStageSchema,
  actorId: z.string().uuid(),
  actorName: z.string(),
  note: z.string().nullable(),
  createdAt: z.coerce.date(),
});
export type ClaimStageEvent = z.infer<typeof claimStageEventSchema>;

export const claimSchema = z.object({
  id: z.string().uuid(),
  claimNumber: z.string(),
  policyId: z.string().uuid(),
  policyholderId: z.string().uuid(),
  claimType: claimTypeSchema,
  incidentDate: z.coerce.date(),
  description: z.string(),
  currentStage: claimStageSchema,
  branchOfficerId: z.string().uuid().nullable(),
  surveyorId: z.string().uuid().nullable(),
  stageEnteredAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type Claim = z.infer<typeof claimSchema>;

export const claimListQuerySchema = z.object({
  stage: claimStageSchema.optional(),
  claimType: claimTypeSchema.optional(),
  slaBreached: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type ClaimListQuery = z.infer<typeof claimListQuerySchema>;
