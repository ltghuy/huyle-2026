// Builds one day's lesson (AC-014): review → new words → grammar (when
// scheduled) → sentences → writing. Pure and deterministic: the same inputs
// always give the same plan, so a lesson can be rebuilt and resumed.
import type { ContentItemOf } from "../content/schema";
import { localDate } from "./attendance";
import type { GrammarItem, SentenceItem, WordItem } from "./exercises/types";
import { retrievability } from "./srs";
import {
  LEVELS,
  type DailyLesson,
  type ExerciseDescriptor,
  type ExerciseKind,
  type LessonPart,
  type LessonPartKind,
  type Level,
  type Profile,
  type StoredCard,
} from "./types";

export type WritingItem = ContentItemOf<"writing">;

export const REVIEW_CAP = 50;
export const NEW_WORDS = 10;
/** New words on a day with more than REVIEW_CAP reviews due (backlog). */
export const NEW_WORDS_BACKLOG = 5;
export const SENTENCE_TASKS = 3;
export const GRAMMAR_PRACTICE = 3;

const WORD_REVIEW_KINDS = ["mcq", "missing-letters", "listening", "recall"] as const;
const SENTENCE_KINDS = ["word-order", "sentence-gap", "choose-sentence", "tile-translate"] as const;

/** The content the planner reads; the caller builds it from the content cache. */
export interface LessonContent {
  /** Per level, ordered by `sort` then id. */
  wordsByLevel: Partial<Record<Level, readonly WordItem[]>>;
  /** Per level, ordered by `sort`. */
  grammarByLevel: Partial<Record<Level, readonly GrammarItem[]>>;
  sentences: readonly SentenceItem[];
  writing: readonly WritingItem[];
  /** Tombstoned or unknown ids: never planned, not even as reviews. */
  skip: ReadonlySet<string>;
}

export interface LessonPlanInput {
  date: string;
  now: number;
  profile: Pick<Profile, "level" | "timeZone">;
  cards: readonly StoredCard[];
  content: LessonContent;
  contentVersion: number;
  /** Defaults to a hash of the date. */
  seed?: number;
  /** Writing task ids used in the last 14 days, avoided when possible. */
  recentWritingIds?: readonly string[];
}

/** FNV-1a, 32-bit. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Grammar days alternate by date parity. */
export function isGrammarDay(date: string): boolean {
  return dayNumber(date) % 2 === 0;
}

/** Due by the end of `date` in the learner's time zone, lowest retrievability first. */
export function dueCards(input: Pick<LessonPlanInput, "date" | "now" | "profile" | "cards" | "content">): StoredCard[] {
  const { date, now, profile, cards, content } = input;
  return cards
    .filter((card) => !content.skip.has(card.itemId) && localDate(card.due, profile.timeZone) <= date)
    .map((card) => ({ card, r: retrievability(card, now) }))
    .sort((a, b) => a.r - b.r || a.card.due - b.card.due || a.card.itemId.localeCompare(b.card.itemId))
    .map(({ card }) => card);
}

function uncardedWords(level: Level, carded: ReadonlySet<string>, content: LessonContent): WordItem[] {
  return (content.wordsByLevel[level] ?? []).filter((word) => !carded.has(word.id) && !content.skip.has(word.id));
}

/** `count` not-yet-carded words from the learner's level, then the levels above it. */
export function pickNewWords(level: Level, cards: readonly StoredCard[], content: LessonContent, count: number): WordItem[] {
  const carded = new Set(cards.map((card) => card.itemId));
  const picked: WordItem[] = [];
  for (const next of LEVELS.slice(LEVELS.indexOf(level))) {
    for (const word of uncardedWords(next, carded, content)) {
      if (picked.length === count) return picked;
      picked.push(word);
    }
  }
  return picked;
}

/** True when the learner's level has fewer new words left than a lesson takes (suggest moving up). */
export function isLevelExhausted(
  profile: Pick<Profile, "level">,
  cards: readonly StoredCard[],
  content: LessonContent,
  count: number = NEW_WORDS,
): boolean {
  const carded = new Set(cards.map((card) => card.itemId));
  return uncardedWords(profile.level, carded, content).length < count;
}

export function buildLessonPlan(input: LessonPlanInput): DailyLesson {
  const { date, now, profile, cards, content, contentVersion } = input;
  const base = input.seed ?? hashString(date);
  const seedFor = (part: LessonPartKind, index: number, itemId: string) => hashString(`${base}|${part}|${index}|${itemId}`);
  const step = (part: LessonPartKind, index: number, kind: ExerciseKind, itemId: string): ExerciseDescriptor => ({
    kind,
    itemIds: [itemId],
    seed: seedFor(part, index, itemId),
  });

  const wordsById = new Map<string, WordItem>();
  for (const level of LEVELS) for (const word of content.wordsByLevel[level] ?? []) wordsById.set(word.id, word);
  const sentencesById = new Map(content.sentences.map((sentence) => [sentence.id, sentence]));
  const grammarById = new Map<string, GrammarItem>();
  for (const level of LEVELS) for (const topic of content.grammarByLevel[level] ?? []) grammarById.set(topic.id, topic);

  // Review: the most-forgotten due items first; the rest roll to later days.
  const due = dueCards(input);
  const reviewed = due.slice(0, REVIEW_CAP);
  const review: ExerciseDescriptor[] = reviewed.map((card, i) => {
    if (card.itemId.startsWith("grammar:")) return step("review", i, "grammar-gap", card.itemId);
    const word = wordsById.get(card.itemId);
    // Listening needs audio; unknown words get no listening either.
    const kinds = WORD_REVIEW_KINDS.filter((kind) => kind !== "listening" || (word?.body.audio ?? "") !== "");
    // Rotating with `reps` gives the item a different kind each time it is reviewed (AC-012).
    const kind = kinds[(hashString(card.itemId) + card.reps) % kinds.length];
    return step("review", i, kind, card.itemId);
  });
  if (review.length > 0 && !review.some((exercise) => exercise.kind === "mcq")) {
    const first = review.findIndex((exercise) => exercise.kind !== "grammar-gap");
    if (first !== -1) review[first] = { ...review[first], kind: "mcq" };
  }

  // New words: a study card, then a multiple-choice check, for each.
  const newWords = pickNewWords(profile.level, cards, content, due.length > REVIEW_CAP ? NEW_WORDS_BACKLOG : NEW_WORDS);
  const newWordSteps = newWords.flatMap((word, i) => [
    step("new-words", 2 * i, "study", word.id),
    step("new-words", 2 * i + 1, "mcq", word.id),
  ]);

  // Grammar: every 2nd day, the next topic at the level the learner hasn't started.
  const carded = new Set<string>(cards.map((card) => card.itemId));
  const topic = isGrammarDay(date)
    ? (content.grammarByLevel[profile.level] ?? []).find((g) => !carded.has(g.id) && !content.skip.has(g.id))
    : undefined;
  const grammarSteps: ExerciseDescriptor[] = topic
    ? [
        step("grammar", 0, "study", topic.id),
        ...Array.from({ length: Math.min(GRAMMAR_PRACTICE, topic.body.practice.length) }, (_, i) =>
          step("grammar", i + 1, "grammar-gap", topic.id),
        ),
      ]
    : [];

  // Sentences: from today's new words' examples, then the grammar topic's,
  // then the reviewed words' as a fallback.
  const candidateIds = [
    ...newWords.flatMap((word) => word.body.examples),
    ...(topic?.body.examples ?? []),
    ...reviewed.flatMap((card) => wordsById.get(card.itemId)?.body.examples ?? grammarById.get(card.itemId)?.body.examples ?? []),
  ];
  const candidates = [...new Set(candidateIds)]
    .filter((id) => !content.skip.has(id))
    .flatMap((id) => sentencesById.get(id) ?? []);
  const sentenceSteps: ExerciseDescriptor[] = [];
  let rotation = base % SENTENCE_KINDS.length;
  for (const sentence of candidates) {
    if (sentenceSteps.length === SENTENCE_TASKS) break;
    for (let tried = 0; tried < SENTENCE_KINDS.length; tried++) {
      const kind = SENTENCE_KINDS[(rotation + tried) % SENTENCE_KINDS.length];
      if (!supports(kind, sentence)) continue;
      sentenceSteps.push(step("sentences", sentenceSteps.length, kind, sentence.id));
      rotation = (rotation + tried + 1) % SENTENCE_KINDS.length;
      break;
    }
  }

  // Writing: one task at the level, not one used recently when possible.
  const writingPool = content.writing.filter((task) => task.level === profile.level && !content.skip.has(task.id));
  const recent = new Set(input.recentWritingIds ?? []);
  const fresh = writingPool.filter((task) => !recent.has(task.id));
  const choices = fresh.length > 0 ? fresh : writingPool;
  const writingTask = choices.length > 0 ? choices[dayNumber(date) % choices.length] : undefined;
  const writingSteps = writingTask ? [step("writing", 0, "writing", writingTask.id)] : [];

  const parts: [LessonPartKind, ExerciseDescriptor[]][] = [
    ["review", review],
    ["new-words", newWordSteps],
    ["grammar", grammarSteps],
    ["sentences", sentenceSteps],
    ["writing", writingSteps],
  ];
  const plan: LessonPart[] = parts
    .filter(([, exercises]) => exercises.length > 0)
    .map(([kind, exercises]) => ({ kind, exercises }));

  return { date, contentVersion, plan, position: { part: 0, index: 0 }, updatedAt: now };
}

function supports(kind: (typeof SENTENCE_KINDS)[number], sentence: SentenceItem): boolean {
  if (kind === "sentence-gap") return sentence.body.gapCandidates.length > 0;
  if (kind === "choose-sentence") return sentence.body.wrongVariants.length >= 3;
  return true;
}
