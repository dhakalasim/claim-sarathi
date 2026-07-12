import { createHash } from "node:crypto";

/** sha256 hex digest of file bytes — computed on upload and re-verified on read. */
export function computeChecksum(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export class ChecksumMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(`checksum mismatch: expected ${expected}, got ${actual} — file may be corrupted or tampered with`);
    this.name = "ChecksumMismatchError";
  }
}

/** Throws if the bytes read back from storage don't match what was recorded at upload time. */
export function verifyChecksum(data: Buffer, expectedChecksum: string): void {
  const actual = computeChecksum(data);
  if (actual !== expectedChecksum) {
    throw new ChecksumMismatchError(expectedChecksum, actual);
  }
}
