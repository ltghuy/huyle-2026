import type { ContentItemOf } from "@/content/schema";
import { hardWords, type HardReason } from "@/learning/hard-words";
import type { Attempt, ExerciseDescriptor, ExerciseKind } from "@/learning/types";
import type { ContentIndex } from "@/lib/session/content-index";
import { prepareStep } from "@/lib/session/prepare";
import type { RunnerStep } from "@/components/exercise/exercise-runner";

export interface HardWordRow {
  word: ContentItemOf<"word">;
  reason: HardReason;
  /** Short Vietnamese stat for the reason, e.g. "Sai 4/8 lần gần nhất". */
  stat: string;
}

export const REASON_LABELS: Record<HardReason, string> = {
  "often-wrong": "Hay sai",
  slow: "Nhớ chậm",
};

// Same windows as src/learning/hard-words.ts, used here only to word the stat.
const WRONG_WINDOW = 8;
const SLOW_WINDOW = 5;

function statFor(reason: HardReason, attempts: readonly Attempt[]): string {
  const sorted = attempts.toSorted((a, b) => a.at - b.at);
  if (reason === "often-wrong") {
    const recent = sorted.slice(-WRONG_WINDOW);
    return `Sai ${recent.filter((a) => !a.correct).length}/${recent.length} lần gần nhất`;
  }
  const recent = sorted.slice(-SLOW_WINDOW);
  const seconds = recent.reduce((sum, a) => sum + a.ms, 0) / recent.length / 1000;
  return `Trung bình ${seconds.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} giây mỗi lần gần đây`;
}

/** Hard words found in the loaded content, hardest first; words missing from content are hidden. */
export function hardWordRows(attempts: readonly Attempt[], index: ContentIndex): HardWordRow[] {
  const byItem = new Map<string, Attempt[]>();
  for (const attempt of attempts) {
    const list = byItem.get(attempt.itemId);
    if (list) list.push(attempt);
    else byItem.set(attempt.itemId, [attempt]);
  }
  return hardWords(attempts).flatMap(({ itemId, reason }) => {
    const word = index.byId.get(itemId);
    if (word?.kind !== "word") return [];
    return [{ word, reason, stat: statFor(reason, byItem.get(itemId) ?? []) }];
  });
}

const PRACTICE_KINDS = ["mcq", "recall", "missing-letters"] as const satisfies readonly ExerciseKind[];
/** Practice sessions stay short: the hardest words first. */
export const PRACTICE_LIMIT = 20;

/**
 * One exercise per hard word, the kind rotating by `seed`. When content can't
 * support the chosen kind (e.g. too few words for 4 options), the next kind is tried.
 */
export function practiceSteps(wordIds: readonly string[], index: ContentIndex, seed: number): RunnerStep[] {
  return wordIds.slice(0, PRACTICE_LIMIT).flatMap((wordId, i) => {
    for (let k = 0; k < PRACTICE_KINDS.length; k++) {
      const descriptor: ExerciseDescriptor = {
        kind: PRACTICE_KINDS[(seed + i + k) % PRACTICE_KINDS.length],
        itemIds: [wordId],
        seed: seed + i,
      };
      const step = prepareStep(descriptor, index, `hard-${seed}-${i}`);
      if (step) return [step];
    }
    return [];
  });
}
