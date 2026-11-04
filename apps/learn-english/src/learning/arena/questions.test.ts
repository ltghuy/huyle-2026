import { describe, expect, it } from "vitest";
import { sentence, word } from "../exercises/fixtures";
import {
  availableModes,
  buildRound,
  isCorrect,
  letterMask,
  MAX_WRITE_TOKENS,
  publicView,
  revealOf,
  ROUND_SIZE,
  type ArenaPool,
  type ServerQuestion,
} from "./questions";

const AUDIO = "a".repeat(64);
const HEADWORDS = ["apple", "angle", "ankle", "amber", "baker", "basket", "bottle", "button", "candle", "carpet", "castle", "cotton", "dinner", "doctor", "dollar", "danger", "eagle", "early", "earth", "easel"];

const words = HEADWORDS.map((headword) => word(headword, { audio: AUDIO, ipa: `/${headword}/`, meaningsVi: [`nghĩa của ${headword}`] }));
const sentences = Array.from({ length: 20 }, (_, i) => sentence(`s${i}`, { tokens: ["We", "like", `item${String.fromCharCode(97 + i)}`], vi: `Chúng tôi thích món ${i}.` }));
const pool: ArenaPool = { words, sentences, wordings: new Map() };

function itemIds(questions: ServerQuestion[]) {
  return questions.map((q) => q.itemId);
}

describe("buildRound", () => {
  it("asks 12 questions, the same for the same seed (AC-011)", () => {
    const a = buildRound(pool, "mixed", 42);
    const b = buildRound(pool, "mixed", 42);
    expect(a).toHaveLength(ROUND_SIZE);
    expect(itemIds(a)).toEqual(itemIds(b));
    expect(itemIds(buildRound(pool, "mixed", 43))).not.toEqual(itemIds(a));
  });

  it("uses only the mode's type, or 4 of each in Hỗn hợp", () => {
    expect(new Set(buildRound(pool, "listen", 1).map((q) => q.type))).toEqual(new Set(["listen"]));
    expect(new Set(buildRound(pool, "write", 1).map((q) => q.type))).toEqual(new Set(["write"]));
    const mixed = buildRound(pool, "mixed", 1).map((q) => q.type);
    expect(mixed.filter((t) => t === "listen")).toHaveLength(4);
    expect(mixed.filter((t) => t === "recall")).toHaveLength(4);
    expect(mixed.filter((t) => t === "write")).toHaveLength(4);
  });

  it("never asks the same item twice in a round, even across types", () => {
    const ids = itemIds(buildRound(pool, "mixed", 7));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("prefers items not asked earlier in the match, and reuses them only when it must", () => {
    const first = buildRound(pool, "listen", 3);
    const second = buildRound(pool, "listen", 4, ROUND_SIZE, new Set(itemIds(first)));
    // 20 words: 8 fresh ones come first, then 4 from the first round.
    expect(second.filter((q) => !itemIds(first).includes(q.itemId))).toHaveLength(8);
    expect(second).toHaveLength(ROUND_SIZE);
  });

  it("builds a single sudden-death question", () => {
    expect(buildRound(pool, "mixed", 9, 1)).toHaveLength(1);
  });

  it("leaves out words without audio from listening and long sentences from writing", () => {
    const silent: ArenaPool = { ...pool, words: [...words.slice(0, 3), word("quiet", { audio: "" })] };
    expect(buildRound(silent, "listen", 1).some((q) => q.itemId === "word:quiet")).toBe(false);
    const long = sentence("long", { tokens: Array.from({ length: MAX_WRITE_TOKENS + 1 }, (_, i) => `w${i}`) });
    const withLong: ArenaPool = { ...pool, sentences: [long] };
    expect(buildRound(withLong, "write", 1)).toHaveLength(0);
  });
});

describe("availableModes", () => {
  it("offers every mode when the level has enough of each type", () => {
    expect(availableModes(pool)).toEqual(["listen", "recall", "write", "mixed"]);
  });

  it("drops a mode whose type runs short of a round plus sudden death (spec edge case)", () => {
    const fewSentences: ArenaPool = { ...pool, sentences: sentences.slice(0, 6) };
    // 6 sentences: too few for "Viết câu" alone (15), enough for a third of Hỗn hợp (5).
    expect(availableModes(fewSentences)).toEqual(["listen", "recall", "mixed"]);
    const noAudio: ArenaPool = { ...pool, words: words.map((w) => ({ ...w, body: { ...w.body, audio: "" } })) };
    expect(availableModes(noAudio)).toEqual(["recall", "write"]);
  });
});

describe("publicView (AC-019)", () => {
  const [listen] = buildRound(pool, "listen", 5, 1);
  const [recall] = buildRound(pool, "recall", 5, 1);
  const [write] = buildRound(pool, "write", 5, 1);

  it("shows the clip and four options for listening, but not which is right", () => {
    const view = publicView(listen);
    expect(view).toEqual({ type: "listen", audio: AUDIO, options: expect.any(Array) });
    expect(JSON.stringify(view)).not.toContain("answerIndex");
  });

  it("shows the meaning and a letter mask for recall, with no word and no clip", () => {
    const view = publicView(recall);
    expect(view.type).toBe("recall");
    const text = JSON.stringify(view);
    expect(text).not.toContain(AUDIO);
    expect(text).not.toContain(`"${recall.type === "recall" ? recall.instance.headword : ""}"`);
  });

  it("shows only the Vietnamese sentence for writing", () => {
    expect(publicView(write)).toEqual({ type: "write", vi: write.type === "write" ? write.instance.vi : "" });
  });

  it("gives the answer, IPA and clip in the reveal", () => {
    const reveal = revealOf(listen, "minh");
    expect(reveal.answeredBy).toBe("minh");
    expect(reveal.answer).toBe(listen.type === "listen" ? listen.instance.options[listen.instance.answerIndex] : "");
    expect(reveal).toMatchObject({ ipa: expect.stringMatching(/^\//), audio: AUDIO });
    expect(revealOf(write, null)).toEqual({ answer: write.type === "write" ? write.instance.en : "", answeredBy: null });
  });
});

describe("letterMask", () => {
  it("hides letters and keeps spaces, hyphens and apostrophes", () => {
    expect(letterMask("ice-cream")).toBe("___-_____");
    expect(letterMask("look after")).toBe("____ _____");
    expect(letterMask("o'clock")).toBe("_'_____");
  });
});

describe("isCorrect (AC-015)", () => {
  it("grades listening by the chosen option, and refuses typed text", () => {
    const [q] = buildRound(pool, "listen", 11, 1);
    if (q.type !== "listen") throw new Error("expected listen");
    expect(isCorrect(q, { choice: q.instance.answerIndex })).toBe(true);
    expect(isCorrect(q, { choice: (q.instance.answerIndex + 1) % 4 })).toBe(false);
    expect(isCorrect(q, { text: q.instance.options[q.instance.answerIndex] })).toBe(false);
  });

  it("grades recall like practice: case and a one-letter slip in a long word pass", () => {
    const basket: ServerQuestion = buildRound({ ...pool, words: [word("basket", { meaningsVi: ["cái giỏ"] })] }, "recall", 1, 1)[0];
    expect(isCorrect(basket, { text: "Basket" })).toBe(true);
    expect(isCorrect(basket, { text: "baskte" })).toBe(true);
    expect(isCorrect(basket, { text: "bucket" })).toBe(false);
    expect(isCorrect(basket, { choice: 0 })).toBe(false);
  });

  it("grades writing like Dịch câu: accepted orders, contractions and approved wordings", () => {
    const today = sentence("today", { tokens: ["Today", "I", "don't", "work."], acceptedOrders: [[0, 1, 2, 3], [1, 2, 3, 0]] });
    const writePool: ArenaPool = { words, sentences: [today], wordings: new Map([["sentence:today", ["I have no work today."]]]) };
    const [q] = buildRound(writePool, "write", 1, 1);
    expect(isCorrect(q, { text: "today i do not work" })).toBe(true);
    expect(isCorrect(q, { text: "I don't work today." })).toBe(true);
    expect(isCorrect(q, { text: "I have no work today" })).toBe(true);
    expect(isCorrect(q, { text: "I work today." })).toBe(false);
  });
});
