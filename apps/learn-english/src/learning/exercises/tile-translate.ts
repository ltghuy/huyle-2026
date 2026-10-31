// Translate the Vietnamese sentence by arranging word tiles (AC-033): the
// sentence's tokens plus 2 distractor words. A distractor never equals a
// token, and the answer must use exactly the sentence's tokens, so no
// arrangement that uses a distractor can be correct.
import { normalize } from "../normalize";
import { createRng, shuffle } from "./random";
import { isAcceptedOrder, shuffleTokens, type Tile } from "./tiles";
import type { GradeResult, SentenceItem } from "./types";

export const DISTRACTOR_TILES = 2;

export interface TileTranslateInstance {
  kind: "tile-translate";
  sentenceId: string;
  vi: string;
  audio: string;
  tiles: Tile[];
  /** Kept for grading. */
  body: SentenceItem["body"];
}

export interface TileTranslateInput {
  sentence: SentenceItem;
  /** Words to draw the distractor tiles from (e.g. same-level headwords). */
  distractorPool: readonly string[];
}

/** True when `pool` has enough words that are not tokens of the sentence: exactly when `buildTileTranslate` doesn't return null. */
export function hasTileDistractors(sentence: SentenceItem, pool: Iterable<string>): boolean {
  const tokens = new Set(sentence.body.tokens.map(normalize));
  const found = new Set<string>();
  for (const candidate of pool) {
    const form = normalize(candidate);
    if (form === "" || tokens.has(form)) continue;
    found.add(form);
    if (found.size === DISTRACTOR_TILES) return true;
  }
  return false;
}

export function buildTileTranslate(input: TileTranslateInput, seed: number): TileTranslateInstance | null {
  const { sentence, distractorPool } = input;
  const { body } = sentence;
  const rng = createRng(seed);
  const seen = new Set(body.tokens.map(normalize));
  const distractors: string[] = [];
  for (const candidate of shuffle(distractorPool, rng)) {
    if (distractors.length === DISTRACTOR_TILES) break;
    const form = normalize(candidate);
    if (form === "" || seen.has(form)) continue;
    seen.add(form);
    distractors.push(candidate.trim());
  }
  if (distractors.length < DISTRACTOR_TILES) return null;

  const tokenTiles = shuffleTokens(body, rng).map((id) => ({ id, text: body.tokens[id] }));
  const extraTiles = distractors.map((text, i) => ({ id: body.tokens.length + i, text }));
  return {
    kind: "tile-translate",
    sentenceId: sentence.id,
    vi: body.vi,
    audio: body.audio,
    tiles: shuffle([...tokenTiles, ...extraTiles], rng),
    body,
  };
}

/** Correct when the tiles used are exactly the sentence's tokens in an accepted order. */
export function gradeTileTranslate(instance: TileTranslateInstance, tileIds: readonly number[]): GradeResult {
  return { correct: isAcceptedOrder(instance.body, tileIds), expected: instance.body.en };
}
