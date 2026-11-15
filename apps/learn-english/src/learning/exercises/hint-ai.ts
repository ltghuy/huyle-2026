// AI grammar hints for "Dịch câu" with the learner's own Google AI Studio key
// (feature 043): the request body and reading the reply. Keys, take-over between
// keys and refusals work as for grading (`translate-ai.ts`, `src/ai-grading/gemini-client.ts`).
import { z } from "zod";
import { buildJsonRequest, replyJson, type OutputFormat } from "./translate-ai";

/** Longest wait for a hint, across every key tried. */
export const HINT_BUDGET_MS = 8000;
/** At most this many grammar hints, each at most this long (AC-006). */
export const MAX_AI_HINTS = 3;
export const MAX_HINT_LENGTH = 200;
/** Room for three short hints. */
const MAX_OUTPUT_TOKENS = 384;
/** Reference words this long or longer must not appear in a hint: they would give the answer away (AC-007). */
const GIVEAWAY_MIN_LENGTH = 5;

const HINT_SCHEMA = {
  type: "object",
  properties: { hintsVi: { type: "array", items: { type: "string" } } },
  required: ["hintsVi"],
} as const;

const SYSTEM_PROMPT = [
  "You help a Vietnamese learner who is translating one Vietnamese sentence into English and is stuck.",
  "Give 1 to 3 short grammar hints in Vietnamese, addressing the learner as \"bạn\", one sentence each: which tense to use and why, and which structure the sentence needs (for example a that-clause, the passive, a gerund after a verb, a comparative, an imperative, word order of adjectives).",
  'Name each tense or structure in Vietnamese with its usual English grammar name in parentheses, for example "thì quá khứ đơn (Past Simple)" or "câu bị động (Passive Voice)".',
  "Never write the English translation, any English word or phrase from it, or a corrected sentence. Do not give vocabulary or word meanings. The reference translation is given only so that your hints fit it.",
  'Reply with JSON only: {"hintsVi": string[]}.',
].join("\n");

export interface HintPrompt {
  vi: string;
  en: string;
}

/** The generateContent body for one sentence's grammar hints. */
export function buildHintRequest({ vi, en }: HintPrompt, format: OutputFormat) {
  return buildJsonRequest(SYSTEM_PROMPT, `Vietnamese sentence: ${vi}\nReference translation: ${en}`, HINT_SCHEMA, format, MAX_OUTPUT_TOKENS);
}

const hintsSchema = z.object({ hintsVi: z.array(z.string()) });

/** The reference's longer words, lowercased: a hint naming one gives the answer away. */
function giveawayWords(en: string): Set<string> {
  return new Set((en.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []).filter((word) => word.length >= GIVEAWAY_MIN_LENGTH));
}

function givesAway(hint: string, words: ReadonlySet<string>): boolean {
  return (hint.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? []).some((word) => words.has(word));
}

/**
 * The hints in a 200 reply: trimmed, capped, without any that quote the answer.
 * Null when the reply can't be read or no hint is left, so another key may try.
 */
export function parseHintReply(body: unknown, en: string): string[] | null {
  const reply = hintsSchema.safeParse(replyJson(body));
  if (!reply.success) return null;
  const words = giveawayWords(en);
  const hints = reply.data.hintsVi
    .map((hint) => hint.trim())
    .filter((hint) => hint !== "" && hint.length <= MAX_HINT_LENGTH && !givesAway(hint, words))
    .slice(0, MAX_AI_HINTS);
  return hints.length > 0 ? hints : null;
}
