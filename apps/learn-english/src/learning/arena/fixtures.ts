// Test-only content and helpers for the Arena rules (feature 023).
import { sentence, word } from "../exercises/fixtures";
import type { ArenaAnswer, ArenaPool, ServerQuestion } from "./questions";

export const AUDIO = "a".repeat(64);

const HEADWORDS = [
  "apple", "angle", "ankle", "amber", "baker", "basket", "bottle", "button", "candle", "carpet",
  "castle", "cotton", "dinner", "doctor", "dollar", "danger", "eagle", "early", "earth", "easel",
  "fabric", "falcon", "farmer", "father", "garden", "garlic", "ginger", "glove", "hammer", "harbor",
];

export const POOL_WORDS = HEADWORDS.map((headword) => word(headword, { audio: AUDIO, ipa: `/${headword}/`, meaningsVi: [`nghĩa của ${headword}`] }));
export const POOL_SENTENCES = Array.from({ length: 30 }, (_, i) =>
  sentence(`s${i}`, { tokens: ["We", "like", `thing${String.fromCharCode(97 + (i % 26))}${Math.floor(i / 26)}`], vi: `Chúng tôi thích món ${i}.` }),
);

/** 30 words with clips and 30 short sentences: enough for a best-of-3 match in any mode. */
export const POOL: ArenaPool = { words: POOL_WORDS, sentences: POOL_SENTENCES, wordings: new Map() };

/** The right answer to a question. */
export function rightAnswer(question: ServerQuestion): ArenaAnswer {
  if (question.type === "listen") return { choice: question.instance.answerIndex };
  if (question.type === "recall") return { text: question.instance.headword };
  return { text: question.instance.en };
}

/** A wrong answer of the right kind. */
export function wrongAnswer(question: ServerQuestion): ArenaAnswer {
  if (question.type === "listen") return { choice: (question.instance.answerIndex + 1) % 4 };
  return { text: "zzzz qqqq" };
}
