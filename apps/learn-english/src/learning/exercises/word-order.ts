// Put the shuffled words in order (AC-033). Any accepted order is right, and
// identical words may be placed in either position.
import { createRng } from "./random";
import { isAcceptedOrder, shuffleTokens, type Tile } from "./tiles";
import type { GradeResult, SentenceItem } from "./types";

export interface WordOrderInstance {
  kind: "word-order";
  sentenceId: string;
  tiles: Tile[];
  vi: string;
  audio: string;
  /** Kept for grading. */
  body: SentenceItem["body"];
}

export function buildWordOrder(input: { sentence: SentenceItem }, seed: number): WordOrderInstance {
  const { sentence } = input;
  const { body } = sentence;
  const order = shuffleTokens(body, createRng(seed));
  return {
    kind: "word-order",
    sentenceId: sentence.id,
    tiles: order.map((id) => ({ id, text: body.tokens[id] })),
    vi: body.vi,
    audio: body.audio,
    body,
  };
}

/** `tileIds` is the learner's sequence of tile ids. */
export function gradeWordOrder(instance: WordOrderInstance, tileIds: readonly number[]): GradeResult {
  return { correct: isAcceptedOrder(instance.body, tileIds), expected: instance.body.en };
}
