import { describe, expect, it } from "vitest";
import { buildDictation, canDictate, compareDictation, dictationSummary, expansions, gradeDictation, type DictationInstance } from "./dictation";
import { sentence } from "./fixtures";

const AUDIO = "a".repeat(64);

function dictation(en: string): DictationInstance {
  const instance = buildDictation({ sentence: sentence("s", { tokens: en.split(" "), en, audio: AUDIO }) });
  if (!instance) throw new Error(`not dictatable: ${en}`);
  return instance;
}

const grade = (en: string, text: string, hinted = false) => gradeDictation(dictation(en), { text, hinted });

describe("canDictate / buildDictation", () => {
  it("needs audio and skips digits and dotted abbreviations", () => {
    expect(canDictate(sentence("a", { tokens: ["I", "am", "here."], audio: AUDIO }))).toBe(true);
    expect(canDictate(sentence("b", { tokens: ["I", "am", "here."], audio: "" }))).toBe(false);
    expect(canDictate(sentence("c", { tokens: ["It", "opened", "in", "1990."], audio: AUDIO }))).toBe(false);
    expect(canDictate(sentence("d", { tokens: ["See", "you", "at", "9", "p.m."], audio: AUDIO }))).toBe(false);
    expect(canDictate(sentence("e", { tokens: ["Meet", "me", "at", "noon", "p.m."], audio: AUDIO }))).toBe(false);
  });

  it("counts words without punctuation, a contraction as one", () => {
    expect(dictation("I don't like it, really.").wordCount).toBe(5);
  });
});

describe("expansions", () => {
  it("knows the common contractions and leaves possessives alone", () => {
    expect(expansions("don't")).toEqual([["do", "not"]]);
    expect(expansions("can't")).toEqual([["can", "not"], ["cannot"]]);
    expect(expansions("She's")).toEqual([["she", "is"], ["she", "has"]]);
    expect(expansions("we'd")).toEqual([["we", "would"], ["we", "had"]]);
    expect(expansions("John's")).toEqual([]);
    expect(expansions("hello")).toEqual([]);
  });
});

describe("gradeDictation (AC-004 to AC-007)", () => {
  it("ignores capitals, punctuation, spaces and curly apostrophes", () => {
    expect(grade("I don't like coffee.", "  i dont   like COFFEE ")).toMatchObject({ correct: true });
    expect(grade("I don't like coffee.", "I don’t like coffee")).toMatchObject({ correct: true });
  });

  it("accepts a contraction and its full form either way", () => {
    expect(grade("I don't like coffee.", "I do not like coffee")).toMatchObject({ correct: true });
    expect(grade("I do not like coffee.", "I don't like coffee")).toMatchObject({ correct: true });
    expect(grade("She's gone home.", "she has gone home")).toMatchObject({ correct: true });
    expect(grade("I can't swim.", "I cannot swim")).toMatchObject({ correct: true });
  });

  it("does not read a word typed without an apostrophe as a contraction", () => {
    expect(grade("We will go.", "well go")).toMatchObject({ correct: false });
  });

  it("accepts one slip in a word of five letters or more, flagged as a typo", () => {
    const result = grade("She works at a hospital.", "she works at a hosptal");
    expect(result).toMatchObject({ correct: true, typo: true });
    expect(grade("She works at a hospital.", "she wroks at a hospital")).toMatchObject({ correct: true, typo: true });
    expect(grade("She works at a hospital.", "she works at a hsoptal")).toMatchObject({ correct: false });
  });

  it("never counts a dropped or added ending as a slip", () => {
    expect(grade("She works at a hospital.", "she work at a hospital")).toMatchObject({ correct: false });
    expect(grade("We played tennis.", "we playe tennis")).toMatchObject({ correct: false });
    expect(grade("I watch movies.", "I watched movies")).toMatchObject({ correct: false });
  });

  it("marks missing, extra and reordered words wrong", () => {
    expect(grade("She works at a hospital.", "she works at hospital").correct).toBe(false);
    expect(grade("She works at a hospital.", "she works at a big hospital").correct).toBe(false);
    expect(grade("She works at a hospital.", "she works a at hospital").correct).toBe(false);
  });

  it("keeps the hint on the result", () => {
    expect(grade("I am here.", "I am here", true)).toMatchObject({ correct: true, hinted: true });
    expect(grade("I am here.", "I am here")).not.toHaveProperty("hinted");
  });

  it("accepts a hyphenated word typed with a space", () => {
    expect(grade("She is well-known.", "she is well known")).toMatchObject({ correct: true });
  });
});

describe("compareDictation (AC-008)", () => {
  it("marks each word of the sentence, with extra words where they were typed", () => {
    expect(compareDictation("She works at a hospital.", "she work at hospital")).toEqual([
      { status: "right", word: "She" },
      { status: "wrong", word: "works", typed: "work" },
      { status: "right", word: "at" },
      { status: "missed", word: "a" },
      { status: "right", word: "hospital" },
    ]);
    expect(compareDictation("I like tea.", "I really like tea")).toEqual([
      { status: "right", word: "I" },
      { status: "extra", typed: "really" },
      { status: "right", word: "like" },
      { status: "right", word: "tea" },
    ]);
  });

  it("keeps the sentence's own spelling for a contraction typed in full", () => {
    expect(compareDictation("I don't know.", "i do not know")).toEqual([
      { status: "right", word: "I" },
      { status: "right", word: "don't" },
      { status: "right", word: "know" },
    ]);
  });

  it("marks everything missed for an empty answer", () => {
    expect(compareDictation("I am here.", "").map((mark) => mark.status)).toEqual(["missed", "missed", "missed"]);
  });
});

describe("dictationSummary (AC-009)", () => {
  it("counts right, missed, wrong and extra words in Vietnamese", () => {
    expect(dictationSummary(compareDictation("She works at a hospital.", "she work at hospital"))).toBe("Đúng 3/5 từ, thiếu 1 từ, sai 1 từ");
    expect(dictationSummary(compareDictation("I like tea.", "I really like tea"))).toBe("Đúng 3/3 từ, thừa 1 từ");
  });
});
