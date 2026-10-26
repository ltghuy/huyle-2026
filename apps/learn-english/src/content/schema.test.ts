import { describe, expect, it } from "vitest";
import { contentItemSchema, sourceItemSchema } from "./schema";

const word = {
  id: "word:homework-n",
  kind: "word",
  level: "A1",
  topic: "school",
  body: {
    headword: "homework",
    pos: "noun",
    ipa: "/ˈhoʊmˌwɝk/",
    meaningsVi: ["bài tập về nhà"],
    examples: ["sentence:homework-1"],
    audio: "",
    source: "cefrj-1.5",
  },
};

const sentence = {
  id: "sentence:homework-1",
  kind: "sentence",
  level: "A1",
  body: {
    en: "I do my homework after dinner.",
    vi: "Tôi làm bài tập về nhà sau bữa tối.",
    audio: "",
    tokens: ["I", "do", "my", "homework", "after", "dinner"],
    acceptedOrders: [[0, 1, 2, 3, 4, 5]],
  },
};

const grammar = {
  id: "grammar:present-simple",
  kind: "grammar",
  level: "A1",
  body: {
    titleEn: "Present Simple",
    titleVi: "Thì hiện tại đơn",
    ruleVi: "Dùng để nói về thói quen và sự thật.",
    pattern: [{ form: "affirmative", en: "S + V(s/es)" }],
    usageVi: ["Thói quen hằng ngày"],
    examples: ["sentence:homework-1"],
  },
};

const writing = {
  id: "writing:a1-family",
  kind: "writing",
  level: "A1",
  body: { kind: "short-writing", promptVi: "Viết 3 câu về gia đình bạn.", modelAnswers: ["I have a small family."] },
};

const placement = {
  id: "placement:a1-1",
  kind: "placement",
  level: "A1",
  body: { kind: "meaning-mcq", prompt: "apple", options: ["quả táo", "con mèo", "cái bàn", "ngôi nhà"], answerIndex: 0 },
};

describe("contentItemSchema", () => {
  it.each([word, sentence, grammar, writing, placement])("accepts a valid $kind", (item) => {
    expect(contentItemSchema.safeParse(item).success).toBe(true);
  });

  it("applies defaults", () => {
    const parsed = contentItemSchema.parse(word);
    expect(parsed.sort).toBe(0);
    if (parsed.kind === "word") expect(parsed.body.variants).toEqual([]);
  });

  it("rejects a word without a Vietnamese meaning", () => {
    expect(contentItemSchema.safeParse({ ...word, body: { ...word.body, meaningsVi: [] } }).success).toBe(false);
  });

  it("rejects an id that doesn't match its kind", () => {
    expect(contentItemSchema.safeParse({ ...word, id: "sentence:homework" }).success).toBe(false);
  });

  it("rejects an unknown level", () => {
    expect(contentItemSchema.safeParse({ ...word, level: "C2" }).success).toBe(false);
  });

  it("rejects a sentence without accepted orders", () => {
    expect(contentItemSchema.safeParse({ ...sentence, body: { ...sentence.body, acceptedOrders: [] } }).success).toBe(false);
  });

  it("rejects an accepted order that isn't a permutation of the tokens", () => {
    const body = { ...sentence.body, acceptedOrders: [[0, 1, 2, 3, 4, 4]] };
    expect(contentItemSchema.safeParse({ ...sentence, body }).success).toBe(false);
  });

  it("rejects placement options that repeat", () => {
    const body = { ...placement.body, options: ["a", "a", "b", "c"] };
    expect(contentItemSchema.safeParse({ ...placement, body }).success).toBe(false);
  });
});

describe("sourceItemSchema", () => {
  it("requires a review status", () => {
    expect(sourceItemSchema.safeParse(word).success).toBe(false);
    expect(sourceItemSchema.safeParse({ ...word, status: "draft" }).success).toBe(true);
  });
});
