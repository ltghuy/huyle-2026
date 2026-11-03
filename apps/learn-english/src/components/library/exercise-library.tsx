"use client";

import { SignInPrompt } from "@/components/account/sign-in-prompt";
import { canUseLockedAreas, useAccount } from "@/hooks/use-account";
import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { BookA, PenLine, Puzzle } from "lucide-react";
import { useContentIndex } from "@/hooks/use-content-index";
import { useProfile } from "@/hooks/use-profile";
import type { Level } from "@/learning/types";
import { parseLevel, updateSearchParams } from "@/lib/search-params";
import { compareTopics, topicTitle } from "@/lib/topics";
import { ContentError, EmptyState, ListSkeleton } from "@/components/shell/load-states";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExerciseRun } from "./exercise-run";
import { buildSetSteps, isSetType, levelOfSetId, listSetCards, SENTENCE_TYPES, TYPE_LABELS, WORD_TAB_SENTENCE_TYPES, WORD_TYPES, type ExerciseSet, type SetCard, type SetGroup, type SetType } from "./exercise-sets";
import { LevelTabs } from "./level-tabs";

const ALL = "all";

const GROUPS: { group: SetGroup; title: string; icon: typeof BookA }[] = [
  { group: "word", title: "Từ vựng", icon: BookA },
  { group: "grammar", title: "Ngữ pháp", icon: Puzzle },
  { group: "sentence", title: "Viết câu", icon: PenLine },
];

/**
 * The exercise types each tab offers in its type filter; Ngữ pháp and Viết câu have one type, so no filter.
 * Từ vựng also holds the other sentence types (feature 018), so `?type=dictation` opens there.
 */
const GROUP_TYPES: Record<SetGroup, readonly SetType[]> = { word: [...WORD_TYPES, ...WORD_TAB_SENTENCE_TYPES], grammar: ["grammar-gap"], sentence: ["translate"] };

/** "Viết câu" sets are all "Dịch câu", so their button and run say what the tab is for (feature 018). */
const WRITING_LABEL = "Luyện viết";

function setLabel(set: ExerciseSet): string {
  return set.group === "sentence" ? WRITING_LABEL : TYPE_LABELS[set.type];
}

const isSentenceType = (type: SetType) => SENTENCE_TYPES.some((sentenceType) => sentenceType === type);

function isSetGroup(value: string | null): value is SetGroup {
  return GROUPS.some((entry) => entry.group === value);
}

function groupOfType(type: SetType): SetGroup {
  return GROUPS.find(({ group }) => GROUP_TYPES[group].includes(type))?.group ?? "word";
}

function typeItems(group: SetGroup) {
  return [{ value: ALL, label: "Tất cả dạng bài" }, ...GROUP_TYPES[group].map((type) => ({ value: type, label: TYPE_LABELS[type] }))];
}

function cardSummary(card: SetCard): string {
  if (card.group === "word" && !card.sets.every((set) => isSentenceType(set.type))) return `${card.count} từ`;
  if (card.group === "grammar") return `${card.title} · ${card.count} câu luyện`;
  return `${card.count} câu`;
}

function findSet(cards: readonly SetCard[], id: string | null) {
  for (const card of cards) {
    const set = card.sets.find((entry) => entry.id === id);
    if (set) return { set, title: `${setLabel(set)}: ${card.titleEn ?? card.title}` };
  }
  return null;
}

/**
 * `/exercises`: exercise sets for every level, topic and grammar point, with filters (AC-026, AC-029), in three tabs:
 * Từ vựng, Ngữ pháp and Viết câu (`?tab=`, quick task 036; Viết câu has one Dịch câu set per topic, feature 018).
 */
export function ExerciseLibrary() {
  const params = useSearchParams();
  const profile = useProfile();
  const setId = params.get("id");
  const levelParam = parseLevel(params.get("level")) ?? (setId ? levelOfSetId(setId) : null);
  const level: Level | null = levelParam ?? (profile.status === "ready" ? profile.data.level : profile.status === "error" ? "A1" : null);
  const topic = params.get("topic") ?? ALL;
  const typeParam = params.get("type");
  const typeFilter = isSetType(typeParam) ? typeParam : null;
  const tabParam = params.get("tab");

  const levels = useMemo(() => (level ? [level] : null), [level]);
  const content = useContentIndex(levels);
  const guest = !canUseLockedAreas(useAccount().status);
  const index = content.status === "ready" ? content.index : null;
  const cards = useMemo(() => (index && level ? listSetCards(index, level) : []), [index, level]);
  const startedInApp = useRef(false);

  const active = useMemo(() => findSet(cards, setId), [cards, setId]);
  const activeSet = active?.set;
  const buildSteps = useCallback((round: number) => (activeSet && index ? buildSetSteps(activeSet, index, round) : []), [activeSet, index]);

  // No ?tab: a type or an open set picks its own tab (links like ?type=translate keep working), else Từ vựng.
  const tab: SetGroup = isSetGroup(tabParam) ? tabParam : typeFilter ? groupOfType(typeFilter) : (activeSet?.group ?? "word");
  const type = typeFilter && GROUP_TYPES[tab].includes(typeFilter) ? typeFilter : ALL;

  if (!level || content.status === "loading") return <ListSkeleton rows={6} />;
  if (content.status === "error") return <ContentError onRetry={content.retry} />;

  const tabCards = cards.filter((card) => card.group === tab);
  const hasTopics = tab !== "grammar";
  const topics = hasTopics ? [...new Set(tabCards.map((card) => card.scope))].sort(compareTopics) : [];
  const topicItems = [{ value: ALL, label: "Tất cả chủ đề" }, ...topics.map((slug) => ({ value: slug, label: topicTitle(slug) }))];
  const activeTopic = topics.includes(topic) ? topic : ALL;
  const types = typeItems(tab);
  const shown = tabCards
    .filter((card) => activeTopic === ALL || card.scope === activeTopic)
    .map((card) => ({ ...card, sets: card.sets.filter((set) => type === ALL || set.type === type) }))
    .filter((card) => card.sets.length > 0);
  const setCount = (group: SetGroup) => cards.filter((card) => card.group === group).reduce((sum, card) => sum + card.sets.length, 0);

  function handleTabChange(next: unknown) {
    // Types belong to one tab; the topic is kept, since Từ vựng and Viết câu share topics.
    if (isSetGroup(String(next))) updateSearchParams({ tab: String(next), type: null });
  }

  function handleLevelChange(next: Level) {
    updateSearchParams({ level: next, topic: null });
  }

  function handleTopicChange(value: string | null) {
    updateSearchParams({ topic: !value || value === ALL ? null : value });
  }

  function handleTypeChange(value: string | null) {
    updateSearchParams({ type: !value || value === ALL ? null : value });
  }

  function handleClearFilters() {
    updateSearchParams({ topic: null, type: null });
  }

  function handleStart(id: string) {
    startedInApp.current = true;
    updateSearchParams({ id, level }, "push");
  }

  function handleCloseRun() {
    if (startedInApp.current) {
      startedInApp.current = false;
      window.history.back();
    } else {
      updateSearchParams({ id: null });
    }
  }

  // A guest starting a set (AC-009): the prompt, and signing in comes back to this set (AC-012).
  if (active && guest) return <SignInPrompt area="exercises" />;

  return (
    <Tabs value={tab} onValueChange={handleTabChange} className="gap-5 px-4 md:px-8">
      <TabsList variant="line" aria-label="Nhóm bài tập" className="w-full justify-start gap-1 border-b group-data-horizontal/tabs:h-12 sm:gap-4">
        {GROUPS.map(({ group, title, icon: Icon }) => (
          // Three tabs share a 360 px phone: they split the width there and the icons drop out.
          <TabsTrigger key={group} value={group} className="px-1 text-sm sm:flex-none sm:px-2 sm:text-base">
            <Icon className="max-sm:hidden" aria-hidden /> {title}
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">{setCount(group)}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <div className="grid gap-3 lg:flex lg:flex-wrap lg:items-center">
        <LevelTabs value={level} onChange={handleLevelChange} />
        <div className="grid grid-cols-2 gap-3 sm:flex">
          {hasTopics ? (
            <Select value={activeTopic} onValueChange={handleTopicChange} items={topicItems}>
              <SelectTrigger aria-label="Lọc theo chủ đề" className="w-full data-[size=default]:h-11 sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="p-1">
                {topicItems.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="min-h-10">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
          {types.length > 2 ? (
            <Select value={type} onValueChange={handleTypeChange} items={types}>
              <SelectTrigger aria-label="Lọc theo dạng bài" className="w-full data-[size=default]:h-11 sm:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false} className="p-1">
                {types.map((item) => (
                  <SelectItem key={item.value} value={item.value} className="min-h-10">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      <TabsContent value={tab}>
        {tabCards.length === 0 ? (
          <EmptyState mood="think" title={`Chưa có bài tập ${GROUPS.find((entry) => entry.group === tab)?.title.toLowerCase()} trình độ ${level}`}>
            <p className="text-sm text-muted-foreground">Nội dung đang được biên soạn. Bạn chọn trình độ khác hoặc quay lại sau nhé.</p>
          </EmptyState>
        ) : shown.length === 0 ? (
          <EmptyState mood="think" title="Không có bài tập nào khớp bộ lọc">
            <Button variant="outline" className="h-11" onClick={handleClearFilters}>
              Bỏ lọc
            </Button>
          </EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {shown.map((card) => (
              <li key={card.key} className="[contain-intrinsic-size:auto_9rem] [content-visibility:auto]">
                <SetCardView card={card} onStart={handleStart} />
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      {active && index && !guest ? <ExerciseRun key={active.set.id} shuffled title={active.title} buildSteps={buildSteps} onClose={handleCloseRun} /> : null}
    </Tabs>
  );
}

function SetCardView({ card, onStart }: { card: SetCard; onStart: (id: string) => void }) {
  const heading = card.titleEn ?? card.title;
  return (
    <article className="grid h-full content-start gap-3 rounded-xl border bg-card p-4">
      <div className="grid gap-0.5">
        <h3 className="font-semibold break-words" lang={card.titleEn ? "en" : undefined}>
          {heading}
        </h3>
        <p className="text-sm text-muted-foreground">{cardSummary(card)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {card.sets.map((set) => (
          <Button key={set.id} variant="outline" className="h-11 px-3" onClick={() => onStart(set.id)} aria-label={`Bắt đầu ${setLabel(set)}: ${heading}`}>
            {setLabel(set)}
          </Button>
        ))}
      </div>
    </article>
  );
}
