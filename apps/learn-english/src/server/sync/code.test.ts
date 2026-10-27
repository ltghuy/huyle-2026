import { describe, expect, it, vi } from "vitest";
import { SYNC_CODE_ALPHABET, formatSyncCode, generateSyncCode, hashSyncCode, normalizeSyncCode } from "./code";

describe("sync code", () => {
  it("uses Crockford base32 (no I, L, O, U)", () => {
    expect(SYNC_CODE_ALPHABET).toHaveLength(32);
    expect(SYNC_CODE_ALPHABET).not.toMatch(/[ILOU]/);
  });

  it("generates 12 characters formatted XXXX-XXXX-XXXX", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateSyncCode();
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){2}$/);
    }
  });

  it("draws from crypto.getRandomValues", () => {
    const spy = vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
      (array as Uint8Array).set(Array.from({ length: 12 }, (_, i) => i * 3));
      return array;
    });
    expect(generateSyncCode()).toBe("0369-CFJN-RVY1");
    spy.mockRestore();
  });

  it("formats in groups of four", () => {
    expect(formatSyncCode("ABCD1234EFGH")).toBe("ABCD-1234-EFGH");
  });

  it("normalises case, spaces, dashes and look-alike letters", () => {
    expect(normalizeSyncCode("abcd-1234-efgh")).toBe("ABCD1234EFGH");
    expect(normalizeSyncCode(" ab cd 12 34 ef gh ")).toBe("ABCD1234EFGH");
    expect(normalizeSyncCode("oOiI-lL00-1111")).toBe("001111001111");
  });

  it("rejects other characters and wrong lengths", () => {
    expect(normalizeSyncCode("ABCD-1234-EFGU")).toBeNull();
    expect(normalizeSyncCode("ABCD-1234-EFG!")).toBeNull();
    expect(normalizeSyncCode("ABCD-1234-EFG")).toBeNull();
    expect(normalizeSyncCode("ABCD-1234-EFGHJ")).toBeNull();
    expect(normalizeSyncCode("")).toBeNull();
  });

  it("hashes to lowercase hex SHA-256", async () => {
    // echo -n ABCD1234EFGH | shasum -a 256
    expect(await hashSyncCode("ABCD1234EFGH")).toBe("72d21fed44fcb4ca886526fe3d1da2fa41976d9a6284b36036f089955dc650fd");
  });
});
