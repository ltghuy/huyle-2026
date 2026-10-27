"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { ExerciseRunner, type RunnerStep, type StepOutcome } from "@/components/exercise/exercise-runner";
import { recordOutcome } from "@/lib/session/record";

function handleOutcome(_step: RunnerStep, outcome: StepOutcome) {
  return recordOutcome({ outcome, context: "review", now: Date.now() });
}

/** Full-screen focus mode over the page for a hard-words practice session. */
export function PracticeOverlay({ steps, onClose }: { steps: RunnerStep[]; onClose: () => void }) {
  // The page underneath must not scroll while the session covers it.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function handleFinish({ correct, total }: { correct: number; total: number }) {
    toast.success(`Xong rồi! Bạn trả lời đúng ${correct}/${total} câu.`);
    onClose();
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Luyện từ khó" className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <ExerciseRunner steps={steps} onOutcome={handleOutcome} onFinish={handleFinish} onExit={onClose} />
    </div>
  );
}
