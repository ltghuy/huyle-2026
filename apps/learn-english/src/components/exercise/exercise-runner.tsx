"use client";

import { useEffect, useEffectEvent, useRef, useState, type FormEvent } from "react";
import { RotateCcw, X } from "lucide-react";
import type { ContentItemOf } from "@/content/schema";
import type { GradeResult } from "@/learning/exercises/types";
import type { CardItemId, ExerciseKind } from "@/learning/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { submitClaim } from "@/claims/claims-client";
import { hasUsableAiKey } from "@/lib/ai-keys";
import { playAnswerSound } from "@/lib/answer-sound";
import { FeedbackPanel } from "./feedback-panel";
import { entryFor, itemIdOf, type ExerciseInstance } from "./registry";
import { StudyCard, type StudyItem } from "./study-card";

/** How long the runner waits after a checked answer before moving on by itself (quick 056, 10 s since quick 063); the button's fill (`animate-auto-continue`) lasts as long. */
export const AUTO_CONTINUE_MS = 10_000;

/** Words and grammar an exercise practises: linked after a wrong answer and brought forward in review. */
export interface RelatedItems {
  cardIds: CardItemId[];
  link?: { href: string; label: string };
}

export type RunnerStep =
  | { key: string; type: "exercise"; instance: ExerciseInstance; seed: number; fallback?: ExerciseInstance; related?: RelatedItems }
  | { key: string; type: "study"; item: StudyItem; examples: ContentItemOf<"sentence">[] };

export interface StepOutcome {
  itemId: string;
  exercise: ExerciseKind;
  result: GradeResult;
  ms: number;
  /** Cards to bring forward when the answer was wrong (AC-035). */
  related: CardItemId[];
}

export interface RunnerScore {
  /** First-try results: retries never change them. */
  correct: number;
  total: number;
  /** Questions answered wrong on the first try and then corrected in retry rounds. */
  corrected?: number;
}

interface ExerciseRunnerProps {
  steps: RunnerStep[];
  /**
   * After the last step, bring back the questions answered wrong, round after
   * round, until a round has none wrong (feature 006). Retried answers are not
   * passed to `onOutcome` and don't change the score. Practice only.
   */
  retryWrong?: boolean;
  /** Index to start from (resuming a lesson). */
  startAt?: number;
  /** After each checked exercise; the caller records the attempt and reschedules the card. */
  onOutcome: (step: RunnerStep, outcome: StepOutcome) => void | Promise<void>;
  /** After moving on from a step (study or exercise), with the next index. Not called in retry rounds. */
  onAdvance?: (nextIndex: number) => void;
  onFinish: (score: RunnerScore) => void;
  onExit: () => void;
  /** Text of the leave confirmation; the daily lesson mentions resuming. */
  exitDescription?: string;
}

/** The step to replay in retry round `round`: the version the learner saw, with its own key and seed. */
function retryStep(step: Extract<RunnerStep, { type: "exercise" }>, swapped: boolean, round: number): RunnerStep {
  const base = step.key.split("#retry")[0];
  return {
    ...step,
    key: `${base}#retry${round}`,
    seed: step.seed + round,
    instance: swapped && step.fallback ? step.fallback : step.instance,
    fallback: swapped ? undefined : step.fallback,
  };
}

/** Focus-mode player for a list of study cards and exercises. */
export function ExerciseRunner({
  steps: firstSteps,
  retryWrong = false,
  startAt = 0,
  onOutcome,
  onAdvance,
  onFinish,
  onExit,
  exitDescription = "Những câu bạn đã trả lời vẫn được lưu và tính vào lịch ôn tập.",
}: ExerciseRunnerProps) {
  // Round 0 plays `firstSteps`; each retry round plays the questions the round before got wrong.
  const [round, setRound] = useState(0);
  const [retrySteps, setRetrySteps] = useState<RunnerStep[]>([]);
  const [wrong, setWrong] = useState<RunnerStep[]>([]);
  const [pendingRetry, setPendingRetry] = useState<RunnerStep[] | null>(null);
  const [index, setIndex] = useState(startAt);
  const [answer, setAnswer] = useState<unknown>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [swapped, setSwapped] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [confirmExit, setConfirmExit] = useState(false);
  // A wrong answer that can still be claimed (feature 016) is recorded only
  // once the learner moves on, claims it or leaves, so a claim never has to
  // undo a saved wrong attempt.
  // A ref, so a double tap can't record it twice.
  const held = useRef<StepOutcome | null>(null);
  const saving = useRef(false);
  // Set once the last step is left: finishing is async in some callers, and a
  // second tap must not finish (and award) twice.
  const [finished, setFinished] = useState(false);
  const shownAt = useRef(0);
  // AI grading of the current answer (feature 033): the button reads "Đang chấm…"
  // meanwhile, and leaving the runner aborts the call so a late verdict is dropped.
  const [checking, setChecking] = useState(false);
  const aiCall = useRef<AbortController | null>(null);

  useEffect(() => () => aiCall.current?.abort(), []);

  const steps = round === 0 ? firstSteps : retrySteps;
  const retrying = round > 0;
  const step = steps[index];
  const instance = step?.type === "exercise" ? (swapped[step.key] && step.fallback ? step.fallback : step.instance) : null;

  useEffect(() => {
    shownAt.current = performance.now();
  }, [index, instance]);

  // A checked answer, right or wrong, moves on by itself after a few seconds; study cards
  // wait for the learner. The leave dialog pauses it (quick 056).
  const autoContinue = step?.type === "exercise" && result !== null && !finished && !confirmExit;
  const onAutoContinue = useEffectEvent(() => handleContinue());
  useEffect(() => {
    if (!autoContinue) return;
    const timer = setTimeout(onAutoContinue, AUTO_CONTINUE_MS);
    return () => clearTimeout(timer);
  }, [autoContinue, step?.key]);

  if (!step) return null;

  /**
   * Second opinion on an answer matching marked wrong (feature 033), when the
   * kind supports it, the answer could be claimed and the learner has a key.
   * Returns null when the runner was left meanwhile.
   */
  async function gradeByAi(entry: ReturnType<typeof entryFor>, current: ExerciseInstance, matched: GradeResult): Promise<GradeResult | null> {
    const claim = entry.claimOf?.(current, answer);
    if (matched.correct || !entry.aiGrade || !claim || !hasUsableAiKey()) return matched;
    const controller = new AbortController();
    aiCall.current = controller;
    setChecking(true);
    const verdict = await entry.aiGrade(current, answer, controller.signal);
    if (controller.signal.aborted) return null;
    aiCall.current = null;
    setChecking(false);
    if (!verdict) return { ...matched, aiUnavailable: true };
    if (!verdict.correct) return { ...matched, aiGraded: true, ...(verdict.explanationVi ? { explanationVi: verdict.explanationVi } : {}) };
    // Right in other words: a normal correct answer, and the wording goes to the owner's review (AC-009, AC-017).
    submitClaim({ ...claim, source: "ai", related: step.type === "exercise" ? (step.related?.cardIds ?? []) : [] });
    return { ...matched, correct: true, aiGraded: true };
  }

  async function handleCheck() {
    if (step.type !== "exercise" || !instance || answer === null || result || checking) return;
    const entry = entryFor(instance);
    // The learner's time, before any wait for AI: a slow verdict mustn't rate the answer hard.
    const ms = Math.round(performance.now() - shownAt.current);
    const graded = await gradeByAi(entry, instance, entry.grade(instance, answer));
    if (!graded) return;
    playAnswerSound(graded.correct);
    setResult(graded);
    if (retryWrong && !graded.correct) setWrong((current) => [...current, retryStep(step, Boolean(swapped[step.key]), round + 1)]);
    // Retries are practice only: the first try is what counts (AC-006).
    if (retrying) return;
    setScore((current) => ({ correct: current.correct + (graded.correct ? 1 : 0), total: current.total + 1 }));
    const outcome: StepOutcome = {
      itemId: itemIdOf(instance),
      exercise: entry.exercise,
      result: graded,
      ms,
      related: step.related?.cardIds ?? [],
    };
    if (!graded.correct && entry.claimOf?.(instance, answer)) held.current = outcome;
    else await onOutcome(step, outcome);
  }

  /** Records the held outcome, if any, before the step is left. */
  async function flushHeld() {
    const outcome = held.current;
    if (!outcome) return;
    held.current = null;
    saving.current = true;
    try {
      await onOutcome(step, outcome);
    } finally {
      saving.current = false;
    }
  }

  function handleClaim() {
    if (step.type !== "exercise" || !instance || !result || result.correct) return;
    const claim = entryFor(instance).claimOf?.(instance, answer);
    if (!claim) return;
    submitClaim({ ...claim, related: step.related?.cardIds ?? [] });
    // Counted as right but hard, like a hinted answer (016 AC-007).
    const claimed = { ...result, correct: true, hinted: true, claimed: true };
    setResult(claimed);
    const retryKey = retryStep(step, Boolean(swapped[step.key]), round + 1).key;
    setWrong((current) => current.filter((wrongStep) => wrongStep.key !== retryKey));
    if (retrying) return;
    setScore((current) => ({ ...current, correct: current.correct + 1 }));
    if (held.current) held.current = { ...held.current, result: claimed };
  }

  async function handleExit() {
    await flushHeld();
    onExit();
  }

  function handleContinue() {
    if (finished || saving.current) return;
    const recording = held.current ? flushHeld() : null;
    // Move on at once; only finishing waits, so the last answer is saved before the lesson completes.
    if (recording && index + 1 >= steps.length) void recording.then(advance);
    else advance();
  }

  function advance() {
    const next = index + 1;
    if (!retrying) onAdvance?.(next);
    if (next >= steps.length) {
      if (wrong.length > 0) {
        setPendingRetry(wrong);
        return;
      }
      setFinished(true);
      onFinish(retrying ? { ...score, corrected: score.total - score.correct } : score);
      return;
    }
    setIndex(next);
    setAnswer(null);
    setResult(null);
  }

  function handleStartRetry() {
    if (!pendingRetry) return;
    setRetrySteps(pendingRetry);
    setRound((current) => current + 1);
    setWrong([]);
    setPendingRetry(null);
    setIndex(0);
    setAnswer(null);
    setResult(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (step.type === "study" || result) handleContinue();
    else void handleCheck();
  }

  function handleAudioError() {
    if (step.type === "exercise" && step.fallback && !result) {
      setSwapped((current) => ({ ...current, [step.key]: true }));
      setAnswer(null);
    }
  }

  function handleClose() {
    if (!retrying && !pendingRetry && index === 0 && !result) onExit();
    else setConfirmExit(true);
  }

  const entry = instance ? entryFor(instance) : null;
  const View = entry?.View ?? null;
  const canCheck = step.type === "exercise" && answer !== null;
  const canClaim = Boolean(instance && result && !result.correct && entry?.claimOf?.(instance, answer));

  const exitDialog = (
    <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dừng bài ở đây?</AlertDialogTitle>
          <AlertDialogDescription>{exitDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Học tiếp</AlertDialogCancel>
          <AlertDialogAction onClick={handleExit}>Dừng lại</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (pendingRetry) {
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/95 px-4 py-3 backdrop-blur">
          <Button type="button" variant="ghost" size="icon-lg" onClick={handleClose} aria-label="Thoát">
            <X aria-hidden />
          </Button>
        </header>
        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <RotateCcw className="size-12 text-primary" aria-hidden />
          <h2 className="text-2xl font-semibold">Còn {pendingRetry.length} câu chưa đúng</h2>
          <p className="text-muted-foreground">Làm lại các câu này cho đến khi đúng hết nhé. Kết quả lần đầu vẫn được giữ nguyên.</p>
          <Button type="button" size="lg" className="mt-2 h-12 w-full text-base" onClick={handleStartRetry} autoFocus>
            Làm lại câu sai
          </Button>
        </main>
        {exitDialog}
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/95 px-4 py-3 backdrop-blur">
        <Button type="button" variant="ghost" size="icon-lg" onClick={handleClose} aria-label="Thoát">
          <X aria-hidden />
        </Button>
        {retrying ? <span className="shrink-0 text-sm font-medium text-primary">Làm lại câu sai</span> : null}
        <Progress value={(index / steps.length) * 100} className="flex-1" aria-label={retrying ? "Tiến độ làm lại" : "Tiến độ"} />
        <span className="w-14 text-right text-sm text-muted-foreground tabular-nums">
          {index + 1}/{steps.length}
        </span>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <main className="mx-auto w-full max-w-xl flex-1 px-4 py-6">
          {step.type === "study" ? (
            <StudyCard item={step.item} examples={step.examples} />
          ) : View && instance ? (
            <View
              key={`${step.key}-${swapped[step.key] ? "fallback" : "main"}`}
              instance={instance}
              answer={answer}
              onAnswer={setAnswer}
              result={result}
              seed={step.seed}
              onAudioError={handleAudioError}
              onClaim={canClaim ? handleClaim : undefined}
              checking={checking}
            />
          ) : null}
        </main>

        <div className="sticky bottom-0 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto grid w-full max-w-xl gap-3">
            {result ? <FeedbackPanel key={step.key} result={result} relatedLink={step.type === "exercise" ? step.related?.link : undefined} /> : null}
            {finished ? (
              <Button type="button" size="lg" className="h-12 w-full text-base" disabled>
                Đang lưu…
              </Button>
            ) : step.type === "study" || result ? (
              <Button type="submit" size="lg" className="relative h-12 w-full overflow-hidden text-base">
                {autoContinue ? (
                  <span
                    key={step.key}
                    aria-hidden
                    className="absolute inset-0 origin-left bg-primary-foreground/15 motion-safe:animate-auto-continue motion-reduce:hidden"
                  />
                ) : null}
                <span className="relative">Tiếp tục</span>
              </Button>
            ) : (
              <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={!canCheck || checking}>
                {checking ? "Đang chấm…" : "Kiểm tra"}
              </Button>
            )}
          </div>
        </div>
      </form>

      {exitDialog}
    </div>
  );
}
