import { describe, expect, it } from "vitest";
import { hasNonAscii, matchesWord, normalize, tokenize } from "./normalize";

describe("normalize", () => {
  it.each([
    ["bâ", "baa"],
    ["mêt", "meet"],
    ["bôk", "book"],
    ["ăn", "awn"],
    ["ưindow", "uwindow"],
    ["shơ", "show"],
    ["ađress", "address"],
    ["ĐĐ", "dddd"],
  ])("folds Vietnamese letters: %s → %s", (raw, expected) => {
    expect(normalize(raw)).toBe(expected);
  });

  it("strips tone marks, including on â/ê/ô/ơ/ư", () => {
    expect(normalize("áàảãạ")).toBe("aaaaa");
    expect(normalize("ấ")).toBe("aa");
    expect(normalize("ậ")).toBe("aa");
    expect(normalize("ề")).toBe("ee");
    expect(normalize("ộ")).toBe("oo");
    expect(normalize("ớ")).toBe("ow");
    expect(normalize("ự")).toBe("uw");
    expect(normalize("ẳ")).toBe("aw");
  });

  it("folds decomposed (NFD) input the same way", () => {
    expect(normalize("ấ".normalize("NFD"))).toBe("aa");
  });

  it("lowercases, trims, collapses spaces and straightens apostrophes", () => {
    expect(normalize("  Ice   Cream \t")).toBe("ice cream");
    expect(normalize("Don’t")).toBe("don't");
    expect(normalize("it‘s")).toBe("it's");
  });

  it("leaves plain ASCII alone", () => {
    expect(normalize("hello-world 42")).toBe("hello-world 42");
  });
});

describe("matchesWord", () => {
  it("accepts the headword case-insensitively", () => {
    expect(matchesWord(" Color ", "color")).toBe(true);
  });

  it("accepts listed variant spellings", () => {
    expect(matchesWord("colour", "color", ["colour"])).toBe(true);
    expect(matchesWord("colour", "color")).toBe(false);
  });

  it("accepts Telex output of the right word", () => {
    expect(matchesWord("bôk", "book")).toBe(true);
    expect(matchesWord("ađress", "address")).toBe(true);
  });

  it("rejects other words and empty input", () => {
    expect(matchesWord("colr", "color", ["colour"])).toBe(false);
    expect(matchesWord("  ", "color")).toBe(false);
  });
});

describe("tokenize", () => {
  it("splits words and reports final punctuation", () => {
    expect(tokenize("I like apples.")).toEqual({ words: ["i", "like", "apples"], final: "." });
    expect(tokenize("Do you like it?")).toEqual({ words: ["do", "you", "like", "it"], final: "?" });
  });

  it("keeps apostrophes and hyphens inside words", () => {
    expect(tokenize("I don’t know a well-known man")).toEqual({
      words: ["i", "don't", "know", "a", "well-known", "man"],
      final: "",
    });
  });

  it("drops commas, quotes and stray punctuation", () => {
    expect(tokenize(`"Yes, I do!"`)).toEqual({ words: ["yes", "i", "do"], final: "!" });
    expect(tokenize("Wait...")).toEqual({ words: ["wait"], final: "..." });
  });

  it("returns no words for empty input", () => {
    expect(tokenize("   ")).toEqual({ words: [], final: "" });
  });
});

describe("hasNonAscii", () => {
  it("detects Vietnamese letters", () => {
    expect(hasNonAscii("bôk")).toBe(true);
    expect(hasNonAscii("ađress")).toBe(true);
  });

  it("ignores ASCII, whitespace and curly apostrophes", () => {
    expect(hasNonAscii("don't stop\t")).toBe(false);
    expect(hasNonAscii("don’t")).toBe(false);
  });
});
