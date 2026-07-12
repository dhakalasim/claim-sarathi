import { env } from "../config/env.js";
import { LocalDiskStorageAdapter } from "./local-disk.adapter.js";
import { S3StorageAdapter } from "./s3.adapter.js";
import type { StorageAdapter } from "./storage.interface.js";

export function createStorageAdapter(): StorageAdapter {
  switch (env.STORAGE_DRIVER) {
    case "s3":
      return new S3StorageAdapter();
    case "local":
    default:
      return new LocalDiskStorageAdapter();
  }
}

export type { StorageAdapter } from "./storage.interface.js";
