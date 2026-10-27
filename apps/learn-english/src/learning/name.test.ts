import { describe, expect, it } from "vitest";
import { cleanName, NAME_MAX_LENGTH } from "./name";

describe("cleanName", () => {
  it("trims and collapses spaces, keeping diacritics", () => {
    expect(cleanName("  Lê   Trần Gia  Huy ")).toBe("Lê Trần Gia Huy");
  });

  it("rejects empty names and names without a letter", () => {
    for (const raw of ["", "   ", "123", "!!!", "-- 42"]) expect(cleanName(raw)).toBeNull();
  });

  it("accepts up to the limit and no more", () => {
    expect(cleanName("a".repeat(NAME_MAX_LENGTH))).toHaveLength(NAME_MAX_LENGTH);
    expect(cleanName("a".repeat(NAME_MAX_LENGTH + 1))).toBeNull();
  });
});
