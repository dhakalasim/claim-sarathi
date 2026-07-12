import type { FastifyInstance } from "fastify";
import { loginSchema, registerSchema } from "@claimsarathi/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { AuthError, AuthService } from "./auth.service.js";

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const authService = new AuthService(app.prisma);

  app.post("/auth/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "invalid input", details: parsed.error.flatten() });
    }

    try {
      const user = await authService.register(parsed.data);
      const token = app.jwt.sign({ sub: user.id, role: user.role, locale: user.locale as "en" | "ne" });
      return reply.code(201).send({
        token,
        user: { id: user.id, fullName: user.fullName, role: user.role, locale: user.locale },
      });
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(409).send({ error: "conflict", message: err.message });
      }
      throw err;
    }
  });

  app.post("/auth/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "invalid input", details: parsed.error.flatten() });
    }

    try {
      const user = await authService.validateCredentials(parsed.data);
      const token = app.jwt.sign({ sub: user.id, role: user.role, locale: user.locale as "en" | "ne" });
      return reply.send({
        token,
        user: { id: user.id, fullName: user.fullName, role: user.role, locale: user.locale },
      });
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(401).send({ error: "unauthorized", message: err.message });
      }
      throw err;
    }
  });

  app.get("/auth/me", { preHandler: authenticate }, async (request, reply) => {
    const user = await app.prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user) {
      return reply.code(404).send({ error: "not_found", message: "user not found" });
    }
    return reply.send({
      id: user.id,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      role: user.role,
      locale: user.locale,
      createdAt: user.createdAt,
    });
  });
}
