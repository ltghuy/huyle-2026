"use client";

import Link from "next/link";
import { useCallback } from "react";
import { CalendarCheck, RotateCcw } from "lucide-react";
import { getAllCards } from "@/storage/cards";
import { buttonVariants } from "@/components/ui/button";
import { ContentError, EmptyState, ListSkeleton } from "@/components/shell/load-states";
import { levelsFor, useContentIndex } from "@/hooks/use-content-index";
import { useProfile } from "@/hooks/use-profile";
import { useStorageQuery } from "@/hooks/use-storage-query";
import { cn } from "@/lib/utils";
import { reviewQueue } from "@/lib/session/review";
import { REVIEW_CAP } from "@/learning/lesson-plan";

const STORES = ["cards"] as const;
const DATE_FORMAT = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "numeric" });

/** How many items are due today, with a button into the review session. */
export function ReviewOverview() {
  const profile = useProfile();
  const ready = profile.status === "ready" ? profile.data : null;
  const content = useContentIndex(ready ? levelsFor(ready.level) : null);
  const index = content.status === "ready" ? content.index : null;
  const query = useCallback(async () => {
    if (!ready || !index) return null;
    return reviewQueue(await getAllCards(), ready, index, Date.now());
  }, [ready, index]);
  const queue = useStorageQuery(query, STORES);

  if (content.status === "error") return <ContentError onRetry={content.retry} />;
  if (queue.status !== "ready" || !queue.data) return <ListSkeleton rows={2} />;

  const { due, nextDue } = queue.data;
  if (due.length === 0) {
    return (
      <EmptyState icon={CalendarCheck} title="Hôm nay bạn không có gì cần ôn">
        <p className="text-sm text-muted-foreground">
          {nextDue ? `Lần ôn tiếp theo: ${DATE_FORMAT.format(nextDue)}.` : "Học từ mới trong bài hôm nay để bắt đầu lịch ôn tập."}
        </p>
      </EmptyState>
    );
  }

  const session = Math.min(due.length, REVIEW_CAP);
  return (
    <section className="mx-4 rounded-xl border bg-card p-5 md:mx-8" aria-labelledby="review-title">
      <div className="flex items-center gap-4">
        <RotateCcw className="size-8 text-primary" aria-hidden />
        <div>
          <h2 id="review-title" className="text-lg font-semibold">
            {due.length} mục cần ôn hôm nay
          </h2>
          <p className="text-sm text-muted-foreground">
            {due.length > REVIEW_CAP
              ? `Phiên này ôn ${REVIEW_CAP} mục bạn dễ quên nhất, phần còn lại để dành cho những ngày sau.`
              : "Những mục bạn sắp quên được ưu tiên trước."}
          </p>
        </div>
      </div>
      <Link href="/phien-on-tap" className={cn(buttonVariants({ size: "lg" }), "mt-5 h-12 w-full text-base")}>
        Ôn tập {session} mục
      </Link>
    </section>
  );
}
