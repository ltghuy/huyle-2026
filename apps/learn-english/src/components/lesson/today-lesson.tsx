"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpenCheck, CheckCircle2, Circle, PartyPopper } from "lucide-react";
import { estimateMinutes } from "@/learning/lesson-plan";
import type { DailyLesson } from "@/learning/types";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ContentError, EmptyState, ListSkeleton } from "@/components/shell/load-states";
import { levelsFor, useContentIndex } from "@/hooks/use-content-index";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { flattenLesson, getOrCreateTodayLesson, PART_LABELS } from "@/lib/session/today";
import { StreakSummary } from "./streak-summary";

/** Home page body: today's lesson with its parts, progress and a start button (AC-014). */
export function TodayLesson() {
  const router = useRouter();
  const profile = useProfile();
  const ready = profile.status === "ready" ? profile.data : null;
  const content = useContentIndex(ready && ready.placement !== "pending" ? levelsFor(ready.level) : null);
  const [lesson, setLesson] = useState<DailyLesson | null>(null);

  const pendingPlacement = ready?.placement === "pending";
  useEffect(() => {
    if (pendingPlacement) router.replace("/placement");
  }, [pendingPlacement, router]);

  const index = content.status === "ready" ? content.index : null;
  const version = content.status === "ready" ? content.version : 0;
  useEffect(() => {
    if (!ready || !index) return;
    let active = true;
    void getOrCreateTodayLesson({ profile: ready, index, contentVersion: version, now: Date.now() }).then(
      (today) => active && setLesson(today),
    );
    return () => {
      active = false;
    };
  }, [ready, index, version]);

  if (pendingPlacement) return null;
  if (content.status === "error") return <ContentError onRetry={content.retry} />;
  if (!ready || !index || !lesson) return <ListSkeleton rows={3} />;

  const { steps, positions, startAt } = flattenLesson(lesson, index);
  if (steps.length === 0) {
    return (
      <EmptyState icon={BookOpenCheck} title="Chưa có bài học cho trình độ này">
        <p className="text-sm text-muted-foreground">Nội dung đang được biên soạn. Bạn quay lại sau nhé.</p>
      </EmptyState>
    );
  }

  const done = Boolean(lesson.completedAt);
  const progress = done ? 100 : Math.round((startAt / steps.length) * 100);
  const partCounts = lesson.plan.map((part, partIndex) => ({
    kind: part.kind,
    total: positions.filter((position) => position.part === partIndex).length,
    finished: done || lesson.position.part > partIndex,
  }));

  return (
    <div className="grid gap-4 px-4 md:px-8">
      <StreakSummary timeZone={ready.timeZone} />
      <section className="rounded-xl border bg-card p-5" data-tour="lesson-card" aria-labelledby="today-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="today-title" className="text-lg font-semibold">
              {done ? "Bạn đã học xong hôm nay" : startAt > 0 ? "Học tiếp bài hôm nay" : "Bài hôm nay đã sẵn sàng"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {done ? "Hẹn gặp lại bạn ngày mai." : `${steps.length} bước · khoảng ${estimateMinutes(lesson.plan.flatMap((part) => part.exercises))} phút`}
            </p>
          </div>
          {done ? <PartyPopper className="size-7 text-success" aria-hidden /> : null}
        </div>
        <Progress value={progress} className="mt-4" aria-label={`Đã làm ${progress}%`} />
        <ol className="mt-4 grid gap-2">
          {partCounts
            .filter((part) => part.total > 0)
            .map((part) => (
              <li key={part.kind} className="flex items-center gap-3">
                {part.finished ? <CheckCircle2 className="size-5 text-success" aria-label="Đã xong" /> : <Circle className="size-5 text-muted-foreground" aria-label="Chưa xong" />}
                <span className="flex-1">{PART_LABELS[part.kind]}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{part.total}</span>
              </li>
            ))}
        </ol>
        {done ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Link href="/review" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12")}>
              Ôn tập thêm
            </Link>
            <Link href="/exercises" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12")}>
              Làm bài tập
            </Link>
          </div>
        ) : (
          <Link href="/lesson" className={cn(buttonVariants({ size: "lg" }), "mt-5 h-12 w-full text-base")}>
            {startAt > 0 ? "Học tiếp" : "Bắt đầu"}
          </Link>
        )}
      </section>
    </div>
  );
}
