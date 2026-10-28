import { describe, expect, it } from "vitest";
import { formsBodySchema, sourceItemSchema } from "../content/schema";
import { acceptedForms, filterVerbs, formsIdOf, formsSequence, listeningDistractors, patternOf, regularPast, verbEntries, type FormsBody } from "./verbs";

const forms = (past: string | string[], participle: string | string[]): Pick<FormsBody, "past" | "participle"> => ({
  past: [past].flat().map((text) => ({ text, ipa: "" })),
  participle: [participle].flat().map((text) => ({ text, ipa: "" })),
});

const body: FormsBody = {
  wordId: "word:go-v",
  past: [{ text: "went", ipa: "/wɛnt/" }],
  participle: [{ text: "gone", ipa: "/ɡɔn/" }],
  audio: "",
  practice: [
    { en: "Yesterday she ___ to the market.", answer: "past", vi: "Hôm qua cô ấy đi chợ." },
    { en: "They have ___ home.", answer: "participle", vi: "Họ đã về nhà." },
  ],
};

describe("forms content (schema)", () => {
  it("accepts a forms item, with variants and a region", () => {
    const item = {
      id: "forms:get-v",
      kind: "forms",
      level: "A1",
      status: "draft",
      body: { ...body, wordId: "word:get-v", past: [{ text: "got", ipa: "/ɡɑt/" }], participle: [{ text: "gotten", ipa: "/ˈɡɑtn/", region: "us" }, { text: "got", ipa: "/ɡɑt/" }] },
    };
    expect(sourceItemSchema.safeParse(item).success).toBe(true);
  });

  it("refuses a verb without a past, and practice without a blank", () => {
    expect(formsBodySchema.safeParse({ ...body, past: [] }).success).toBe(false);
    expect(formsBodySchema.safeParse({ ...body, practice: [{ en: "She went home.", answer: "past", vi: "x" }, body.practice[1]] }).success).toBe(false);
    expect(formsBodySchema.safeParse({ ...body, practice: [body.practice[0]] }).success).toBe(false);
  });
});

describe("patternOf (AC-004)", () => {
  it.each([
    ["cut", forms("cut", "cut"), "AAA"],
    ["buy", forms("bought", "bought"), "ABB"],
    ["come", forms("came", "come"), "ABA"],
    ["go", forms("went", "gone"), "ABC"],
    ["Run", forms("ran", "run"), "ABA"],
  ])("%s is %s", (base, f, pattern) => {
    expect(patternOf(base, f)).toBe(pattern);
  });

  it("uses the first (taught) form when there are variants", () => {
    expect(patternOf("learn", forms(["learned", "learnt"], ["learned", "learnt"]))).toBe("ABB");
    expect(patternOf("get", forms("got", ["gotten", "got"]))).toBe("ABC");
  });
});

describe("forms helpers", () => {
  it("maps word ids to forms ids", () => {
    expect(formsIdOf("word:go-v")).toBe("forms:go-v");
  });

  it("lists accepted spellings and the audio text", () => {
    expect(acceptedForms(forms(["learned", "learnt"], "learned"), "past")).toEqual(["learned", "learnt"]);
    expect(formsSequence("go", forms("went", "gone"))).toBe("go, went, gone");
  });

  it.each([
    ["go", "goed"],
    ["make", "maked"],
    ["carry", "carried"],
    ["cut", "cutted"],
    ["stand", "standed"],
    ["swim", "swimmed"],
  ])("builds the wrong -ed form of %s: %s", (base, wrong) => {
    expect(regularPast(base)).toBe(wrong);
  });
});

describe("listeningDistractors (AC-007)", () => {
  it("gives three distinct wrong sets, never the right one", () => {
    const options = listeningDistractors("go", forms("went", "gone"), 0);
    expect(options).toHaveLength(3);
    expect(new Set(options).size).toBe(3);
    expect(options).not.toContain("go, went, gone");
    expect(options.every((option) => option.startsWith("go, "))).toBe(true);
  });

  it("includes confused spellings among the candidates", () => {
    const all = [0, 1, 2, 3, 4, 5, 6].flatMap((seed) => listeningDistractors("teach", forms("taught", "taught"), seed));
    expect(all).toContain("teach, thought, taught");
    expect(all).not.toContain("teach, taught, taught");
  });

  it("never offers an accepted variant as wrong", () => {
    const all = [0, 1, 2, 3, 4, 5, 6].flatMap((seed) => listeningDistractors("get", forms("got", ["gotten", "got"]), seed));
    expect(all).not.toContain("get, got, got");
    expect(all).not.toContain("get, got, gotten");
  });

  it("still finds three for a verb whose forms are all the same", () => {
    expect(listeningDistractors("cut", forms("cut", "cut"), 3)).toHaveLength(3);
  });

  it("is deterministic for a seed", () => {
    expect(listeningDistractors("go", forms("went", "gone"), 5)).toEqual(listeningDistractors("go", forms("went", "gone"), 5));
  });
});

describe("filterVerbs (AC-004, AC-005)", () => {
  const verb = (headword: string, past: string[], participle: string[], meaningsVi: string[], level: "A1" | "A2" = "A1") => ({
    word: { id: `word:${headword}-v`, kind: "word" as const, level, sort: 0, body: { headword, variants: [], pos: "verb", ipa: "", meaningsVi, examples: ["sentence:x"], synonyms: [], audio: "", source: "cefrj-1.5" as const } },
    forms: { id: `forms:${headword}-v`, kind: "forms" as const, level, sort: 0, body: { ...forms(past, participle), wordId: `word:${headword}-v`, audio: "", practice: body.practice } },
  });
  const all = verbEntries(
    [verb("go", ["went"], ["gone"], ["đi"]), verb("cut", ["cut"], ["cut"], ["cắt"]), verb("learn", ["learned", "learnt"], ["learned", "learnt"], ["học"], "A2")].map((v) => v.forms),
    [verb("go", ["went"], ["gone"], ["đi"]), verb("cut", ["cut"], ["cut"], ["cắt"]), verb("learn", ["learned", "learnt"], ["learned", "learnt"], ["học"], "A2")].map((v) => v.word),
  );
  const heads = (filter: Partial<import("./verbs").VerbFilter>) => filterVerbs(all, { pattern: null, level: null, query: "", ...filter }).map((v) => v.word.body.headword);

  it("joins forms to words, alphabetically, with their pattern", () => {
    expect(all.map((v) => [v.word.body.headword, v.pattern])).toEqual([["cut", "AAA"], ["go", "ABC"], ["learn", "ABB"]]);
  });

  it("filters by pattern and level", () => {
    expect(heads({ pattern: "ABC" })).toEqual(["go"]);
    expect(heads({ level: "A2" })).toEqual(["learn"]);
  });

  it("searches any form, including variants, and the meaning without accents", () => {
    expect(heads({ query: "wen" })).toEqual(["go"]);
    expect(heads({ query: "LEARNT" })).toEqual(["learn"]);
    expect(heads({ query: "di" })).toEqual(["go"]);
    expect(heads({ query: "cắt" })).toEqual(["cut"]);
    expect(heads({ query: "xyz" })).toEqual([]);
  });
});
