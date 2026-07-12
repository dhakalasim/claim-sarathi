import { z } from "zod";
import { DOCUMENT_TAGS } from "../constants/claim-stages.js";

export const documentTagSchema = z.enum(DOCUMENT_TAGS);

export const uploadDocumentMetadataSchema = z.object({
  tag: documentTagSchema,
  /** If provided, this upload is a new version of an existing document. */
  supersedesId: z.string().uuid().optional(),
});
export type UploadDocumentMetadata = z.infer<typeof uploadDocumentMetadataSchema>;

export const documentAuditActionSchema = z.enum([
  "UPLOADED",
  "VIEWED",
  "DOWNLOADED",
  "VERSIONED",
  "TAG_CHANGED",
  "DELETED",
]);
export type DocumentAuditAction = z.infer<typeof documentAuditActionSchema>;

export const documentSchema = z.object({
  id: z.string().uuid(),
  claimId: z.string().uuid(),
  tag: documentTagSchema,
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  checksum: z.string().length(64, "expected sha256 hex digest"),
  version: z.number().int().positive(),
  supersedesId: z.string().uuid().nullable(),
  uploadedById: z.string().uuid(),
  createdAt: z.coerce.date(),
});
export type DocumentDto = z.infer<typeof documentSchema>;

export const documentAuditLogSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  action: documentAuditActionSchema,
  actorId: z.string().uuid(),
  actorName: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.coerce.date(),
});
export type DocumentAuditLogDto = z.infer<typeof documentAuditLogSchema>;

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
