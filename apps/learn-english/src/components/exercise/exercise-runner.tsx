"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
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
import { FeedbackPanel } from "./feedback-panel";
import { entryFor, itemIdOf, type ExerciseInstance } from "./registry";
import { StudyCard, type StudyItem } from "./study-card";

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

interface ExerciseRunnerProps {
  steps: RunnerStep[];
  /** Index to start from (resuming a lesson). */
  startAt?: number;
  /** After each checked exercise; the caller records the attempt and reschedules the card. */
  onOutcome: (step: RunnerStep, outcome: StepOutcome) => void | Promise<void>;
  /** After moving on from a step (study or exercise), with the next index. */
  onAdvance?: (nextIndex: number) => void;
  onFinish: (score: { correct: number; total: number }) => void;
  onExit: () => void;
  /** Text of the leave confirmation; the daily lesson mentions resuming. */
  exitDescription?: string;
}

/** Focus-mode player for a list of study cards and exercises. */
export function ExerciseRunner({
  steps,
  startAt = 0,
  onOutcome,
  onAdvance,
  onFinish,
  onExit,
  exitDescription = "Những câu bạn đã trả lời vẫn được lưu và tính vào lịch ôn tập.",
}: ExerciseRunnerProps) {
  const [index, setIndex] = useState(startAt);
  const [answer, setAnswer] = useState<unknown>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [swapped, setSwapped] = useState<Record<string, boolean>>({});
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [confirmExit, setConfirmExit] = useState(false);
  const shownAt = useRef(0);

  const step = steps[index];
  const instance = step?.type === "exercise" ? (swapped[step.key] && step.fallback ? step.fallback : step.instance) : null;

  useEffect(() => {
    shownAt.current = performance.now();
  }, [index, instance]);

  if (!step) return null;

  async function handleCheck() {
    if (step.type !== "exercise" || !instance || answer === null || result) return;
    const entry = entryFor(instance);
    const graded = entry.grade(instance, answer);
    setResult(graded);
    setScore((current) => ({ correct: current.correct + (graded.correct ? 1 : 0), total: current.total + 1 }));
    await onOutcome(step, {
      itemId: itemIdOf(instance),
      exercise: entry.exercise,
      result: graded,
      ms: Math.round(performance.now() - shownAt.current),
      related: step.related?.cardIds ?? [],
    });
  }

  function handleContinue() {
    const next = index + 1;
    onAdvance?.(next);
    if (next >= steps.length) {
      onFinish(score);
      return;
    }
    setIndex(next);
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
    if (index === 0 && !result) onExit();
    else setConfirmExit(true);
  }

  const View = instance ? entryFor(instance).View : null;
  const canCheck = step.type === "exercise" && answer !== null;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/95 px-4 py-3 backdrop-blur">
        <Button type="button" variant="ghost" size="icon-lg" onClick={handleClose} aria-label="Thoát">
          <X aria-hidden />
        </Button>
        <Progress value={(index / steps.length) * 100} className="flex-1" aria-label="Tiến độ" />
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
            />
          ) : null}
        </main>

        <div className="sticky bottom-0 border-t bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <div className="mx-auto grid w-full max-w-xl gap-3">
            {result ? <FeedbackPanel result={result} relatedLink={step.type === "exercise" ? step.related?.link : undefined} /> : null}
            {step.type === "study" || result ? (
              <Button type="submit" size="lg" className="h-12 w-full text-base">
                Tiếp tục
              </Button>
            ) : (
              <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={!canCheck}>
                Kiểm tra
              </Button>
            )}
          </div>
        </div>
      </form>

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dừng bài ở đây?</AlertDialogTitle>
            <AlertDialogDescription>{exitDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Học tiếp</AlertDialogCancel>
            <AlertDialogAction onClick={onExit}>Dừng lại</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
