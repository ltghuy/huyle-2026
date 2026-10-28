import type { RunnerStep } from "@/components/exercise/exercise-runner";
import { buildFormsGap, buildFormsListening, buildFormsTyping } from "@/learning/exercises/forms";
import { createRng, shuffle } from "@/learning/exercises/random";
import type { VerbEntry } from "@/learning/verbs";

/** Verbs in one practice set; "Làm lại" draws another set from the same filter. */
export const VERBS_PER_SET = 10;

type Kind = "past" | "participle" | "gap" | "listening";
const ROTATION: Kind[] = ["past", "gap", "participle", "listening"];

/**
 * One practice set (AC-007): up to 10 verbs from `verbs` in a random order
 * for `round`, one exercise each, rotating typing the past, choosing the form
 * for a sentence, typing the participle and listening. Listening needs the
 * verb's clip and falls back to typing; a sentence that can't get four
 * options falls back to typing too.
 */
export function verbPracticeSteps(verbs: readonly VerbEntry[], round: number): RunnerStep[] {
  const picked = shuffle(verbs, createRng(round + 1)).slice(0, VERBS_PER_SET);
  return picked.map((verb, i) => {
    const seed = round * 1000 + i;
    const input = { forms: verb.forms, word: verb.word };
    const kind = ROTATION[(round + i) % ROTATION.length];
    const key = `${verb.forms.id}-${round}-${i}`;
    if (kind === "gap") {
      return { key, type: "exercise", instance: buildFormsGap(input, seed) ?? buildFormsTyping({ ...input, form: "past" }, seed), seed };
    }
    if (kind === "listening") {
      const typing = buildFormsTyping({ ...input, form: "participle" }, seed);
      return { key, type: "exercise", instance: buildFormsListening(input, seed) ?? typing, seed, fallback: typing };
    }
    return { key, type: "exercise", instance: buildFormsTyping({ ...input, form: kind }, seed), seed };
  });
}
