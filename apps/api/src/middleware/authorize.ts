import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@claimsarathi/shared";

export function authorize(...allowedRoles: Role[]) {
  return async function authorizeHandler(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const role = request.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      await reply.code(403).send({ error: "forbidden", message: "insufficient role for this action" });
    }
  };
}
