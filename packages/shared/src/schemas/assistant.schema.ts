import { z } from "zod";

export const assistantChatRoleSchema = z.enum(["user", "assistant"]);

export const assistantChatMessageSchema = z.object({
  role: assistantChatRoleSchema,
  content: z.string().min(1).max(4000),
});
export type AssistantChatMessage = z.infer<typeof assistantChatMessageSchema>;

export const assistantChatRequestSchema = z.object({
  /** Full conversation so far, including the new user message last. Stateless — the client owns history. */
  messages: z.array(assistantChatMessageSchema).min(1).max(20),
});
export type AssistantChatRequest = z.infer<typeof assistantChatRequestSchema>;

export const assistantChatResponseSchema = z.object({
  reply: z.string(),
});
export type AssistantChatResponse = z.infer<typeof assistantChatResponseSchema>;
