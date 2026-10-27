"use client";

import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { BookA, FilterX, ListChecks, MessageSquareText, Puzzle } from "lucide-react";
import { useContentIndex } from "@/hooks/use-content-index";
import { useProfile } from "@/hooks/use-profile";
import type { Level } from "@/learning/types";
import { parseLevel, updateSearchParams } from "@/lib/search-params";
import { compareTopics, topicTitle } from "@/lib/topics";
import { ContentError, EmptyState, ListSkeleton } from "@/components/shell/load-states";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExerciseRun } from "./exercise-run";
import { buildSetSteps, isSetType, levelOfSetId, listSetCards, SET_TYPES, TYPE_LABELS, type SetCard, type SetGroup } from "./exercise-sets";
import { LevelTabs } from "./level-tabs";

const ALL = "all";

const GROUPS: { group: SetGroup; title: string; icon: typeof BookA }[] = [
  { group: "word", title: "Từ vựng", icon: BookA },
  { group: "grammar", title: "Ngữ pháp", icon: Puzzle },
  { group: "sentence", title: "Mẫu câu", icon: MessageSquareText },
];

const TYPE_ITEMS = [{ value: ALL, label: "Tất cả dạng bài" }, ...SET_TYPES.map((type) => ({ value: type, label: TYPE_LABELS[type] }))];

function cardSummary(card: SetCard): string {
  if (card.group === "word") return `${card.count} từ`;
  if (card.group === "grammar") return `${card.title} · ${card.count} câu luyện`;
  return `${card.count} câu`;
}

function findSet(cards: readonly SetCard[], id: string | null) {
  for (const card of cards) {
    const set = card.sets.find((entry) => entry.id === id);
    if (set) return { set, title: `${TYPE_LABELS[set.type]}: ${card.titleEn ?? card.title}` };
  }
  return null;
}

/** `/bai-tap`: exercise sets for every level, topic and grammar point, with filters (AC-026, AC-029). */
export function ExerciseLibrary() {
  const params = useSearchParams();
  const profile = useProfile();
  const setId = params.get("id");
  const levelParam = parseLevel(params.get("level")) ?? (setId ? levelOfSetId(setId) : null);
  const level: Level | null = levelParam ?? (profile.status === "ready" ? profile.data.level : profile.status === "error" ? "A1" : null);
  const topic = params.get("topic") ?? ALL;
  const typeParam = params.get("loai");
  const type = isSetType(typeParam) ? typeParam : ALL;

  const levels = useMemo(() => (level ? [level] : null), [level]);
  const content = useContentIndex(levels);
  const index = content.status === "ready" ? content.index : null;
  const cards = useMemo(() => (index && level ? listSetCards(index, level) : []), [index, level]);
  const startedInApp = useRef(false);

  const active = useMemo(() => findSet(cards, setId), [cards, setId]);
  const activeSet = active?.set;
  const buildSteps = useCallback((round: number) => (activeSet && index ? buildSetSteps(activeSet, index, round) : []), [activeSet, index]);

  if (!level || content.status === "loading") return <ListSkeleton rows={6} />;
  if (content.status === "error") return <ContentError onRetry={content.retry} />;

  const topics = [...new Set(cards.filter((card) => card.group !== "grammar").map((card) => card.scope))].sort(compareTopics);
  const topicItems = [{ value: ALL, label: "Tất cả chủ đề" }, ...topics.map((slug) => ({ value: slug, label: topicTitle(slug) }))];
  const shown = cards
    .filter((card) => topic === ALL || (card.group !== "grammar" && card.scope === topic))
    .map((card) => ({ ...card, sets: card.sets.filter((set) => type === ALL || set.type === type) }))
    .filter((card) => card.sets.length > 0);

  function handleLevelChange(next: Level) {
    updateSearchParams({ level: next, topic: null });
  }

  function handleTopicChange(value: string | null) {
    updateSearchParams({ topic: !value || value === ALL ? null : value });
  }

  function handleTypeChange(value: string | null) {
    updateSearchParams({ loai: !value || value === ALL ? null : value });
  }

  function handleClearFilters() {
    updateSearchParams({ topic: null, loai: null });
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

  return (
    <div className="grid gap-5 px-4 md:px-8">
      <div className="grid gap-3 lg:flex lg:flex-wrap lg:items-center">
        <LevelTabs value={level} onChange={handleLevelChange} />
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Select value={topics.includes(topic) ? topic : ALL} onValueChange={handleTopicChange} items={topicItems}>
            <SelectTrigger aria-label="Lọc theo chủ đề" className="w-full data-[size=default]:h-11 sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topicItems.map((item) => (
                <SelectItem key={item.value} value={item.value} className="min-h-10">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={handleTypeChange} items={TYPE_ITEMS}>
            <SelectTrigger aria-label="Lọc theo dạng bài" className="w-full data-[size=default]:h-11 sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPE_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value} className="min-h-10">
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {cards.length === 0 ? (
        <EmptyState icon={ListChecks} title={`Chưa có bài tập trình độ ${level}`}>
          <p className="text-sm text-muted-foreground">Nội dung đang được biên soạn. Bạn chọn trình độ khác hoặc quay lại sau nhé.</p>
        </EmptyState>
      ) : shown.length === 0 ? (
        <EmptyState icon={FilterX} title="Không có bài tập nào khớp bộ lọc">
          <Button variant="outline" className="h-11" onClick={handleClearFilters}>
            Bỏ lọc
          </Button>
        </EmptyState>
      ) : (
        GROUPS.map(({ group, title, icon: Icon }) => {
          const groupCards = shown.filter((card) => card.group === group);
          if (groupCards.length === 0) return null;
          return (
            <section key={group} aria-labelledby={`bai-tap-${group}`} className="grid gap-3">
              <h2 id={`bai-tap-${group}`} className="flex items-center gap-2 text-lg font-semibold">
                <Icon className="size-5 text-primary" aria-hidden /> {title}
              </h2>
              <ul className="grid gap-3 md:grid-cols-2">
                {groupCards.map((card) => (
                  <li key={card.key} className="[contain-intrinsic-size:auto_9rem] [content-visibility:auto]">
                    <SetCardView card={card} onStart={handleStart} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}

      {active && index ? <ExerciseRun key={active.set.id} title={active.title} buildSteps={buildSteps} onClose={handleCloseRun} /> : null}
    </div>
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
          <Button key={set.id} variant="outline" className="h-11 px-3" onClick={() => onStart(set.id)} aria-label={`Bắt đầu ${TYPE_LABELS[set.type]}: ${heading}`}>
            {TYPE_LABELS[set.type]}
          </Button>
        ))}
      </div>
    </article>
  );
}
