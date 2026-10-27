// Pure parts of the content drafting pipeline: the JSON schemas the model must
// answer in, and the transforms from its drafts to content source items. The
// model writes language (meanings, sentences, explanations); everything
// mechanical (tokens, index orders, ids, cross-references) is computed here
// and then validated against the content schemas.
import type { Level } from "../../src/learning/types";
import { sourceItemSchema, type SourceItem } from "../../src/content/schema";
import type { WordlistRow } from "../import-wordlists";
import { slugify } from "../import-wordlists";

// ---------- model output shapes ----------

export interface SentenceDraft {
  en: string;
  vi: string;
  /** Other grammatical orders of exactly the same words, written out. */
  alternativeOrders: string[];
  /** Words of the sentence that make a good blank for "fill in the missing word". */
  gapWords: string[];
  wrongVariants: { en: string; explanationVi: string }[];
}

export interface WordDraft {
  id: string;
  topic: string;
  meaningsVi: string[];
  synonyms: string[];
  ipaOk: boolean;
  ipaSuggestion: string;
  examples: SentenceDraft[];
  notes: string;
}

export interface GrammarDraft {
  ruleVi: string;
  pattern: { form: "affirmative" | "negative" | "question"; en: string }[];
  usageVi: string[];
  signalWords: string[];
  mistakes: { wrong: string; right: string; explanationVi: string }[];
  examples: SentenceDraft[];
  practice: { prompt: string; options: string[]; answer: string; explanationVi: string }[];
}

export interface WritingDraft {
  tasks: { promptVi: string; modelAnswers: string[]; useWords: string[] }[];
}

// ---------- JSON schemas for structured outputs ----------
// Only the subset structured outputs accepts: every object closed with
// additionalProperties: false, no length or numeric constraints.

const str = { type: "string" } as const;
const strArray = { type: "array", items: str } as const;
const closed = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const sentenceDraftSchema = closed({
  en: str,
  vi: str,
  alternativeOrders: strArray,
  gapWords: strArray,
  wrongVariants: { type: "array", items: closed({ en: str, explanationVi: str }) },
});

export function wordsOutputSchema(topicSlugs: string[]) {
  return closed({
    words: {
      type: "array",
      items: closed({
        id: str,
        topic: { type: "string", enum: topicSlugs },
        meaningsVi: strArray,
        synonyms: strArray,
        ipaOk: { type: "boolean" },
        ipaSuggestion: str,
        examples: { type: "array", items: sentenceDraftSchema },
        notes: str,
      }),
    },
  });
}

export const grammarOutputSchema = closed({
  ruleVi: str,
  pattern: {
    type: "array",
    items: closed({ form: { type: "string", enum: ["affirmative", "negative", "question"] }, en: str }),
  },
  usageVi: strArray,
  signalWords: strArray,
  mistakes: { type: "array", items: closed({ wrong: str, right: str, explanationVi: str }) },
  examples: { type: "array", items: sentenceDraftSchema },
  practice: { type: "array", items: closed({ prompt: str, options: strArray, answer: str, explanationVi: str }) },
});

export const writingOutputSchema = closed({
  tasks: { type: "array", items: closed({ promptVi: str, modelAnswers: strArray, useWords: strArray }) },
});

// ---------- tokens and orders ----------

const EDGE_PUNCTUATION = /^[\s"“”‘(\[]+|[\s"“”’)\],;:.!?…]+$/g;

/** Splits a sentence into word tiles: original casing, no surrounding punctuation. */
export function splitTokens(sentence: string): string[] {
  return sentence
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(EDGE_PUNCTUATION, ""))
    .filter(Boolean);
}

/**
 * Index order of `tokens` that spells `alternative`, or null if it doesn't use
 * exactly the same words. Repeated words are matched left to right.
 */
export function orderFromSentence(tokens: string[], alternative: string): number[] | null {
  const altTokens = splitTokens(alternative);
  if (altTokens.length !== tokens.length) return null;
  const used = new Set<number>();
  const order: number[] = [];
  for (const token of altTokens) {
    const index = tokens.findIndex((candidate, i) => !used.has(i) && candidate.toLowerCase() === token.toLowerCase());
    if (index === -1) return null;
    used.add(index);
    order.push(index);
  }
  return order;
}

// ---------- drafts → source items ----------

export interface Built {
  items: SourceItem[];
  problems: string[];
}

/** Turns one sentence draft into a sentence item (status draft). */
export function buildSentence(
  id: string,
  level: Level,
  draft: SentenceDraft,
  links: { wordIds?: string[]; grammarSlug?: string },
): Built {
  const tokens = splitTokens(draft.en);
  const identity = tokens.map((_, i) => i);
  const orders = [identity];
  const problems: string[] = [];
  for (const alternative of draft.alternativeOrders) {
    const order = orderFromSentence(tokens, alternative);
    if (!order) problems.push(`${id}: alternative order doesn't use the same words: "${alternative}"`);
    else if (!orders.some((known) => known.join() === order.join())) orders.push(order);
  }
  const gapCandidates = [
    ...new Set(
      draft.gapWords
        .map((word) => tokens.findIndex((token) => token.toLowerCase() === word.trim().toLowerCase()))
        .filter((index) => index >= 0),
    ),
  ];
  const item = {
    id,
    kind: "sentence",
    level,
    status: "draft",
    body: {
      en: draft.en.trim(),
      vi: draft.vi.trim(),
      audio: "",
      tokens,
      acceptedOrders: orders,
      wrongVariants: draft.wrongVariants,
      gapCandidates,
      wordIds: links.wordIds ?? [],
      ...(links.grammarSlug ? { grammarSlug: links.grammarSlug } : {}),
    },
  };
  return validated([item], problems);
}

/** Word item + its example sentences. `wordIndex` maps "headword|pos" to word ids for synonyms. */
export function buildWord(
  row: WordlistRow,
  draft: WordDraft,
  ipa: string | undefined,
  wordIndex: Map<string, string>,
): Built {
  const slug = row.id.slice("word:".length);
  const items: SourceItem[] = [];
  const problems: string[] = [];
  const exampleIds: string[] = [];
  draft.examples.forEach((example, i) => {
    const sentence = buildSentence(`sentence:${slug}-${i + 1}`, row.level, example, { wordIds: [row.id] });
    items.push(...sentence.items);
    problems.push(...sentence.problems);
    exampleIds.push(...sentence.items.map((item) => item.id));
  });
  const synonyms = draft.synonyms
    .map((headword) => wordIndex.get(`${headword.trim().toLowerCase()}|${row.pos}`))
    .filter((id): id is string => Boolean(id) && id !== row.id);
  const reviewNotes: string[] = [];
  if (!ipa) reviewNotes.push("IPA missing from CMUdict: check the drafted transcription");
  else if (!draft.ipaOk) reviewNotes.push(`IPA flagged: CMUdict gave ${ipa}`);
  if (draft.notes.trim()) reviewNotes.push(draft.notes.trim());
  const finalIpa = (!ipa || !draft.ipaOk) && draft.ipaSuggestion.trim() ? draft.ipaSuggestion.trim() : (ipa ?? "");
  const word = {
    id: row.id,
    kind: "word",
    level: row.level,
    topic: draft.topic,
    status: "draft",
    ...(reviewNotes.length ? { reviewNotes } : {}),
    body: {
      headword: row.headword,
      variants: row.variants,
      pos: row.pos,
      ipa: finalIpa,
      meaningsVi: draft.meaningsVi.map((meaning) => meaning.trim()).filter(Boolean),
      examples: exampleIds,
      synonyms: [...new Set(synonyms)],
      audio: "",
      source: row.source,
    },
  };
  const built = validated([word, ...items], problems);
  return built;
}

export interface GrammarTopicRow {
  slug: string;
  level: Level;
  titleEn: string;
  titleVi: string;
  order: number;
}

export function buildGrammar(topic: GrammarTopicRow, draft: GrammarDraft): Built {
  const items: SourceItem[] = [];
  const problems: string[] = [];
  const exampleIds: string[] = [];
  draft.examples.forEach((example, i) => {
    const sentence = buildSentence(`sentence:g-${topic.slug}-${i + 1}`, topic.level, example, { grammarSlug: topic.slug });
    items.push(...sentence.items);
    problems.push(...sentence.problems);
    exampleIds.push(...sentence.items.map((item) => item.id));
  });
  const grammar = {
    id: `grammar:${topic.slug}`,
    kind: "grammar",
    level: topic.level,
    sort: topic.order,
    status: "draft",
    body: {
      titleEn: topic.titleEn,
      titleVi: topic.titleVi,
      ruleVi: draft.ruleVi,
      pattern: draft.pattern,
      usageVi: draft.usageVi,
      signalWords: draft.signalWords,
      mistakes: draft.mistakes,
      examples: exampleIds,
      practice: draft.practice.map(({ options, ...rest }) => (options.length === 4 ? { ...rest, options } : rest)),
    },
  };
  return validated([grammar, ...items], problems);
}

export function buildWriting(level: Level, draft: WritingDraft, wordIndex: Map<string, string>): Built {
  const items = draft.tasks.map((task, i) => ({
    id: `writing:${level.toLowerCase()}-${i + 1}-${slugify(task.modelAnswers[0] ?? "task").slice(0, 24)}`,
    kind: "writing",
    level,
    sort: i,
    status: "draft",
    body: {
      kind: "short-writing",
      promptVi: task.promptVi,
      modelAnswers: task.modelAnswers,
      useItems: task.useWords
        .map((headword) => [...wordIndex.entries()].find(([key]) => key.startsWith(`${headword.trim().toLowerCase()}|`))?.[1])
        .filter((id): id is string => Boolean(id)),
    },
  }));
  return validated(items, []);
}

function validated(candidates: unknown[], problems: string[]): Built {
  const items: SourceItem[] = [];
  for (const candidate of candidates) {
    const parsed = sourceItemSchema.safeParse(candidate);
    if (parsed.success) items.push(parsed.data);
    else {
      const id = (candidate as { id?: string }).id ?? "?";
      problems.push(`${id}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`);
    }
  }
  return { items, problems };
}

/**
 * Merges freshly drafted items into an existing source file: approved items
 * are never replaced, drafts are, new ids are appended. Order is by id.
 */
export function mergeDrafts(existing: SourceItem[], drafted: SourceItem[]): SourceItem[] {
  const byId = new Map(existing.map((item) => [item.id, item]));
  for (const item of drafted) {
    if (byId.get(item.id)?.status === "approved") continue;
    byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// ---------- rule checks (prompts.ts rules a schema can't express) ----------

const MAX_WORDS: Record<Level, number> = { A1: 10, A2: 10, B1: 14, B2: 14, C1: 18 };

/** Problems with one example sentence against the drafting rules. */
export function checkSentenceDraft(where: string, level: Level, draft: SentenceDraft): string[] {
  const problems: string[] = [];
  const words = splitTokens(draft.en).length;
  if (words > MAX_WORDS[level]) problems.push(`${where}: ${words} words, ${level} allows ${MAX_WORDS[level]}`);
  if (!draft.vi.trim()) problems.push(`${where}: missing Vietnamese translation`);
  if (draft.wrongVariants.length !== 3) problems.push(`${where}: ${draft.wrongVariants.length} wrong variants, expected 3`);
  for (const variant of draft.wrongVariants) {
    if (variant.en.trim() === draft.en.trim()) problems.push(`${where}: a wrong variant equals the sentence`);
    if (!variant.explanationVi.trim()) problems.push(`${where}: a wrong variant has no explanation`);
  }
  if (draft.gapWords.length === 0) problems.push(`${where}: no gap words`);
  const tokens = splitTokens(draft.en).map((token) => token.toLowerCase());
  for (const word of draft.gapWords) {
    if (!tokens.includes(word.trim().toLowerCase())) problems.push(`${where}: gap word "${word}" is not in the sentence`);
  }
  return problems;
}

/** Problems with one word draft against the drafting rules. */
export function checkWordDraft(level: Level, draft: WordDraft, topicSlugs: ReadonlySet<string>): string[] {
  const problems: string[] = [];
  if (!topicSlugs.has(draft.topic)) problems.push(`${draft.id}: unknown topic "${draft.topic}"`);
  if (draft.meaningsVi.length < 1 || draft.meaningsVi.length > 3) problems.push(`${draft.id}: ${draft.meaningsVi.length} meanings, expected 1 to 3`);
  const expected = level === "A1" || level === "A2" ? 1 : 2;
  if (draft.examples.length !== expected) problems.push(`${draft.id}: ${draft.examples.length} examples, expected ${expected}`);
  if (!draft.ipaOk && !draft.ipaSuggestion.trim()) problems.push(`${draft.id}: IPA flagged without a suggestion`);
  draft.examples.forEach((example, i) => problems.push(...checkSentenceDraft(`${draft.id} example ${i + 1}`, level, example)));
  return problems;
}
