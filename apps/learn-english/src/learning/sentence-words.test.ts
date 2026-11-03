import { describe, expect, it } from "vitest";
import { forms, word } from "./exercises/fixtures";
import { buildWordFinder } from "./sentence-words";

const WORDS = [
  word("her-det", { headword: "her" }),
  word("idea-n", { headword: "idea" }),
  word("be-v", { headword: "be" }),
  word("very-adv", { headword: "very" }),
  word("original-adj", { headword: "original" }),
  word("go-v", { headword: "go" }),
  word("carry-v", { headword: "carry" }),
  word("make-v", { headword: "make" }),
  word("stop-v", { headword: "stop" }),
  word("color-n", { headword: "color", variants: ["colour"] }),
  word("light-n", { headword: "light" }),
  word("light-adj", { headword: "light" }),
  word("like-prep", { headword: "like", pos: "preposition" }),
  word("like-v", { headword: "like", pos: "verb" }),
];
const FORMS = [forms("be-v", ["was", "were"], ["been"]), forms("go-v", ["went"], ["gone"]), forms("fly-v", ["flew"], ["flown"])];

describe("buildWordFinder", () => {
  const find = buildWordFinder(WORDS, FORMS);

  it("matches headwords and variants, ignoring case and edge punctuation", () => {
    expect(["Her", "idea", "very", "original."].map((token) => find(token))).toEqual(["word:her-det", "word:idea-n", "word:very-adv", "word:original-adj"]);
    expect(find("Colour,")).toBe("word:color-n");
  });

  it("finds the base word of plurals and regular verb endings", () => {
    expect(find("ideas")).toBe("word:idea-n");
    expect(find("goes")).toBe("word:go-v");
    expect(find("carried")).toBe("word:carry-v");
    expect(find("making")).toBe("word:make-v");
    expect(find("stopped")).toBe("word:stop-v");
  });

  it("finds irregular forms and the present forms of be", () => {
    expect(find("went")).toBe("word:go-v");
    expect(find("is")).toBe("word:be-v");
    expect(find("were")).toBe("word:be-v");
  });

  it("leaves out forms whose word isn't loaded, and tokens with no word", () => {
    expect(find("flew")).toBeNull();
    expect(find("originally")).toBeNull();
    expect(find("—")).toBeNull();
  });

  it("prefers the sentence's own word when two share a spelling", () => {
    expect(find("light")).toBe("word:light-n");
    expect(find("light", ["word:light-adj"])).toBe("word:light-adj");
  });

  it("picks the part of speech the ending points to", () => {
    expect(find("like")).toBe("word:like-prep");
    expect(find("likes")).toBe("word:like-v");
    expect(find("liked")).toBe("word:like-v");
  });
});
