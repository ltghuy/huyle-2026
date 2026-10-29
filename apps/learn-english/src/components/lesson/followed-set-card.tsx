"use client";

import Link from "next/link";
import { BriefcaseBusiness, PartyPopper } from "lucide-react";
import { isSetFinished, setProgress } from "@/learning/sets";
import type { ContentIndex } from "@/lib/session/content-index";
import { cn } from "@/lib/utils";
import { useCardIds } from "@/components/library/use-card-ids";
import { useFollowSet } from "@/components/vocabulary/use-follow-set";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

/**
 * The followed vocabulary set on the home page (feature 012, AC-011, AC-013):
 * its learned/total words, or a finished message with the next choices.
 * Nothing when no set is followed or the set is gone.
 */
export function FollowedSetCard({ vocabSet, index }: { vocabSet: string | undefined; index: ContentIndex }) {
  const { ids } = useCardIds();
  const { unfollow, pending } = useFollowSet();
  const set = vocabSet ? index.sets.find((entry) => entry.item.id === vocabSet) : undefined;
  if (!set || !ids) return null;

  const { titleVi } = set.item.body;
  const progress = setProgress(set.words, ids);
  const slug = set.item.id.slice("set:".length);

  function handleUnfollow() {
    void unfollow(titleVi);
  }

  if (isSetFinished(set.words, ids)) {
    return (
      <section className="rounded-xl border bg-card p-5" aria-labelledby="followed-set-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="followed-set-title" className="text-lg font-semibold">
              Bạn đã học xong bộ “{titleVi}”
            </h2>
            <p className="text-sm text-muted-foreground">Từ mới trong Bài học hôm nay đã quay lại theo trình độ của bạn.</p>
          </div>
          <PartyPopper className="size-7 shrink-0 text-success" aria-hidden />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Link href="/vocabulary?view=sets" className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
            Chọn bộ khác
          </Link>
          <Button variant="outline" className="h-11" onClick={handleUnfollow} disabled={pending}>
            Ngừng học bộ này
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border bg-card p-5" aria-labelledby="followed-set-title">
      <div className="flex items-start gap-3">
        <BriefcaseBusiness className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Bộ chuyên ngành đang học</p>
          <h2 id="followed-set-title" className="font-semibold">
            {titleVi}
          </h2>
        </div>
        <Link href={`/vocabulary?set=${slug}`} className={cn(buttonVariants({ variant: "ghost" }), "h-11 shrink-0 text-primary")}>
          Xem bộ từ
        </Link>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Đã học <span className="font-semibold text-foreground tabular-nums">{progress.learned}/{progress.total}</span> từ
      </p>
      <Progress
        value={progress.total ? (progress.learned / progress.total) * 100 : 0}
        aria-label={`Đã học ${progress.learned}/${progress.total} từ bộ ${titleVi}`}
        className="mt-2 **:data-[slot=progress-track]:h-2"
      />
    </section>
  );
}
