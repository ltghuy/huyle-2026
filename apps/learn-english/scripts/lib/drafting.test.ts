import { describe, expect, it } from "vitest";
import type { SourceItem } from "../../src/content/schema";
import type { WordlistRow } from "../import-wordlists";
import {
  buildForms,
  buildSentence,
  buildWord,
  buildWriting,
  checkFormsDraft,
  checkSentenceDraft,
  checkWordDraft,
  mergeDrafts,
  orderFromSentence,
  splitTokens,
  type FormsDraft,
  type SentenceDraft,
  type WordDraft,
} from "./drafting";

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

describe("checkSentenceDraft", () => {
  it("passes a sentence that follows the rules", () => {
    expect(checkSentenceDraft("s", "A1", { ...sentence, gapWords: ["homework"] })).toEqual([]);
  });

  it("reports length, variant count and gap words that aren't in the sentence", () => {
    const long = { ...sentence, en: "I always do all of my homework in my room after dinner.", wrongVariants: sentence.wrongVariants.slice(0, 2) };
    const problems = checkSentenceDraft("s", "A1", long);
    expect(problems).toEqual(["s: 12 words, A1 allows 10", "s: 2 wrong variants, expected 3", 's: gap word "missing" is not in the sentence']);
  });
});

describe("checkWordDraft", () => {
  const draft: WordDraft = {
    id: "word:homework-n",
    topic: "school-education",
    meaningsVi: ["bài tập về nhà"],
    synonyms: [],
    ipaOk: true,
    ipaSuggestion: "",
    examples: [{ ...sentence, gapWords: ["homework"] }],
    notes: "",
  };
  const topics = new Set(["school-education"]);

  it("passes a word that follows the rules", () => {
    expect(checkWordDraft("A1", draft, topics)).toEqual([]);
  });

  it("wants one example at A1, two from B1, a known topic and a suggestion for flagged IPA", () => {
    expect(checkWordDraft("B1", { ...draft, topic: "nope", ipaOk: false }, topics)).toEqual([
      'word:homework-n: unknown topic "nope"',
      "word:homework-n: 1 examples, expected 2",
      "word:homework-n: IPA flagged without a suggestion",
    ]);
  });

  it("rejects an IPA suggestion that is not a transcription", () => {
    expect(checkWordDraft("A1", { ...draft, ipaOk: false, ipaSuggestion: "|" }, topics)).toEqual([
      'word:homework-n: IPA suggestion "|" is not a /transcription/',
    ]);
  });
});

describe("buildWriting", () => {
  const index = new Map([
    ["like|verb", "word:like-v"],
    ["like|preposition", "word:like-prep"],
    ["rice|noun", "word:rice-n"],
  ]);
  const task = (useWords: string[]) => ({ tasks: [{ promptVi: "Viết 2 câu.", modelAnswers: ["I like rice."], useWords }] });

  it("links word ids and unambiguous headwords", () => {
    const { items, problems } = buildWriting("A1", task(["word:like-v", "rice"]), index);
    expect(problems).toEqual([]);
    expect(items[0]).toMatchObject({ id: "writing:a1-1-i-like-rice", body: { useItems: ["word:like-v", "word:rice-n"] } });
  });

  it("reports ambiguous headwords and unknown words instead of guessing", () => {
    const { problems } = buildWriting("A1", task(["like", "bread", "word:nope-n"]), index);
    expect(problems).toEqual([
      'writing:a1-1-i-like-rice: "like" is ambiguous, use one of word:like-v, word:like-prep',
      'writing:a1-1-i-like-rice: "bread" is not in the word list',
      "writing:a1-1-i-like-rice: unknown word id word:nope-n",
    ]);
  });
});

describe("irregular verb forms (feature 008)", () => {
  const verb: WordlistRow = { id: "word:get-v", headword: "get", variants: [], pos: "verb", level: "A1", source: "cefrj-1.5", topicHints: [] };
  const draft: FormsDraft = {
    wordId: "word:get-v",
    past: [{ text: "got" }],
    participle: [{ text: "gotten", region: "us" }, { text: "got" }],
    practice: [
      { en: "I ___ a letter yesterday.", answer: "past", vi: "Hôm qua tôi nhận được một lá thư." },
      { en: "She has ___ better.", answer: "participle", vi: "Cô ấy đã khỏe hơn." },
    ],
  };

  it("builds a forms item with the word's id and level, IPA left for content:ipa", () => {
    const built = buildForms(verb, draft);
    expect(built.problems).toEqual([]);
    expect(built.items[0]).toMatchObject({
      id: "forms:get-v",
      kind: "forms",
      level: "A1",
      status: "draft",
      body: { wordId: "word:get-v", past: [{ text: "got", ipa: "" }], participle: [{ text: "gotten", ipa: "", region: "us" }, { text: "got", ipa: "" }] },
    });
  });

  it("passes a complete draft", () => {
    expect(checkFormsDraft("A1", draft)).toEqual([]);
  });

  it("asks for a sentence per form, one blank each, within the level's length", () => {
    const problems = checkFormsDraft("A1", {
      ...draft,
      past: [{ text: "Got" }],
      practice: [{ en: "I ___ it and ___ it again after that long day at work.", answer: "past", vi: "" }, { en: "x ___ y", answer: "past", vi: "x" }],
    });
    expect(problems).toEqual([
      "word:get-v: needs a practice sentence for the past and one for the participle",
      "word:get-v practice 1: 2 blanks, expected 1",
      "word:get-v practice 1: 13 words, A1 allows 10",
      "word:get-v practice 1: missing Vietnamese translation",
      'word:get-v: form "Got" should be one lowercase word',
    ]);
  });

  it("refuses a word that isn't a verb", () => {
    expect(buildForms({ ...verb, pos: "noun" }, draft).problems).toEqual(["word:get-v: not a verb (noun)"]);
  });
});
