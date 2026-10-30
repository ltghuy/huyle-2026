"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpenCheck, PartyPopper } from "lucide-react";
import type { ExtraLesson } from "@/learning/types";
import { ExerciseRunner, type RunnerStep, type StepOutcome } from "@/components/exercise/exercise-runner";
import { buttonVariants } from "@/components/ui/button";
import { ContentError, EmptyState, ListSkeleton } from "@/components/shell/load-states";
import { levelsFor, useContentIndex } from "@/hooks/use-content-index";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { completeExtraLesson, getOpenExtraLesson, saveExtraPosition } from "@/lib/session/extra";
import { recordOutcome } from "@/lib/session/record";
import { flattenLesson, type FlatLesson } from "@/lib/session/today";

type Stage = { kind: "loading" } | { kind: "none" } | { kind: "playing"; lesson: ExtraLesson; flat: FlatLesson } | { kind: "done" };

/**
 * Plays today's extra lesson (feature 013) like the daily one, saving progress
 * after every step so it can be resumed today (AC-009). Finishing it awards no
 * points, leaves the streak alone and shows no leaderboard (AC-008, AC-014).
 */
export function ExtraLessonPlayer() {
  const router = useRouter();
  const profile = useProfile();
  const ready = profile.status === "ready" ? profile.data : null;
  const content = useContentIndex(ready ? levelsFor(ready.level) : null);
  const [stage, setStage] = useState<Stage>({ kind: "loading" });

  const index = content.status === "ready" ? content.index : null;
  useEffect(() => {
    if (!ready || !index) return;
    let active = true;
    void (async () => {
      const lesson = await getOpenExtraLesson(ready.timeZone, Date.now());
      if (!active) return;
      if (!lesson) return setStage({ kind: "none" });
      const flat = flattenLesson(lesson, index);
      if (flat.startAt >= flat.steps.length) {
        await completeExtraLesson(lesson.id, Date.now());
        if (active) setStage({ kind: "done" });
        return;
      }
      setStage({ kind: "playing", lesson, flat });
    })();
    return () => {
      active = false;
    };
    // The plan is fixed once loaded; later profile or content refreshes must not reshuffle a running lesson.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(ready), Boolean(index)]);

  if (content.status === "error") return <ContentError onRetry={content.retry} />;
  if (stage.kind === "done") return <ExtraLessonComplete />;
  if (stage.kind === "none") {
    return (
      <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center gap-6 px-6">
        <EmptyState icon={BookOpenCheck} title="Không có bài học thêm nào đang mở">
          <p className="text-sm text-muted-foreground">Bạn mua bài học thêm ở trang chính sau khi học xong bài hôm nay nhé.</p>
        </EmptyState>
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}>
          Về trang chính
        </Link>
      </main>
    );
  }
  if (stage.kind === "loading") return <div className="pt-16"><ListSkeleton rows={3} /></div>;

  const { lesson, flat } = stage;
  const end = { part: lesson.plan.length, index: 0 };

  async function handleOutcome(step: RunnerStep, outcome: StepOutcome) {
    const next = flat.positions[flat.steps.indexOf(step) + 1] ?? end;
    await recordOutcome({ outcome, context: "lesson", now: Date.now(), lessonPosition: { extraId: lesson.id, position: next } });
  }

  function handleAdvance(nextIndex: number) {
    void saveExtraPosition(lesson.id, flat.positions[nextIndex] ?? end, Date.now());
  }

  async function handleFinish() {
    await completeExtraLesson(lesson.id, Date.now());
    setStage({ kind: "done" });
  }

  return (
    <ExerciseRunner
      steps={flat.steps}
      startAt={Math.min(flat.startAt, flat.steps.length - 1)}
      onOutcome={handleOutcome}
      onAdvance={handleAdvance}
      onFinish={handleFinish}
      onExit={() => router.push("/")}
      exitDescription="Phần đã làm được lưu lại. Bạn có thể học tiếp bài này bất cứ lúc nào trong hôm nay mà không mất thêm điểm."
    />
  );
}

function ExtraLessonComplete() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <PartyPopper className="size-14 text-success" aria-hidden />
      <h1 className="text-2xl font-semibold">Hoàn thành bài học thêm!</h1>
      <p className="text-muted-foreground">Từ mới của bài này sẽ quay lại trong phần ôn tập những ngày tới.</p>
      <Link href="/" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}>
        Về trang chính
      </Link>
    </main>
  );
}
