"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Flame, PartyPopper } from "lucide-react";
import type { DailyLesson } from "@/learning/types";
import { ExerciseRunner, type RunnerStep, type StepOutcome } from "@/components/exercise/exercise-runner";
import { buttonVariants } from "@/components/ui/button";
import { BoardAfterLesson } from "@/components/leaderboard/board-after-lesson";
import { ContentError, ListSkeleton } from "@/components/shell/load-states";
import { levelsFor, useContentIndex } from "@/hooks/use-content-index";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { recordOutcome } from "@/lib/session/record";
import { completeLesson, flattenLesson, getOrCreateTodayLesson, saveLessonPosition, type Completion, type FlatLesson } from "@/lib/session/today";

/** Plays today's lesson in focus mode, saving progress after every step (AC-016). */
export function LessonPlayer() {
  const router = useRouter();
  const profile = useProfile();
  const ready = profile.status === "ready" ? profile.data : null;
  const content = useContentIndex(ready ? levelsFor(ready.level) : null);
  const [lesson, setLesson] = useState<DailyLesson | null>(null);
  const [flat, setFlat] = useState<FlatLesson | null>(null);
  const [completion, setCompletion] = useState<Completion | null>(null);

  const index = content.status === "ready" ? content.index : null;
  const version = content.status === "ready" ? content.version : 0;
  useEffect(() => {
    if (!ready || !index) return;
    let active = true;
    void (async () => {
      const today = await getOrCreateTodayLesson({ profile: ready, index, contentVersion: version, now: Date.now() });
      const flattened = flattenLesson(today, index);
      // Nothing left to play (finished in another tab, or already done today): go straight to the result.
      const result = flattened.startAt >= flattened.steps.length ? await completeLesson(today, Date.now()) : null;
      if (!active) return;
      setLesson(today);
      setFlat(flattened);
      setCompletion(result);
    })();
    return () => {
      active = false;
    };
    // The plan is fixed once loaded; later profile or content refreshes must not reshuffle a running lesson.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(ready), Boolean(index)]);

  if (content.status === "error") return <ContentError onRetry={content.retry} />;
  if (completion) return <LessonComplete completion={completion} />;
  if (!lesson || !flat) return <div className="pt-16"><ListSkeleton rows={3} /></div>;

  const current = lesson;
  const positions = flat.positions;

  async function handleOutcome(step: RunnerStep, outcome: StepOutcome) {
    const stepIndex = flat!.steps.indexOf(step);
    const next = positions[stepIndex + 1] ?? { part: current.plan.length, index: 0 };
    await recordOutcome({ outcome, context: "lesson", now: Date.now(), lessonPosition: { date: current.date, position: next } });
  }

  function handleAdvance(nextIndex: number) {
    const next = positions[nextIndex] ?? { part: current.plan.length, index: 0 };
    void saveLessonPosition(current.date, next, Date.now());
  }

  async function handleFinish() {
    setCompletion(await completeLesson(current, Date.now()));
  }

  return (
    <ExerciseRunner
      steps={flat.steps}
      startAt={Math.min(flat.startAt, flat.steps.length - 1)}
      onOutcome={handleOutcome}
      onAdvance={handleAdvance}
      onFinish={handleFinish}
      onExit={() => router.push("/")}
      exitDescription="Phần đã làm được lưu lại. Bạn có thể học tiếp từ chỗ này bất cứ lúc nào trong hôm nay."
    />
  );
}

function LessonComplete({ completion }: { completion: Completion }) {
  const awarded = completion.result === "awarded";
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <PartyPopper className="size-14 text-success" aria-hidden />
      <h1 className="text-2xl font-semibold">Hoàn thành bài hôm nay!</h1>
      {awarded ? (
        <p className="text-lg">
          Bạn được <span className="font-semibold">+{completion.points + completion.bonus} điểm chuyên cần</span>
          {completion.bonus > 0 ? ` (thưởng ${completion.bonus} điểm vì giữ chuỗi ${completion.streak} ngày)` : ""}.
        </p>
      ) : (
        <p className="text-muted-foreground">Điểm hôm nay đã được cộng rồi.</p>
      )}
      <p className="flex items-center gap-2 text-lg">
        <Flame className="size-6 text-streak" aria-hidden /> Chuỗi {completion.streak} ngày
      </p>
      <Link href="/" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}>
        Về trang chính
      </Link>
      {/* Only for the lesson that just earned its points: a reopened finished lesson shows no board. */}
      {awarded ? <BoardAfterLesson /> : null}
    </main>
  );
}
