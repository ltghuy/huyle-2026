// Shared by the tile exercises (word-order, tile-translate): answers are
// compared by token text, so repeated words ("the ... the") are
// interchangeable, against every accepted order of the sentence.
import { normalize } from "../normalize";
import { shuffle, type Rng } from "./random";
import type { SentenceItem } from "./types";

export interface Tile {
  /** Index into the sentence tokens; distractor tiles come after them. */
  id: number;
  /** Original casing, as shown. */
  text: string;
}

const MAX_SHUFFLES = 20;

const textsOf = (tokens: readonly string[], order: readonly number[]) => order.map((i) => normalize(tokens[i]));
const sameTexts = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((text, i) => text === b[i]);

/** True when the token texts in `order` match an accepted order of the sentence. */
export function isAcceptedOrder(body: SentenceItem["body"], order: readonly number[]): boolean {
  const { tokens, acceptedOrders } = body;
  if (order.length !== tokens.length || new Set(order).size !== order.length) return false;
  if (!order.every((id) => Number.isInteger(id) && id >= 0 && id < tokens.length)) return false;
  const submitted = textsOf(tokens, order);
  return acceptedOrders.some((accepted) => sameTexts(textsOf(tokens, accepted), submitted));
}

/** The sentence's token indexes shuffled, avoiding an order that is already correct when possible. */
export function shuffleTokens(body: SentenceItem["body"], rng: Rng): number[] {
  const indexes = body.tokens.map((_, i) => i);
  let order = shuffle(indexes, rng);
  for (let tries = 1; tries < MAX_SHUFFLES && isAcceptedOrder(body, order); tries++) order = shuffle(indexes, rng);
  return order;
}

/** The text of one accepted order, as a sentence. */
export function acceptedText(body: SentenceItem["body"], order: readonly number[]): string {
  return order.map((i) => body.tokens[i]).join(" ");
}
