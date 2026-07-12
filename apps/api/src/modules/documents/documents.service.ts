import type { Prisma, PrismaClient } from "@prisma/client";
import type { DocumentTag } from "@claimsarathi/shared";
import type { StorageAdapter } from "../../storage/storage.interface.js";
import { computeChecksum, verifyChecksum } from "./checksum.js";

/** Never select passwordHash into an API response — this is the shape every relation to User must use. */
const SAFE_USER_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  locale: true,
} satisfies Prisma.UserSelect;

export class DocumentNotFoundError extends Error {
  constructor(documentId: string) {
    super(`document ${documentId} not found`);
  }
}

export class ClaimNotFoundError extends Error {
  constructor(claimId: string) {
    super(`claim ${claimId} not found`);
  }
}

export class DocumentsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: StorageAdapter,
  ) {}

  async uploadDocument(params: {
    claimId: string;
    tag: DocumentTag;
    fileName: string;
    mimeType: string;
    data: Buffer;
    uploadedById: string;
    supersedesId?: string;
  }) {
    const claim = await this.prisma.claim.findUnique({ where: { id: params.claimId } });
    if (!claim) {
      throw new ClaimNotFoundError(params.claimId);
    }

    let version = 1;
    if (params.supersedesId) {
      const previous = await this.prisma.document.findUnique({ where: { id: params.supersedesId } });
      if (!previous) {
        throw new DocumentNotFoundError(params.supersedesId);
      }
      version = previous.version + 1;
    }

    const checksum = computeChecksum(params.data);
    const stored = await this.storage.save({
      claimId: params.claimId,
      fileName: params.fileName,
      data: params.data,
    });

    return this.prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          claimId: params.claimId,
          tag: params.tag,
          fileName: params.fileName,
          storageKey: stored.storageKey,
          mimeType: params.mimeType,
          sizeBytes: stored.sizeBytes,
          checksum,
          version,
          supersedesId: params.supersedesId,
          uploadedById: params.uploadedById,
        },
      });

      await tx.documentAuditLog.create({
        data: {
          documentId: document.id,
          action: params.supersedesId ? "VERSIONED" : "UPLOADED",
          actorId: params.uploadedById,
          metadata: { checksum, sizeBytes: stored.sizeBytes, version },
        },
      });

      return document;
    });
  }

  async getDocumentBytes(documentId: string, viewerId: string, action: "VIEWED" | "DOWNLOADED") {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      throw new DocumentNotFoundError(documentId);
    }

    const data = await this.storage.read(document.storageKey);
    verifyChecksum(data, document.checksum);

    await this.prisma.documentAuditLog.create({
      data: { documentId: document.id, action, actorId: viewerId },
    });

    return { data, document };
  }

  async changeTag(documentId: string, tag: DocumentTag, actorId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) {
      throw new DocumentNotFoundError(documentId);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.document.update({ where: { id: documentId }, data: { tag } });
      await tx.documentAuditLog.create({
        data: {
          documentId,
          action: "TAG_CHANGED",
          actorId,
          metadata: { fromTag: document.tag, toTag: tag },
        },
      });
      return updated;
    });
  }

  async listAuditLog(documentId: string) {
    return this.prisma.documentAuditLog.findMany({
      where: { documentId },
      include: { actor: { select: SAFE_USER_SELECT } },
      orderBy: { createdAt: "asc" },
    });
  }
}
