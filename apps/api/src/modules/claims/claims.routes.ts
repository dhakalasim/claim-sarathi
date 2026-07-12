import type { FastifyInstance } from "fastify";
import {
  assignClaimSchema,
  claimListQuerySchema,
  createClaimSchema,
  transitionClaimStageSchema,
} from "@claimsarathi/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { authorize } from "../../middleware/authorize.js";
import { IllegalClaimStageTransitionError, ForbiddenClaimStageActorError } from "./claim-state-machine.js";
import { ClaimNotFoundError, ClaimsService, PolicyNotFoundError } from "./claims.service.js";

export async function claimsRoutes(app: FastifyInstance): Promise<void> {
  const claimsService = new ClaimsService(app.prisma);

  app.addHook("preHandler", authenticate);

  app.post("/claims", { preHandler: authorize("POLICYHOLDER") }, async (request, reply) => {
    const parsed = createClaimSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "invalid input", details: parsed.error.flatten() });
    }

    try {
      const claim = await claimsService.createClaim(request.user.sub, parsed.data);
      return reply.code(201).send(claim);
    } catch (err) {
      if (err instanceof PolicyNotFoundError) {
        return reply.code(404).send({ error: "not_found", message: err.message });
      }
      throw err;
    }
  });

  app.get("/claims", async (request, reply) => {
    const parsed = claimListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "invalid query", details: parsed.error.flatten() });
    }

    const result = await claimsService.listClaims(parsed.data, {
      role: request.user.role,
      userId: request.user.sub,
    });
    return reply.send(result);
  });

  app.get("/claims/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const claim = await claimsService.getClaimById(id);
      return reply.send(claim);
    } catch (err) {
      if (err instanceof ClaimNotFoundError) {
        return reply.code(404).send({ error: "not_found", message: err.message });
      }
      throw err;
    }
  });

  app.post(
    "/claims/:id/transition",
    { preHandler: authorize("BRANCH_OFFICER", "SURVEYOR", "ADMIN") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = transitionClaimStageSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "validation_error", message: "invalid input", details: parsed.error.flatten() });
      }

      try {
        const claim = await claimsService.transitionStage({
          claimId: id,
          toStage: parsed.data.toStage,
          note: parsed.data.note,
          actorId: request.user.sub,
          actorRole: request.user.role,
        });
        return reply.send(claim);
      } catch (err) {
        if (err instanceof ClaimNotFoundError) {
          return reply.code(404).send({ error: "not_found", message: err.message });
        }
        if (err instanceof IllegalClaimStageTransitionError) {
          return reply.code(422).send({ error: "illegal_transition", message: err.message });
        }
        if (err instanceof ForbiddenClaimStageActorError) {
          return reply.code(403).send({ error: "forbidden", message: err.message });
        }
        throw err;
      }
    },
  );

  app.post(
    "/claims/:id/assign",
    { preHandler: authorize("BRANCH_OFFICER", "ADMIN") },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const parsed = assignClaimSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "validation_error", message: "invalid input", details: parsed.error.flatten() });
      }

      try {
        const claim = await claimsService.assignClaim(id, parsed.data);
        return reply.send(claim);
      } catch (err) {
        if (err instanceof ClaimNotFoundError) {
          return reply.code(404).send({ error: "not_found", message: err.message });
        }
        throw err;
      }
    },
  );
}
