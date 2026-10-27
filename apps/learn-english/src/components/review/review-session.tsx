"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CircleCheckBig } from "lucide-react";
import { getAllCards } from "@/storage/cards";
import { ExerciseRunner, type RunnerStep, type StepOutcome } from "@/components/exercise/exercise-runner";
import { buttonVariants } from "@/components/ui/button";
import { ContentError, ListSkeleton } from "@/components/shell/load-states";
import { levelsFor, useContentIndex } from "@/hooks/use-content-index";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { prepareSteps } from "@/lib/session/prepare";
import { recordOutcome } from "@/lib/session/record";
import { reviewQueue, reviewSession } from "@/lib/session/review";

async function handleOutcome(_step: RunnerStep, outcome: StepOutcome) {
  await recordOutcome({ outcome, context: "review", now: Date.now() });
}

/** Focus-mode review of today's due items (AC-010–AC-012). */
export function ReviewSession() {
  const router = useRouter();
  const profile = useProfile();
  const ready = profile.status === "ready" ? profile.data : null;
  const content = useContentIndex(ready ? levelsFor(ready.level) : null);
  const [steps, setSteps] = useState<RunnerStep[] | null>(null);
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);

  const index = content.status === "ready" ? content.index : null;
  useEffect(() => {
    if (!ready || !index || steps) return;
    let active = true;
    void getAllCards().then((cards) => {
      if (!active) return;
      const now = Date.now();
      const { due } = reviewQueue(cards, ready, index, now);
      setSteps(prepareSteps(reviewSession(due, index, now), index, "review"));
    });
    return () => {
      active = false;
    };
  }, [ready, index, steps]);

  if (content.status === "error") return <div className="pt-16"><ContentError onRetry={content.retry} /></div>;
  if (!steps) return <div className="pt-16"><ListSkeleton rows={3} /></div>;
  if (score || steps.length === 0) {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <CircleCheckBig className="size-14 text-success" aria-hidden />
        <h1 className="text-2xl font-semibold">{steps.length === 0 ? "Không có gì cần ôn lúc này" : "Xong phiên ôn tập!"}</h1>
        {score ? (
          <p className="text-lg">
            Bạn trả lời đúng {score.correct}/{score.total}. Những mục sai sẽ quay lại sớm hơn.
          </p>
        ) : null}
        <Link href="/review" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}>
          Xong
        </Link>
      </main>
    );
  }

  return <ExerciseRunner steps={steps} onOutcome={handleOutcome} onFinish={setScore} onExit={() => router.push("/review")} />;
}
