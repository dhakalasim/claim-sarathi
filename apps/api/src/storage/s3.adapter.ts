import type { StorageAdapter, StoredFile } from "./storage.interface.js";

/**
 * Stub for a future S3-compatible backend (AWS S3 or a Nepal-hosted
 * equivalent). Not wired up yet — see docs/roadmap.md. Swapping this in for
 * LocalDiskStorageAdapter in src/storage/index.ts is the only change needed
 * once implemented, since all callers depend on StorageAdapter only.
 */
export class S3StorageAdapter implements StorageAdapter {
  save(): Promise<StoredFile> {
    throw new Error("S3StorageAdapter is not implemented yet — see docs/roadmap.md");
  }

  read(): Promise<Buffer> {
    throw new Error("S3StorageAdapter is not implemented yet — see docs/roadmap.md");
  }

  delete(): Promise<void> {
    throw new Error("S3StorageAdapter is not implemented yet — see docs/roadmap.md");
  }
}
