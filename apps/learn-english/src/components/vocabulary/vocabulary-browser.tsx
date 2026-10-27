"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BookOpen, CheckCircle2 } from "lucide-react";
import type { ContentItemOf } from "@/content/schema";
import { useContentIndex } from "@/hooks/use-content-index";
import { useProfile } from "@/hooks/use-profile";
import { LEVELS, type Level } from "@/learning/types";
import type { ContentIndex } from "@/lib/session/content-index";
import { parseLevel, updateSearchParams, withParams } from "@/lib/search-params";
import { compareTopics, topicOf, topicTitle } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { LevelTabs } from "@/components/library/level-tabs";
import { useCardIds } from "@/components/library/use-card-ids";
import { ContentError, EmptyState, ListSkeleton } from "@/components/shell/load-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WordDialog, type WordLookup } from "./word-dialog";

type Word = ContentItemOf<"word">;

const ALL_TOPICS = "all";
/** Words rendered per chunk; long levels grow with "Xem thêm". */
const CHUNK = 60;

interface TopicGroup {
  slug: string;
  words: Word[];
  learned: number;
}

function groupByTopic(words: readonly Word[], learned: ReadonlySet<string>): TopicGroup[] {
  const groups = new Map<string, TopicGroup>();
  for (const word of words) {
    const slug = topicOf(word);
    const group = groups.get(slug) ?? { slug, words: [], learned: 0 };
    group.words.push(word);
    if (learned.has(word.id)) group.learned += 1;
    groups.set(slug, group);
  }
  return [...groups.values()].sort((a, b) => compareTopics(a.slug, b.slug));
}

function lookupWord(id: string, indexes: readonly (ContentIndex | null)[], stillLoading: boolean): WordLookup {
  for (const index of indexes) {
    const item = index?.byId.get(id);
    if (item?.kind === "word") {
      const examples = item.body.examples.map((exampleId) => index?.byId.get(exampleId)).filter((entry) => entry?.kind === "sentence");
      return { status: "found", word: item, examples: examples as ContentItemOf<"sentence">[] };
    }
  }
  return stillLoading ? { status: "loading" } : { status: "missing" };
}

const EMPTY_SET: ReadonlySet<string> = new Set();

/** `/vocabulary`: words by level and topic, learned markers and the word dialog (AC-006–AC-009). */
export function VocabularyBrowser() {
  const params = useSearchParams();
  const profile = useProfile();
  const levelParam = parseLevel(params.get("level"));
  const level: Level | null = levelParam ?? (profile.status === "ready" ? profile.data.level : profile.status === "error" ? "A1" : null);
  const topic = params.get("topic") ?? ALL_TOPICS;
  const wordId = params.get("word");

  const levels = useMemo(() => (level ? [level] : null), [level]);
  const content = useContentIndex(levels);
  const index = content.status === "ready" ? content.index : null;
  // A word linked from an exercise may sit at another level: load every level only then.
  const needsAllLevels = Boolean(wordId && index && !index.byId.has(wordId));
  const fallback = useContentIndex(needsAllLevels ? LEVELS : null);
  const { ids: cardIds, reload: reloadCards } = useCardIds();
  const learned = cardIds ?? EMPTY_SET;
  const openedInApp = useRef(false);

  const words = useMemo(() => (index && level ? (index.wordsByLevel[level] ?? []) : []), [index, level]);
  const groups = useMemo(() => groupByTopic(words, learned), [words, learned]);

  if (!level || content.status === "loading") return <ListSkeleton rows={6} />;
  if (content.status === "error") return <ContentError onRetry={content.retry} />;

  const search = params.toString();
  const activeGroup = topic === ALL_TOPICS ? null : groups.find((group) => group.slug === topic);
  const shown = topic === ALL_TOPICS ? words : (activeGroup?.words ?? []);
  const learnedCount = groups.reduce((sum, group) => sum + group.learned, 0);

  const lookup: WordLookup = wordId
    ? lookupWord(wordId, [index, fallback.status === "ready" ? fallback.index : null], needsAllLevels && fallback.status === "loading")
    : { status: "loading" };

  function handleLevelChange(next: Level) {
    updateSearchParams({ level: next, topic: null });
  }

  function handleTopicChange(values: unknown[]) {
    const next = typeof values[0] === "string" ? values[0] : ALL_TOPICS;
    updateSearchParams({ topic: next === ALL_TOPICS ? null : next });
  }

  function handleOpenWord() {
    openedInApp.current = true;
  }

  function handleCloseWord() {
    if (openedInApp.current) {
      openedInApp.current = false;
      window.history.back();
    } else {
      updateSearchParams({ word: null });
    }
  }

  return (
    <div className="grid gap-5 px-4 md:px-8">
      <LevelTabs value={level} onChange={handleLevelChange} />

      {words.length === 0 ? (
        <EmptyState icon={BookOpen} title={`Chưa có từ vựng trình độ ${level}`}>
          <p className="text-sm text-muted-foreground">Nội dung đang được biên soạn. Bạn chọn trình độ khác hoặc quay lại sau nhé.</p>
        </EmptyState>
      ) : (
        <>
          <section aria-label="Chủ đề" className="grid gap-2">
            <p className="text-sm text-muted-foreground">
              Bạn đã học <span className="font-medium text-foreground tabular-nums">{learnedCount}/{words.length}</span> từ trình độ {level}.
            </p>
            <div className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:overflow-visible md:px-0">
              <ToggleGroup
                aria-label="Lọc theo chủ đề"
                value={[activeGroup ? activeGroup.slug : ALL_TOPICS]}
                onValueChange={handleTopicChange}
                variant="outline"
                className="flex-nowrap md:flex-wrap"
              >
                <TopicChip value={ALL_TOPICS} title="Tất cả" learned={learnedCount} total={words.length} />
                {groups.map((group) => (
                  <TopicChip key={group.slug} value={group.slug} title={topicTitle(group.slug)} learned={group.learned} total={group.words.length} />
                ))}
              </ToggleGroup>
            </div>
          </section>

          {shown.length === 0 ? (
            <EmptyState icon={BookOpen} title="Chủ đề này chưa có từ ở trình độ đã chọn">
              <Button variant="outline" className="h-11" onClick={() => updateSearchParams({ topic: null })}>
                Xem tất cả chủ đề
              </Button>
            </EmptyState>
          ) : (
            <WordList key={`${level}-${topic}`} words={shown} learned={learned} search={search} onOpen={handleOpenWord} />
          )}
        </>
      )}

      <WordDialog
        open={Boolean(wordId)}
        lookup={lookup}
        learned={Boolean(wordId && learned.has(wordId))}
        onClose={handleCloseWord}
        onLearned={reloadCards}
      />
    </div>
  );
}

function TopicChip({ value, title, learned, total }: { value: string; title: string; learned: number; total: number }) {
  return (
    <ToggleGroupItem value={value} className="h-11 gap-2 px-3 data-pressed:border-primary data-pressed:bg-primary/10" aria-label={`${title}: đã học ${learned}/${total}`}>
      <span>{title}</span>
      <span className="text-xs text-muted-foreground tabular-nums">
        {learned}/{total}
      </span>
    </ToggleGroupItem>
  );
}

function WordList({ words, learned, search, onOpen }: { words: readonly Word[]; learned: ReadonlySet<string>; search: string; onOpen: () => void }) {
  const [limit, setLimit] = useState(CHUNK);
  const visible = words.slice(0, limit);
  return (
    <section aria-label="Danh sách từ" className="grid gap-4">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((word) => (
          <li key={word.id} className="[contain-intrinsic-size:auto_6rem] [content-visibility:auto]">
            <WordCard word={word} learned={learned.has(word.id)} href={`/vocabulary${withParams(search, { word: word.id })}`} onOpen={onOpen} />
          </li>
        ))}
      </ul>
      {words.length > limit ? (
        <Button variant="outline" className="h-11 justify-self-center px-6" onClick={() => setLimit((value) => value + CHUNK)}>
          Xem thêm {Math.min(CHUNK, words.length - limit)} từ
        </Button>
      ) : null}
    </section>
  );
}

function WordCard({ word, learned, href, onOpen }: { word: Word; learned: boolean; href: string; onOpen: () => void }) {
  const { body } = word;
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onOpen}
      className={cn(
        "flex min-h-24 flex-col gap-1 rounded-xl border bg-card p-4 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
        learned && "border-success/40",
      )}
    >
      <span className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-xl font-semibold break-words" lang="en">
          {body.headword}
        </span>
        {learned ? (
          <Badge variant="secondary" className="shrink-0">
            <CheckCircle2 className="text-success" aria-hidden /> Đã học
          </Badge>
        ) : null}
      </span>
      <span className="text-sm text-muted-foreground">
        {body.ipa ? <span className="ipa">{body.ipa}</span> : null}
        {body.ipa ? " · " : null}
        <span lang="en">{body.pos}</span>
      </span>
      <span className="line-clamp-1">{body.meaningsVi[0]}</span>
    </Link>
  );
}
