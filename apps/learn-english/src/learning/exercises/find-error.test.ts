import { describe, expect, it } from "vitest";
import { sentence } from "./fixtures";
import { buildFindError, canFindError, FIND_ERROR_PARTS, gradeFindError, type FindErrorInstance } from "./find-error";

const ability = sentence("ability", {
  tokens: ["She", "has", "the", "ability", "to", "learn", "languages", "fast."],
  vi: "Cô ấy có khả năng học ngôn ngữ nhanh.",
  wrongVariants: [
    { en: "She has the ability to learning languages fast.", explanationVi: "Sau \"to\" động từ phải ở dạng nguyên mẫu: \"to learn\"." },
    // Drops a word: nothing to underline, never used.
    { en: "She has ability to learn languages fast.", explanationVi: "Thiếu mạo từ." },
  ],
});

const seeds = Array.from({ length: 40 }, (_, i) => i + 1);

function build(seed: number): FindErrorInstance {
  const instance = buildFindError({ sentence: ability }, seed);
  if (!instance) throw new Error("no instance");
  return instance;
}

describe("buildFindError (AC-001 to AC-003)", () => {
  it("underlines four parts in reading order, one of them the error", () => {
    for (const seed of seeds) {
      const instance = build(seed);
      expect(instance.parts).toHaveLength(FIND_ERROR_PARTS);
      expect(instance.parts[instance.answerIndex]).toBe("learning");
      expect(instance.correction).toBe("learn");
      // The segments rebuild the wrong sentence, and the underlined ones are the parts in order.
      expect(instance.segments.map((segment) => segment.text).join("")).toBe("She has the ability to learning languages fast.");
      expect(instance.segments.filter((segment) => segment.part !== undefined).map((segment) => segment.text)).toEqual(instance.parts);
    }
  });

  it("never underlines the words next to the error, and parts never overlap", () => {
    for (const seed of seeds) {
      const instance = build(seed);
      const others = instance.parts.filter((_, i) => i !== instance.answerIndex).join(" ").split(" ");
      expect(others).not.toContain("to");
      expect(others).not.toContain("languages");
      expect(new Set(instance.parts).size).toBe(FIND_ERROR_PARTS);
    }
  });

  it("puts the error on different letters across seeds", () => {
    expect(new Set(seeds.map((seed) => build(seed).answerIndex)).size).toBeGreaterThan(1);
  });

  it("is the same for the same seed", () => {
    expect(build(7)).toEqual(build(7));
  });

  it("underlines a swap of word order as one part", () => {
    const abroad = sentence("abroad", {
      tokens: ["My", "older", "brother", "works", "abroad", "every", "summer."],
      wrongVariants: [{ en: "My older brother abroad works every summer.", explanationVi: "Trạng từ đứng sau động từ." }],
    });
    const instance = buildFindError({ sentence: abroad }, 3)!;
    expect(instance.parts[instance.answerIndex]).toBe("abroad works");
    expect(instance.correction).toBe("works abroad");
  });

  it("skips sentences with no usable wrong version or too short to hold three correct parts", () => {
    expect(canFindError(ability)).toBe(true);
    expect(canFindError(sentence("plain", { tokens: ["I", "like", "tea."] }))).toBe(false);
    const short = sentence("short", { tokens: ["She", "has", "a", "cat."], wrongVariants: [{ en: "She have a cat.", explanationVi: "x" }] });
    expect(canFindError(short)).toBe(false);
  });
});

describe("gradeFindError (AC-005, AC-007)", () => {
  it("is right only for the error, and names it with its replacement", () => {
    const instance = build(1);
    const letter = "ABCD"[instance.answerIndex];
    expect(gradeFindError(instance, instance.answerIndex)).toEqual({ correct: true, expected: `(${letter}) learning → learn` });
    expect(gradeFindError(instance, (instance.answerIndex + 1) % FIND_ERROR_PARTS)).toMatchObject({ correct: false });
  });
});
