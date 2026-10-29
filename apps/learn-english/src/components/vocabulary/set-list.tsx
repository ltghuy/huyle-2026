"use client";

import Link from "next/link";
import { BriefcaseBusiness, ChevronRight } from "lucide-react";
import { setProgress } from "@/learning/sets";
import type { IndexedSet } from "@/lib/session/content-index";
import { withParams } from "@/lib/search-params";
import { EmptyState } from "@/components/shell/load-states";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface SetListProps {
  sets: readonly IndexedSet[];
  learned: ReadonlySet<string>;
  /** The followed set's id, if any. */
  followed?: string;
  /** The page's query string; each card links to it with `set`. */
  search: string;
}

/** The specialized vocabulary sets, with their size and the learner's progress (AC-002). */
export function SetList({ sets, learned, followed, search }: SetListProps) {
  if (sets.length === 0) {
    return (
      <EmptyState icon={BriefcaseBusiness} title="Chưa có bộ từ chuyên ngành nào">
        <p className="text-sm text-muted-foreground">Các bộ từ đang được biên soạn. Bạn quay lại sau nhé.</p>
      </EmptyState>
    );
  }
  return (
    <section aria-label="Bộ từ chuyên ngành" className="grid gap-3">
      <p className="text-sm text-muted-foreground">Từ vựng cho công việc của bạn. Chọn một bộ để xem từ và học trong Bài học hôm nay.</p>
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sets.map((set) => (
          <li key={set.item.id}>
            <SetCard set={set} learned={learned} followed={set.item.id === followed} search={search} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SetCard({ set, learned, followed, search }: { set: IndexedSet; learned: ReadonlySet<string>; followed: boolean; search: string }) {
  const { body } = set.item;
  const progress = setProgress(set.words, learned);
  const slug = set.item.id.slice("set:".length);
  return (
    <Link
      href={`/vocabulary${withParams(search, { view: null, set: slug, word: null })}`}
      className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-4 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 md:p-5"
    >
      <span className="flex items-start gap-2">
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold">{body.titleVi}</span>
          <span className="block text-sm text-muted-foreground" lang="en">
            {body.titleEn}
          </span>
        </span>
        {followed ? <Badge>Đang học</Badge> : null}
        <ChevronRight className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden />
      </span>
      <span className="line-clamp-2 text-sm">{body.descriptionVi}</span>
      <span className="mt-auto grid gap-2">
        <span className="flex justify-between text-sm text-muted-foreground">
          <span>{progress.total} từ</span>
          <span>
            Đã học <span className="font-semibold text-foreground tabular-nums">{progress.learned}/{progress.total}</span>
          </span>
        </span>
        <Progress
          value={progress.total ? (progress.learned / progress.total) * 100 : 0}
          aria-label={`Đã học ${progress.learned}/${progress.total} từ bộ ${body.titleVi}`}
          className="**:data-[slot=progress-track]:h-2"
        />
      </span>
    </Link>
  );
}
