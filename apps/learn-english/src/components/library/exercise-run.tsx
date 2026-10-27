"use client";

import { useMemo, useState } from "react";
import { ListX } from "lucide-react";
import { toast } from "sonner";
import { ExerciseRunner, type RunnerStep, type StepOutcome } from "@/components/exercise/exercise-runner";
import { Button } from "@/components/ui/button";
import { recordOutcome } from "@/lib/session/record";
import { FocusOverlay } from "./focus-overlay";
import { ScoreScreen } from "./score-screen";

type Score = { correct: number; total: number };

/** A random first round (never 0, the unshuffled grammar order), so each open gets a new question order. */
function randomRound(): number {
  return 1 + Math.floor(Math.random() * 2 ** 20);
}

/** Saves each checked answer as an exercise attempt and reschedules its card (AC-029). */
async function saveOutcome(_step: RunnerStep, outcome: StepOutcome): Promise<void> {
  try {
    await recordOutcome({ outcome, context: "exercise", now: Date.now() });
  } catch {
    toast.error("Chưa lưu được kết quả câu này. Bạn kiểm tra bộ nhớ trình duyệt nhé.");
  }
}

interface ExerciseRunProps {
  title: string;
  /** Steps for a round; must be stable (memoised) so a run isn't rebuilt mid-way. */
  buildSteps: (round: number) => RunnerStep[];
  /** After the last step, before the score shows. */
  onFinished?: () => void | Promise<void>;
  onClose: () => void;
  doneLabel?: string;
  /** Start from a random round instead of round 0, so the order differs on every open. */
  shuffled?: boolean;
}

/** A practice run in focus mode: the runner, then the score with "Làm lại". */
export function ExerciseRun({ title, buildSteps, onFinished, onClose, doneLabel, shuffled = false }: ExerciseRunProps) {
  const [round, setRound] = useState(() => (shuffled ? randomRound() : 0));
  const [score, setScore] = useState<Score | null>(null);
  const steps = useMemo(() => buildSteps(round), [buildSteps, round]);

  async function handleFinish(result: Score) {
    setScore(result);
    await onFinished?.();
  }

  function handleRetry() {
    setScore(null);
    setRound((value) => value + 1);
  }

  return (
    <FocusOverlay label={title}>
      {score ? (
        <ScoreScreen title={title} score={score} onRetry={handleRetry} onDone={onClose} doneLabel={doneLabel} />
      ) : steps.length === 0 ? (
        <div className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
          <ListX className="size-10 text-muted-foreground" aria-hidden />
          <p className="font-medium">Bài này chưa đủ nội dung để luyện.</p>
          <p className="text-sm text-muted-foreground">Bạn chọn một bài khác nhé.</p>
          <Button className="h-11 px-6" onClick={onClose}>
            {doneLabel ?? "Về danh sách"}
          </Button>
        </div>
      ) : (
        <ExerciseRunner key={round} steps={steps} onOutcome={saveOutcome} onFinish={handleFinish} onExit={onClose} />
      )}
    </FocusOverlay>
  );
}
