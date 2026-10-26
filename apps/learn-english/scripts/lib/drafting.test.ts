import { describe, expect, it } from "vitest";
import type { SourceItem } from "../../src/content/schema";
import type { WordlistRow } from "../import-wordlists";
import { buildSentence, buildWord, mergeDrafts, orderFromSentence, splitTokens, type SentenceDraft, type WordDraft } from "./drafting";

const sentence: SentenceDraft = {
  en: "I do my homework after dinner.",
  vi: "Tôi làm bài tập về nhà sau bữa tối.",
  alternativeOrders: ["After dinner, I do my homework.", "I do my homework after lunch."],
  gapWords: ["homework", "after", "missing"],
  wrongVariants: [
    { en: "I do my homeworks after dinner.", explanationVi: "homework không đếm được." },
    { en: "I doing my homework after dinner.", explanationVi: "Thiếu trợ động từ." },
    { en: "I do my homework after the dinner.", explanationVi: "Không dùng the trước bữa ăn." },
  ],
};

describe("splitTokens", () => {
  it("keeps casing and inner apostrophes, drops edge punctuation", () => {
    expect(splitTokens('"Don\'t worry," she said.')).toEqual(["Don't", "worry", "she", "said"]);
  });
});

describe("orderFromSentence", () => {
  const tokens = splitTokens(sentence.en);

  it("maps a reordering of the same words to token indexes", () => {
    expect(orderFromSentence(tokens, "After dinner, I do my homework.")).toEqual([4, 5, 0, 1, 2, 3]);
  });

  it("matches repeated words left to right", () => {
    expect(orderFromSentence(["the", "cat", "saw", "the", "dog"], "The dog saw the cat")).toEqual([0, 4, 2, 3, 1]);
  });

  it("rejects different words", () => {
    expect(orderFromSentence(tokens, "I do my homework after lunch.")).toBeNull();
  });
});

describe("buildSentence", () => {
  const built = buildSentence("sentence:homework-n-1", "A1", sentence, { wordIds: ["word:homework-n"] });
  const item = built.items[0];

  it("builds a valid draft item with computed orders and gaps", () => {
    expect(item.status).toBe("draft");
    if (item.kind !== "sentence") throw new Error("expected a sentence");
    expect(item.body.tokens).toEqual(["I", "do", "my", "homework", "after", "dinner"]);
    expect(item.body.acceptedOrders).toEqual([
      [0, 1, 2, 3, 4, 5],
      [4, 5, 0, 1, 2, 3],
    ]);
    expect(item.body.gapCandidates).toEqual([3, 4]);
    expect(item.body.wordIds).toEqual(["word:homework-n"]);
  });

  it("reports alternative orders that change the words", () => {
    expect(built.problems).toEqual([expect.stringContaining("after lunch")]);
  });
});

describe("buildWord", () => {
  const row: WordlistRow = {
    id: "word:homework-n",
    headword: "homework",
    variants: [],
    pos: "noun",
    level: "A1",
    source: "cefrj-1.5",
    topicHints: [],
  };
  const draft: WordDraft = {
    id: row.id,
    topic: "school-education",
    meaningsVi: [" bài tập về nhà "],
    synonyms: ["assignment", "unknownword"],
    ipaOk: true,
    ipaSuggestion: "",
    examples: [sentence],
    notes: "",
  };
  const index = new Map([
    ["assignment|noun", "word:assignment-n"],
    ["homework|noun", "word:homework-n"],
  ]);

  it("links examples and known synonyms and keeps the CMUdict IPA when it is right", () => {
    const { items } = buildWord(row, draft, "/ˈhoʊmˌwɝk/", index);
    const word = items.find((item) => item.kind === "word");
    expect(word).toMatchObject({
      id: "word:homework-n",
      topic: "school-education",
      body: { ipa: "/ˈhoʊmˌwɝk/", meaningsVi: ["bài tập về nhà"], examples: ["sentence:homework-n-1"], synonyms: ["word:assignment-n"] },
    });
    expect(word).not.toHaveProperty("reviewNotes");
    expect(items.map((item) => item.kind)).toEqual(["word", "sentence"]);
  });

  it("uses the suggested IPA and leaves a review note when the IPA is flagged", () => {
    const flagged = { ...draft, ipaOk: false, ipaSuggestion: "/ˈhoʊmwɝk/" };
    const word = buildWord(row, flagged, "/ˈhoʊmˌwɝk/", index).items[0];
    expect(word).toMatchObject({ body: { ipa: "/ˈhoʊmwɝk/" }, reviewNotes: [expect.stringContaining("IPA flagged")] });
  });
});

describe("mergeDrafts", () => {
  const item = (id: string, status: "draft" | "approved", vi: string) =>
    ({
      id,
      kind: "writing",
      level: "A1",
      sort: 0,
      status,
      body: { kind: "short-writing", promptVi: vi, useItems: [], modelAnswers: ["x"] },
    }) as SourceItem;

  it("never replaces approved items, replaces drafts and appends new ids in id order", () => {
    const merged = mergeDrafts(
      [item("writing:b", "approved", "old b"), item("writing:c", "draft", "old c")],
      [item("writing:b", "draft", "new b"), item("writing:c", "draft", "new c"), item("writing:a", "draft", "new a")],
    );
    expect(merged.map((entry) => [entry.id, entry.kind === "writing" && entry.body.promptVi])).toEqual([
      ["writing:a", "new a"],
      ["writing:b", "old b"],
      ["writing:c", "new c"],
    ]);
  });
});
