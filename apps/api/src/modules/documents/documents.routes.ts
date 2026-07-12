import type { FastifyInstance } from "fastify";
import type { Multipart, MultipartValue } from "@fastify/multipart";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, documentTagSchema } from "@claimsarathi/shared";
import { authenticate } from "../../middleware/authenticate.js";
import { createStorageAdapter } from "../../storage/index.js";
import { DocumentNotFoundError, DocumentsService, ClaimNotFoundError } from "./documents.service.js";

function isMultipartValue(field: Multipart): field is MultipartValue<string> {
  return field.type === "field";
}

function readFieldValue(field: Multipart | Multipart[] | undefined): string | undefined {
  const single = Array.isArray(field) ? field[0] : field;
  return single && isMultipartValue(single) ? single.value : undefined;
}

export async function documentsRoutes(app: FastifyInstance): Promise<void> {
  const documentsService = new DocumentsService(app.prisma, createStorageAdapter());

  app.addHook("preHandler", authenticate);

  app.post("/claims/:claimId/documents", async (request, reply) => {
    const { claimId } = request.params as { claimId: string };

    const file = await request.file({ limits: { fileSize: MAX_UPLOAD_BYTES } });
    if (!file) {
      return reply.code(400).send({ error: "validation_error", message: "no file provided" });
    }

    const tagValue = readFieldValue(file.fields.tag);
    const tagParsed = documentTagSchema.safeParse(tagValue);
    if (!tagParsed.success) {
      return reply.code(400).send({ error: "validation_error", message: "invalid or missing 'tag' field" });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof ALLOWED_MIME_TYPES)[number])) {
      return reply.code(400).send({ error: "validation_error", message: `unsupported file type: ${file.mimetype}` });
    }

    const supersedesId = readFieldValue(file.fields.supersedesId);

    const data = await file.toBuffer();

    try {
      const document = await documentsService.uploadDocument({
        claimId,
        tag: tagParsed.data,
        fileName: file.filename,
        mimeType: file.mimetype,
        data,
        uploadedById: request.user.sub,
        supersedesId: supersedesId || undefined,
      });
      return reply.code(201).send(document);
    } catch (err) {
      if (err instanceof ClaimNotFoundError || err instanceof DocumentNotFoundError) {
        return reply.code(404).send({ error: "not_found", message: err.message });
      }
      throw err;
    }
  });

  app.get("/documents/:id/download", async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const { data, document } = await documentsService.getDocumentBytes(id, request.user.sub, "DOWNLOADED");
      return reply.header("content-type", document.mimeType).send(data);
    } catch (err) {
      if (err instanceof DocumentNotFoundError) {
        return reply.code(404).send({ error: "not_found", message: err.message });
      }
      throw err;
    }
  });

  app.get("/documents/:id/audit-log", async (request, reply) => {
    const { id } = request.params as { id: string };
    const log = await documentsService.listAuditLog(id);
    return reply.send(log);
  });
}
