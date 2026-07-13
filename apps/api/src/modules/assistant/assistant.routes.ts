import type { FastifyInstance } from "fastify";
import { assistantChatRequestSchema } from "@claimsarathi/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { AssistantNotConfiguredError, AssistantService } from "./assistant.service.js";

export async function assistantRoutes(app: FastifyInstance): Promise<void> {
  const assistantService = new AssistantService(app.prisma);

  app.addHook("preHandler", authenticate);

  app.post("/assistant/chat", async (request, reply) => {
    const parsed = assistantChatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "invalid input", details: parsed.error.flatten() });
    }

    try {
      const replyText = await assistantService.chat({
        messages: parsed.data.messages,
        scope: { role: request.user.role, userId: request.user.sub, locale: request.user.locale },
      });
      return reply.send({ reply: replyText });
    } catch (err) {
      if (err instanceof AssistantNotConfiguredError) {
        return reply.code(503).send({ error: "not_configured", message: err.message });
      }
      throw err;
    }
  });
}
