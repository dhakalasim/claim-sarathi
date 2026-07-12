import { randomBytes } from "node:crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import {
  SLA_BREACH_DAYS,
  type ClaimListQuery,
  type CreateClaimInput,
  type Role,
} from "@claimsarathi/shared";
import { assertValidClaimStageTransition } from "./claim-state-machine.js";
import { NotificationsService } from "../notifications/notifications.service.js";

export class ClaimNotFoundError extends Error {
  constructor(claimId: string) {
    super(`claim ${claimId} not found`);
  }
}

export class PolicyNotFoundError extends Error {
  constructor(policyNumber: string) {
    super(`policy ${policyNumber} not found`);
  }
}

/** Never select passwordHash into an API response — this is the shape every relation to User must use. */
const SAFE_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  locale: true,
} satisfies Prisma.UserSelect;

function generateClaimNumber(): string {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const suffix = randomBytes(4).toString("hex").toUpperCase();
  return `CS-${yearMonth}-${suffix}`;
}

export class ClaimsService {
  private readonly notifications: NotificationsService;

  constructor(private readonly prisma: PrismaClient) {
    this.notifications = new NotificationsService(prisma);
  }

  async createClaim(policyholderId: string, input: CreateClaimInput) {
    const policy = await this.prisma.policy.findUnique({ where: { policyNumber: input.policyNumber } });
    if (!policy) {
      throw new PolicyNotFoundError(input.policyNumber);
    }

    return this.prisma.$transaction(async (tx) => {
      const claim = await tx.claim.create({
        data: {
          claimNumber: generateClaimNumber(),
          policyId: policy.id,
          policyholderId,
          claimType: input.claimType,
          incidentDate: input.incidentDate,
          description: input.description,
          currentStage: "REGISTERED",
          stageEnteredAt: new Date(),
        },
      });

      await tx.claimStageEvent.create({
        data: {
          claimId: claim.id,
          fromStage: null,
          toStage: "REGISTERED",
          actorId: policyholderId,
          note: "Claim registered by policyholder",
        },
      });

      return claim;
    });
  }

  async listClaims(query: ClaimListQuery, scope: { role: Role; userId: string }) {
    const where: Prisma.ClaimWhereInput = {};

    if (query.stage) where.currentStage = query.stage;
    if (query.claimType) where.claimType = query.claimType;

    if (scope.role === "POLICYHOLDER") {
      where.policyholderId = scope.userId;
    } else if (scope.role === "SURVEYOR") {
      where.surveyorId = scope.userId;
    } else if (scope.role === "BRANCH_OFFICER") {
      where.branchOfficerId = scope.userId;
    }
    // ADMIN sees everything.

    if (query.slaBreached) {
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - SLA_BREACH_DAYS);
      where.stageEnteredAt = { lte: threshold };
      where.currentStage = { notIn: ["APPROVED", "REJECTED", "PAYMENT_PROCESSED"] };
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.claim.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.claim.count({ where }),
    ]);

    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async getClaimById(claimId: string) {
    const claim = await this.prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        stageEvents: {
          orderBy: { createdAt: "asc" },
          include: { actor: { select: SAFE_USER_SELECT } },
        },
        documents: true,
        policyholder: { select: SAFE_USER_SELECT },
      },
    });

    if (!claim) {
      throw new ClaimNotFoundError(claimId);
    }

    return claim;
  }

  /**
   * The only path by which a claim's stage may change. Reads the claim's
   * real current stage from the database (never trusts a client-supplied
   * "from" value), validates the transition through the state machine, then
   * atomically updates the claim and appends an audit event.
   */
  async transitionStage(params: {
    claimId: string;
    toStage: import("@claimsarathi/shared").ClaimStage;
    actorId: string;
    actorRole: Role;
    note?: string;
  }) {
    const claim = await this.prisma.claim.findUnique({ where: { id: params.claimId } });
    if (!claim) {
      throw new ClaimNotFoundError(params.claimId);
    }

    assertValidClaimStageTransition({
      fromStage: claim.currentStage,
      toStage: params.toStage,
      actorRole: params.actorRole,
    });

    const [updated] = await this.prisma.$transaction([
      this.prisma.claim.update({
        where: { id: claim.id },
        data: { currentStage: params.toStage, stageEnteredAt: new Date() },
      }),
      this.prisma.claimStageEvent.create({
        data: {
          claimId: claim.id,
          fromStage: claim.currentStage,
          toStage: params.toStage,
          actorId: params.actorId,
          note: params.note,
        },
      }),
    ]);

    const policyholder = await this.prisma.user.findUnique({ where: { id: claim.policyholderId } });
    if (policyholder) {
      await this.notifications.notifyStageChange({
        userId: policyholder.id,
        claimId: claim.id,
        claimNumber: claim.claimNumber,
        toStage: params.toStage,
        phone: policyholder.phone,
        email: policyholder.email,
      });
    }

    return updated;
  }

  async assignClaim(claimId: string, assignment: { branchOfficerId?: string; surveyorId?: string }) {
    const claim = await this.prisma.claim.findUnique({ where: { id: claimId } });
    if (!claim) {
      throw new ClaimNotFoundError(claimId);
    }

    return this.prisma.claim.update({
      where: { id: claimId },
      data: {
        ...(assignment.branchOfficerId ? { branchOfficerId: assignment.branchOfficerId } : {}),
        ...(assignment.surveyorId ? { surveyorId: assignment.surveyorId } : {}),
      },
    });
  }
}
