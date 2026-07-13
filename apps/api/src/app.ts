import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { env } from "./config/env.js";
import { prismaPlugin } from "./plugins/prisma.js";
import { jwtPlugin } from "./plugins/jwt.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { claimsRoutes } from "./modules/claims/claims.routes.js";
import { documentsRoutes } from "./modules/documents/documents.routes.js";
import { assistantRoutes } from "./modules/assistant/assistant.routes.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: env.CORS_ORIGIN });
  await app.register(multipart);
  await app.register(prismaPlugin);
  await app.register(jwtPlugin);

  app.get("/health", async () => ({ status: "ok" }));

  await app.register(authRoutes);
  await app.register(claimsRoutes);
  await app.register(documentsRoutes);
  await app.register(assistantRoutes);

  return app;
}
