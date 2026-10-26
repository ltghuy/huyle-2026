import type { Attempt } from "./types";

export type HardReason = "often-wrong" | "slow";

export interface HardWord {
  itemId: string;
  reason: HardReason;
  score: number;
}

const WRONG_WINDOW = 8;
const WRONG_MIN = 3;
const SLOW_WINDOW = 5;
const SLOW_AVG_MS = 8000;
const EXIT_WINDOW = 4;
const EXIT_MAX_MS = 5000;

/**
 * Words the learner struggles with, hardest first. Takes attempts of any items
 * in any order; only `word:` items are considered.
 */
export function hardWords(attempts: readonly Attempt[]): HardWord[] {
  const byItem = new Map<string, Attempt[]>();
  for (const a of attempts) {
    if (!a.itemId.startsWith("word:")) continue;
    const list = byItem.get(a.itemId);
    if (list) list.push(a);
    else byItem.set(a.itemId, [a]);
  }

  const result: HardWord[] = [];
  for (const [itemId, list] of byItem) {
    const hard = classify(list);
    if (hard) result.push({ itemId, ...hard });
  }
  return result.sort((a, b) => b.score - a.score || a.itemId.localeCompare(b.itemId));
}

function classify(attempts: Attempt[]): Omit<HardWord, "itemId"> | null {
  const sorted = [...attempts].sort((a, b) => a.at - b.at);

  const lastExit = sorted.slice(-EXIT_WINDOW);
  if (lastExit.length === EXIT_WINDOW && lastExit.every((a) => a.correct && a.ms < EXIT_MAX_MS)) return null;

  const lastWrong = sorted.slice(-WRONG_WINDOW);
  const wrong = lastWrong.filter((a) => !a.correct).length;
  // The slow rule needs a full window, so one slow answer doesn't flag a word.
  const lastSlow = sorted.slice(-SLOW_WINDOW);
  const avgMs = lastSlow.reduce((sum, a) => sum + a.ms, 0) / lastSlow.length;
  const oftenWrong = wrong >= WRONG_MIN;
  const slow = lastSlow.length === SLOW_WINDOW && avgMs > SLOW_AVG_MS;
  if (!oftenWrong && !slow) return null;

  // Score: share wrong in the last 8 (0–1) plus average seconds over the last
  // 5 divided by 16 (8 s ≈ 0.5, capped at 1), so mistakes outweigh slowness.
  const score = wrong / lastWrong.length + Math.min(avgMs / 16_000, 1);
  return { reason: oftenWrong ? "often-wrong" : "slow", score: Math.round(score * 1000) / 1000 };
}
