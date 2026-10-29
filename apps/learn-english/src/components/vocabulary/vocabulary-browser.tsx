"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { BookOpen, Check, ChevronDown } from "lucide-react";
import type { ContentItemOf } from "@/content/schema";
import { useContentIndex } from "@/hooks/use-content-index";
import { useProfile } from "@/hooks/use-profile";
import { LEVELS, type Level } from "@/learning/types";
import { formsIdOf } from "@/learning/verbs";
import type { ContentIndex } from "@/lib/session/content-index";
import { parseLevel, updateSearchParams } from "@/lib/search-params";
import { compareTopics, topicOf, topicTitle } from "@/lib/topics";
import { cn } from "@/lib/utils";
import { LevelTabs } from "@/components/library/level-tabs";
import { LEVEL_LABELS } from "@/components/settings/level-setting";
import { useCardIds } from "@/components/library/use-card-ids";
import { ContentError, EmptyState, ListSkeleton } from "@/components/shell/load-states";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { WordDialog, type WordLookup } from "./word-dialog";
import { SetList } from "./set-list";
import { SetView } from "./set-view";
import { WordList } from "./word-list";
import { WordSearchBox } from "./word-search-box";

type Word = ContentItemOf<"word">;

const ALL_TOPICS = "all";
/** The "Chuyên ngành" tab's value, next to the levels (feature 012). */
const SETS_TAB = "sets";
const SETS_TAB_INFO = { value: SETS_TAB, label: "Chuyên ngành" } as const;
/** Topics shown before "Xem thêm"; the selected one is always shown. */
const TOPICS_SHOWN = 8;

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

/** The first set's name for a specialized word (AC-004); undefined for course words. */
function specializedSetTitle(index: ContentIndex, word: Word): string | undefined {
  if (word.body.source !== "specialized") return undefined;
  const first = index.byId.get(index.setsByWord.get(word.id)?.[0] ?? "");
  return first?.kind === "set" ? first.body.titleVi : undefined;
}

function lookupWord(id: string, indexes: readonly (ContentIndex | null)[], stillLoading: boolean): WordLookup {
  for (const index of indexes) {
    const item = index?.byId.get(id);
    if (item?.kind === "word") {
      const examples = item.body.examples.map((exampleId) => index?.byId.get(exampleId)).filter((entry) => entry?.kind === "sentence");
      const forms = index?.byId.get(formsIdOf(item.id));
      return {
        status: "found",
        word: item,
        examples: examples as ContentItemOf<"sentence">[],
        forms: forms?.kind === "forms" ? forms : undefined,
        setTitle: index ? specializedSetTitle(index, item) : undefined,
      };
    }
  }
  return stillLoading ? { status: "loading" } : { status: "missing" };
}

const EMPTY_SET: ReadonlySet<string> = new Set();

/**
 * `/vocabulary`: search, words by level and topic, learned markers and the
 * word dialog (AC-006–AC-009; 002). `?view=sets` lists the specialized
 * vocabulary sets and `?set=<slug>` opens one (feature 012).
 */
export function VocabularyBrowser() {
  const params = useSearchParams();
  const profile = useProfile();
  const setSlug = params.get("set");
  const showSets = params.get("view") === SETS_TAB || setSlug !== null;
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
  const [allTopics, setAllTopics] = useState(false);
  const topicRow = useRef<HTMLDivElement>(null);

  const words = useMemo(() => (index && level ? (index.wordsByLevel[level] ?? []) : []), [index, level]);
  const groups = useMemo(() => groupByTopic(words, learned), [words, learned]);

  const ready = content.status === "ready";
  useEffect(() => {
    // On phones the topics scroll sideways: bring the selected one into view.
    const row = topicRow.current;
    const chip = row?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (row && chip && row.scrollWidth > row.clientWidth) row.scrollLeft = chip.offsetLeft - row.offsetLeft - 16;
  }, [topic, level, ready]);

  if (!level || content.status === "loading") return <ListSkeleton rows={6} />;
  if (content.status === "error") return <ContentError onRetry={content.retry} />;

  const search = params.toString();
  const followedSet = profile.status === "ready" ? profile.data.vocabSet : undefined;
  const activeGroup = topic === ALL_TOPICS ? null : groups.find((group) => group.slug === topic);
  const shown = topic === ALL_TOPICS ? words : (activeGroup?.words ?? []);
  const learnedCount = groups.reduce((sum, group) => sum + group.learned, 0);
  // Collapsing only applies from md up; phones scroll one row of every topic.
  const collapsed = (group: TopicGroup, i: number) => !allTopics && i >= TOPICS_SHOWN && group.slug !== activeGroup?.slug;
  const hiddenTopics = groups.filter(collapsed).length;

  const lookup: WordLookup = wordId
    ? lookupWord(wordId, [index, fallback.status === "ready" ? fallback.index : null], needsAllLevels && fallback.status === "loading")
    : { status: "loading" };

  function handleTabChange(next: Level | typeof SETS_TAB) {
    if (next === SETS_TAB) updateSearchParams({ view: SETS_TAB, set: null, topic: null });
    else updateSearchParams({ level: next, topic: null, view: null, set: null });
    setAllTopics(false);
  }

  function handleTopicChange(values: unknown[]) {
    const next = typeof values[0] === "string" ? values[0] : ALL_TOPICS;
    updateSearchParams({ topic: next === ALL_TOPICS ? null : next });
  }

  function handleOpenWord() {
    openedInApp.current = true;
  }

  function handleSearchSelect(id: string) {
    openedInApp.current = true;
    updateSearchParams({ word: id }, "push");
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
      <div className="grid gap-3 md:flex md:items-center md:justify-between">
        <div className="md:w-full md:max-w-md">
          <WordSearchBox onSelect={handleSearchSelect} />
        </div>
        <LevelTabs value={showSets ? SETS_TAB : level} onChange={handleTabChange} extra={SETS_TAB_INFO} />
      </div>

      {showSets ? (
        setSlug !== null ? (
          <SetView
            set={content.index.sets.find((set) => set.item.id === `set:${setSlug}`)}
            index={content.index}
            learned={learned}
            followed={followedSet === `set:${setSlug}`}
            search={search}
            onOpenWord={handleOpenWord}
          />
        ) : (
          <SetList sets={content.index.sets} learned={learned} followed={followedSet} search={search} />
        )
      ) : words.length === 0 ? (
        <EmptyState icon={BookOpen} title={`Chưa có từ vựng trình độ ${level}`}>
          <p className="text-sm text-muted-foreground">Nội dung đang được biên soạn. Bạn chọn trình độ khác hoặc quay lại sau nhé.</p>
        </EmptyState>
      ) : (
        <>
          <section aria-label="Chủ đề" className="grid gap-4 rounded-2xl border bg-card p-4 md:p-5">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-semibold">{LEVEL_LABELS[level]}</h2>
                <p className="text-sm text-muted-foreground">
                  Bạn đã học <span className="font-semibold text-foreground tabular-nums">{learnedCount}/{words.length}</span> từ
                </p>
              </div>
              <Progress value={words.length ? (learnedCount / words.length) * 100 : 0} aria-label={`Đã học ${learnedCount}/${words.length} từ trình độ ${level}`} className="**:data-[slot=progress-track]:h-2" />
            </div>
            <div ref={topicRow} className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
              <ToggleGroup
                aria-label="Lọc theo chủ đề"
                value={[activeGroup ? activeGroup.slug : ALL_TOPICS]}
                onValueChange={handleTopicChange}
                className="contents"
              >
                <TopicChip value={ALL_TOPICS} title="Tất cả" learned={learnedCount} total={words.length} />
                {groups.map((group, i) => (
                  <TopicChip
                    key={group.slug}
                    value={group.slug}
                    title={topicTitle(group.slug)}
                    learned={group.learned}
                    total={group.words.length}
                    className={collapsed(group, i) ? "md:hidden" : undefined}
                  />
                ))}
              </ToggleGroup>
              {groups.length > TOPICS_SHOWN ? (
                <Button variant="ghost" className="hidden h-11 rounded-full px-4 text-primary md:inline-flex" onClick={() => setAllTopics((value) => !value)} aria-expanded={allTopics}>
                  {allTopics ? "Thu gọn" : `Xem thêm ${hiddenTopics} chủ đề`}
                  <ChevronDown className={cn("transition-transform", allTopics && "rotate-180")} aria-hidden />
                </Button>
              ) : null}
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

/**
 * A topic filter pill. Its background fills from the left as the topic is
 * learned, and a finished topic shows a check, so progress isn't colour only.
 */
function TopicChip({ value, title, learned, total, className }: { value: string; title: string; learned: number; total: number; className?: string }) {
  const done = total > 0 && learned === total;
  const percent = total ? Math.round((learned / total) * 100) : 0;
  return (
    <ToggleGroupItem
      value={value}
      aria-label={`${title}: đã học ${learned}/${total}`}
      style={{ "--learned": `${percent}%` } as CSSProperties}
      className={cn(
        "h-11 gap-2 rounded-full border border-transparent px-4 font-normal",
        "bg-[linear-gradient(to_right,color-mix(in_oklch,var(--primary)_16%,transparent)_var(--learned),color-mix(in_oklch,var(--muted)_70%,transparent)_var(--learned))]",
        "hover:border-border",
        "aria-pressed:bg-primary aria-pressed:bg-none aria-pressed:text-primary-foreground aria-pressed:hover:bg-primary/90 aria-pressed:hover:text-primary-foreground",
        className,
      )}
    >
      {done ? <Check className="size-4" aria-hidden /> : null}
      <span>{title}</span>
      <span className="rounded-full bg-background/60 px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground in-aria-pressed:bg-primary-foreground/20 in-aria-pressed:text-primary-foreground">
        {learned}/{total}
      </span>
    </ToggleGroupItem>
  );
}
