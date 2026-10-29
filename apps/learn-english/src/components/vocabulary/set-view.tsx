"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, SearchX } from "lucide-react";
import type { ContentItemOf } from "@/content/schema";
import { isSetFinished, setLabel, setProgress } from "@/learning/sets";
import type { ContentIndex, IndexedSet } from "@/lib/session/content-index";
import { withParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shell/load-states";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useFollowSet } from "./use-follow-set";
import { WordList } from "./word-list";

type Word = ContentItemOf<"word">;

interface SetViewProps {
  /** Undefined when the slug in the URL names no set. */
  set: IndexedSet | undefined;
  index: ContentIndex;
  learned: ReadonlySet<string>;
  followed: boolean;
  search: string;
  onOpenWord: () => void;
}

/** One vocabulary set: progress, follow / stop following, and its words (AC-003, AC-007, AC-010, AC-014). */
export function SetView({ set, index, learned, followed, search, onOpenWord }: SetViewProps) {
  const { follow, unfollow, pending } = useFollowSet();
  const backHref = `/vocabulary${withParams(search, { set: null, word: null, view: "sets" })}`;

  if (!set) {
    return (
      <EmptyState icon={SearchX} title="Không tìm thấy bộ từ này">
        <Link href={backHref} className={cn(buttonVariants({ variant: "outline" }), "h-11")}>
          Xem các bộ chuyên ngành
        </Link>
      </EmptyState>
    );
  }

  const { id: setId, body } = set.item;
  const progress = setProgress(set.words, learned);
  const finished = isSetFinished(set.words, learned);

  function labelOf(word: Word) {
    const sets = (index.setsByWord.get(word.id) ?? []).flatMap((id) => {
      const item = index.byId.get(id);
      return item?.kind === "set" ? [item] : [];
    });
    return setLabel(word, sets);
  }

  function handleFollow() {
    void follow(setId, body.titleVi);
  }

  function handleUnfollow() {
    void unfollow(body.titleVi);
  }

  return (
    <>
      <section aria-labelledby="set-title" className="grid gap-4 rounded-2xl border bg-card p-4 md:p-5">
        <Link href={backHref} className="inline-flex min-h-11 items-center gap-1 justify-self-start text-sm text-primary hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Tất cả bộ chuyên ngành
        </Link>
        <div className="grid gap-3 md:flex md:items-start md:justify-between">
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="set-title" className="text-xl font-semibold">
                {body.titleVi}
              </h2>
              {followed ? <Badge>Đang học</Badge> : null}
            </div>
            <p className="text-sm text-muted-foreground" lang="en">
              {body.titleEn}
            </p>
            <p className="max-w-prose">{body.descriptionVi}</p>
          </div>
          {followed ? (
            <Button variant="outline" className="h-11 px-5" onClick={handleUnfollow} disabled={pending}>
              Ngừng học bộ này
            </Button>
          ) : (
            <Button className="h-11 px-5" onClick={handleFollow} disabled={pending}>
              Học bộ này
            </Button>
          )}
        </div>
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">
            Bạn đã học <span className="font-semibold text-foreground tabular-nums">{progress.learned}/{progress.total}</span> từ
          </p>
          <Progress
            value={progress.total ? (progress.learned / progress.total) * 100 : 0}
            aria-label={`Đã học ${progress.learned}/${progress.total} từ bộ ${body.titleVi}`}
            className="**:data-[slot=progress-track]:h-2"
          />
          {finished ? (
            <p className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 text-success" aria-hidden /> Bạn đã học xong bộ này. Từ mới sẽ lại theo trình độ của bạn.
            </p>
          ) : followed ? (
            <p className="text-sm text-muted-foreground">Bài học hôm nay lấy từ mới trong bộ này, theo thứ tự bên dưới.</p>
          ) : null}
        </div>
      </section>
      <WordList key={set.item.id} words={set.words} learned={learned} search={search} onOpen={onOpenWord} labelOf={labelOf} />
    </>
  );
}
