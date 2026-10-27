"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ChevronRight, Clock } from "lucide-react";
import type { ContentItemOf } from "@/content/schema";
import { useContentIndex } from "@/hooks/use-content-index";
import { LEVELS, type Level } from "@/learning/types";
import type { ContentIndex } from "@/lib/session/content-index";
import { GRAMMAR_TOPICS, grammarSlug, grammarTopicMeta } from "@/lib/topics";
import { useCardIds } from "@/components/library/use-card-ids";
import { ContentError, ListSkeleton } from "@/components/shell/load-states";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GrammarTopic } from "./grammar-topic";

type Grammar = ContentItemOf<"grammar">;

interface TopicRow {
  slug: string;
  titleEn: string;
  titleVi: string;
  /** Published content; topics still being written show as "Sắp có". */
  item?: Grammar;
}

const EMPTY_SET: ReadonlySet<string> = new Set();

/** The syllabus from `content/grammar-topics.json`, plus any published topic it doesn't list yet. */
function rowsByLevel(index: ContentIndex): Record<Level, TopicRow[]> {
  const rows = Object.fromEntries(LEVELS.map((level) => [level, [] as TopicRow[]])) as Record<Level, TopicRow[]>;
  const listed = new Set<string>();
  for (const topic of GRAMMAR_TOPICS) {
    const item = index.byId.get(`grammar:${topic.slug}`);
    listed.add(topic.slug);
    rows[topic.level].push({ slug: topic.slug, titleEn: topic.titleEn, titleVi: topic.titleVi, item: item?.kind === "grammar" ? item : undefined });
  }
  for (const level of LEVELS) {
    for (const item of index.grammarByLevel[level] ?? []) {
      const slug = grammarSlug(item.id);
      if (!listed.has(slug)) rows[level].push({ slug, titleEn: item.body.titleEn, titleVi: item.body.titleVi, item });
    }
  }
  return rows;
}

/** `/grammar`: topics by level with progress, or one topic via `?topic=<slug>` (AC-023–AC-025). */
export function GrammarBrowser() {
  const params = useSearchParams();
  const slug = params.get("topic");
  // Grammar loads for every level; the level only decides which example sentences come along.
  const level = (slug && grammarTopicMeta(slug)?.level) || "A1";
  const levels = useMemo(() => [level], [level]);
  const content = useContentIndex(levels);
  const { ids, reload } = useCardIds();
  const done = ids ?? EMPTY_SET;
  const index = content.status === "ready" ? content.index : null;
  const rows = useMemo(() => (index ? rowsByLevel(index) : null), [index]);

  if (content.status === "loading") return <ListSkeleton rows={6} />;
  if (content.status === "error" || !index || !rows) return <ContentError onRetry={content.retry} />;

  if (slug) {
    const item = index.byId.get(`grammar:${slug}`);
    return <GrammarTopic grammar={item?.kind === "grammar" ? item : null} index={index} done={done.has(`grammar:${slug}`)} onCardsChanged={reload} />;
  }

  return (
    <div className="grid gap-8 px-4 md:px-8">
      {LEVELS.map((rowLevel) => (
        <LevelSection key={rowLevel} level={rowLevel} rows={rows[rowLevel]} done={done} />
      ))}
    </div>
  );
}

function LevelSection({ level, rows, done }: { level: Level; rows: TopicRow[]; done: ReadonlySet<string> }) {
  if (rows.length === 0) return null;
  const published = rows.filter((row) => row.item).length;
  const learned = rows.filter((row) => row.item && done.has(row.item.id)).length;
  const headingId = `grammar-${level}`;
  return (
    <section aria-labelledby={headingId} className="grid gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id={headingId} className="text-lg font-semibold">
          Trình độ {level}
        </h2>
        <p className="text-sm text-muted-foreground tabular-nums">
          Đã học {learned}/{rows.length} chủ điểm
        </p>
        <Progress value={rows.length ? (learned / rows.length) * 100 : 0} className="w-full sm:ml-auto sm:w-40" aria-label={`Tiến độ ngữ pháp ${level}`} />
      </div>
      {published === 0 ? <p className="text-sm text-muted-foreground">Các bài ở trình độ này đang được biên soạn.</p> : null}
      <ul className="grid gap-2 md:grid-cols-2">
        {rows.map((row) => (
          <li key={row.slug}>
            <TopicRowView row={row} learned={Boolean(row.item && done.has(row.item.id))} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopicRowView({ row, learned }: { row: TopicRow; learned: boolean }) {
  const titles = (
    <span className="grid min-w-0 flex-1 gap-0.5">
      <span className="font-medium break-words" lang="en">
        {row.titleEn}
      </span>
      <span className="text-sm text-muted-foreground">{row.titleVi}</span>
    </span>
  );

  if (!row.item) {
    return (
      <div className="flex min-h-16 items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-muted-foreground">
        {titles}
        <Badge variant="outline" className="shrink-0">
          <Clock aria-hidden /> Sắp có
        </Badge>
      </div>
    );
  }

  return (
    <Link
      href={`/grammar?topic=${row.slug}`}
      className="flex min-h-16 items-center gap-3 rounded-xl border bg-card px-4 py-3 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {titles}
      {learned ? (
        <Badge variant="secondary" className="shrink-0">
          <CheckCircle2 className="text-success" aria-hidden /> Đã học
        </Badge>
      ) : null}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
