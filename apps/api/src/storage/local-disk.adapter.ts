import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import type { StorageAdapter, StoredFile } from "./storage.interface.js";

export class LocalDiskStorageAdapter implements StorageAdapter {
  constructor(private readonly root: string = env.STORAGE_LOCAL_ROOT) {}

  async save(params: { claimId: string; fileName: string; data: Buffer }): Promise<StoredFile> {
    const claimDir = path.join(this.root, params.claimId);
    await mkdir(claimDir, { recursive: true });

    const ext = path.extname(params.fileName);
    const storageKey = path.join(params.claimId, `${randomUUID()}${ext}`);
    await writeFile(path.join(this.root, storageKey), params.data);

    return { storageKey, sizeBytes: params.data.byteLength };
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(path.join(this.root, storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    await rm(path.join(this.root, storageKey), { force: true });
  }
}
