export interface StoredFile {
  /** Opaque key the storage backend uses to locate the file later. */
  storageKey: string;
  sizeBytes: number;
}

/**
 * Abstraction over "where document bytes physically live." The claims/document
 * domain logic only ever talks to this interface, never to the filesystem or
 * an S3 SDK directly, so swapping backends later is a one-file change.
 */
export interface StorageAdapter {
  save(params: { claimId: string; fileName: string; data: Buffer }): Promise<StoredFile>;
  read(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}
