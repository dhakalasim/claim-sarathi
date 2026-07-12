import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ChecksumMismatchError, computeChecksum, verifyChecksum } from "../src/modules/documents/checksum.js";

describe("document checksum", () => {
  it("computes a deterministic sha256 hex digest of the file bytes", () => {
    const data = Buffer.from("citizenship-scan-bytes");
    const expected = createHash("sha256").update(data).digest("hex");

    expect(computeChecksum(data)).toBe(expected);
    expect(computeChecksum(data)).toBe(computeChecksum(Buffer.from("citizenship-scan-bytes")));
  });

  it("produces different checksums for different content", () => {
    const a = computeChecksum(Buffer.from("version 1"));
    const b = computeChecksum(Buffer.from("version 2"));
    expect(a).not.toBe(b);
  });

  it("verifies successfully when bytes match the recorded checksum", () => {
    const data = Buffer.from("surveyor-report.pdf contents");
    const checksum = computeChecksum(data);
    expect(() => verifyChecksum(data, checksum)).not.toThrow();
  });

  it("throws ChecksumMismatchError when stored bytes have been altered or corrupted", () => {
    const original = Buffer.from("original bill upload");
    const checksum = computeChecksum(original);
    const tampered = Buffer.from("tampered bill upload");

    expect(() => verifyChecksum(tampered, checksum)).toThrow(ChecksumMismatchError);
  });

  it("throws ChecksumMismatchError rather than silently accepting a truncated file", () => {
    const original = Buffer.from("a".repeat(1000));
    const checksum = computeChecksum(original);
    const truncated = original.subarray(0, 500);

    expect(() => verifyChecksum(truncated, checksum)).toThrow(ChecksumMismatchError);
  });
});
