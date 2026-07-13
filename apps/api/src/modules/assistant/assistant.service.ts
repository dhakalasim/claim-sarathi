import Anthropic from "@anthropic-ai/sdk";
import { betaTool } from "@anthropic-ai/sdk/helpers/beta/json-schema";
import type { PrismaClient } from "@prisma/client";
import type { AssistantChatMessage, Role } from "@claimsarathi/shared";
import { ClaimsService } from "../claims/claims.service.js";
import { isClaimInScope } from "./scope.js";

export class AssistantNotConfiguredError extends Error {
  constructor() {
    super("AI assistant is not configured — set ANTHROPIC_API_KEY to enable it");
  }
}

const MODEL = "claude-opus-4-8";

function systemPrompt(locale: "en" | "ne"): string {
  const language = locale === "ne" ? "Nepali" : "English";
  return [
    "You are the ClaimSarathi claims assistant, embedded in an insurance claims tracking product for Nepal's non-life insurance market.",
    `Respond in ${language}.`,
    "",
    "You help the signed-in user understand the status of their own claims. The claim pipeline has these stages, in order: " +
      "Registered -> Documents Under Review -> Surveyor Assigned -> Assessment Complete -> Approved -> Payment Processed " +
      "(a claim can also be Rejected from any non-terminal stage).",
    "",
    "Ground every factual claim in a tool result — never invent a claim number, stage, or document. " +
      "If a tool reports a claim isn't found or isn't in the user's scope, say so plainly rather than guessing. " +
      "You cannot change a claim's stage, assign staff, or upload documents — you are read-only. " +
      "If asked to do any of those, explain that it needs to be done from the relevant page in the app.",
    "Keep answers short and conversational — this is a chat widget, not a report.",
  ].join("\n");
}

export class AssistantService {
  private readonly claimsService: ClaimsService;

  constructor(private readonly prisma: PrismaClient) {
    this.claimsService = new ClaimsService(prisma);
  }

  async chat(params: { messages: AssistantChatMessage[]; scope: { role: Role; userId: string; locale: "en" | "ne" } }): Promise<string> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new AssistantNotConfiguredError();
    }

    const client = new Anthropic({ apiKey });
    const { scope } = params;

    const listMyClaims = betaTool({
      name: "list_my_claims",
      description:
        "List the signed-in user's claims (scoped to their role automatically) with claim number, type, current stage, and incident date.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false } as const,
      run: async () => {
        const result = await this.claimsService.listClaims(
          { page: 1, pageSize: 20 },
          { role: scope.role, userId: scope.userId },
        );
        return JSON.stringify(
          result.items.map((c) => ({
            claimNumber: c.claimNumber,
            claimType: c.claimType,
            currentStage: c.currentStage,
            incidentDate: c.incidentDate,
            description: c.description,
          })),
        );
      },
    });

    const getClaimDetail = betaTool({
      name: "get_claim_detail",
      description: "Get full detail for one claim by its claim number, including its stage history and documents.",
      inputSchema: {
        type: "object",
        properties: {
          claimNumber: { type: "string", description: "The claim number, e.g. CS-202601-A1B2C3" },
        },
        required: ["claimNumber"],
        additionalProperties: false,
      } as const,
      run: async ({ claimNumber }) => {
        const claim = await this.prisma.claim.findUnique({ where: { claimNumber } });
        if (!claim || !isClaimInScope(claim, scope)) {
          // Same message for "not found" and "not authorized" — never confirm
          // to the model (and therefore the end user) that a claim outside
          // their scope exists at all.
          return JSON.stringify({ error: `no claim found with number ${claimNumber}` });
        }

        const detail = await this.claimsService.getClaimById(claim.id);
        return JSON.stringify({
          claimNumber: detail.claimNumber,
          claimType: detail.claimType,
          currentStage: detail.currentStage,
          description: detail.description,
          incidentDate: detail.incidentDate,
          stageHistory: detail.stageEvents.map((e) => ({
            fromStage: e.fromStage,
            toStage: e.toStage,
            note: e.note,
            at: e.createdAt,
          })),
          documents: detail.documents.map((d) => ({ tag: d.tag, fileName: d.fileName, version: d.version })),
        });
      },
    });

    const finalMessage = await client.beta.messages.toolRunner({
      model: MODEL,
      max_tokens: 1024,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" },
      system: systemPrompt(scope.locale),
      tools: [listMyClaims, getClaimDetail],
      messages: params.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = finalMessage.content.find(
      (block): block is Anthropic.Beta.BetaTextBlock => block.type === "text",
    );
    return textBlock?.text ?? "";
  }
}
