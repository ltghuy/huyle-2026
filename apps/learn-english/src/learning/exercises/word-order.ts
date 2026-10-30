// Put the shuffled words in order (AC-033). Any accepted order is right, and
// identical words may be placed in either position. Up to 2 extra tiles that
// don't belong are mixed in: first words from the sentence's reviewed wrong
// variants ("has" for "I have a dog"), near misses that test the grammar,
// then words from the pool. A distractor never matches a token, and the
// answer must use exactly the sentence's tokens, so no arrangement that uses
// a distractor can be correct.
import { normalize } from "../normalize";
import { createRng, randomInt, shuffle, type Rng } from "./random";
import { isAcceptedOrder, shuffleTokens, type Tile } from "./tiles";
import type { GradeResult, SentenceItem } from "./types";

export const WORD_ORDER_DISTRACTORS = 2;

export interface WordOrderInstance {
  kind: "word-order";
  sentenceId: string;
  /** The sentence's tokens plus the distractors, shuffled. */
  tiles: Tile[];
  vi: string;
  audio: string;
  /** Kept for grading. */
  body: SentenceItem["body"];
}

export interface WordOrderInput {
  sentence: SentenceItem;
  /** Words to fill the distractor tiles with when the wrong variants give too few (e.g. same-level headwords). */
  distractorPool: readonly string[];
}

const EDGE_PUNCTUATION = /^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu;

// Letters and digits only, so "a.m" and "a.m." or "Dog" and "dog." are the same word.
const keyOf = (text: string) => normalize(text).replace(/[^\p{L}\p{N}']/gu, "");

/** The words of the wrong variants that are not in the sentence, in random order. */
function variantWords(body: SentenceItem["body"], rng: Rng): string[] {
  const words = body.wrongVariants.flatMap((variant) => variant.en.split(/\s+/).map((word) => word.replace(EDGE_PUNCTUATION, "")));
  return shuffle(words, rng);
}

export function buildWordOrder(input: WordOrderInput, seed: number): WordOrderInstance {
  const { sentence, distractorPool } = input;
  const { body } = sentence;
  const rng = createRng(seed);
  const seen = new Set(body.tokens.map(keyOf));
  const distractors: string[] = [];
  for (const candidate of [...variantWords(body, rng), ...shuffle(distractorPool, rng)]) {
    if (distractors.length === WORD_ORDER_DISTRACTORS) break;
    const key = keyOf(candidate);
    if (key === "" || seen.has(key)) continue;
    seen.add(key);
    distractors.push(candidate.trim());
  }

  // Distractors go in at random places so the tokens keep their shuffled order,
  // which is never an accepted one when that can be avoided.
  const tiles: Tile[] = shuffleTokens(body, rng).map((id) => ({ id, text: body.tokens[id] }));
  distractors.forEach((text, i) => tiles.splice(randomInt(rng, tiles.length + 1), 0, { id: body.tokens.length + i, text }));
  return {
    kind: "word-order",
    sentenceId: sentence.id,
    tiles,
    vi: body.vi,
    audio: body.audio,
    body,
  };
}

/** `tileIds` is the learner's sequence of tile ids; correct when they are exactly the sentence's tokens in an accepted order. */
export function gradeWordOrder(instance: WordOrderInstance, tileIds: readonly number[]): GradeResult {
  return { correct: isAcceptedOrder(instance.body, tileIds), expected: instance.body.en };
}
