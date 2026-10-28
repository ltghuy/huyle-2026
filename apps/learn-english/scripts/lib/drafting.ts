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

// ---------- irregular verb forms (feature 008) ----------

export interface FormsDraft {
  /** The verb's word id, e.g. "word:go-v". */
  wordId: string;
  /** The taught form first; `region` only for a form used in just one of US or UK English. */
  past: { text: string; region?: "us" | "uk" }[];
  participle: { text: string; region?: "us" | "uk" }[];
  noteVi?: string;
  /** At least one sentence for each form, with "___" where the form goes. */
  practice: { en: string; answer: "past" | "participle"; vi: string }[];
  notes?: string;
}

/** Problems with one verb's forms draft against the drafting rules. */
export function checkFormsDraft(level: Level, draft: FormsDraft): string[] {
  const problems: string[] = [];
  const where = draft.wordId;
  const answers = new Set(draft.practice.map((sentence) => sentence.answer));
  if (!answers.has("past") || !answers.has("participle")) problems.push(`${where}: needs a practice sentence for the past and one for the participle`);
  for (const [i, sentence] of draft.practice.entries()) {
    const blanks = sentence.en.split("___").length - 1;
    if (blanks !== 1) problems.push(`${where} practice ${i + 1}: ${blanks} blanks, expected 1`);
    const words = splitTokens(sentence.en.replace("___", "x")).length;
    if (words > MAX_WORDS[level]) problems.push(`${where} practice ${i + 1}: ${words} words, ${level} allows ${MAX_WORDS[level]}`);
    if (!sentence.vi.trim()) problems.push(`${where} practice ${i + 1}: missing Vietnamese translation`);
  }
  for (const form of [...draft.past, ...draft.participle]) {
    if (!/^[a-z]+$/.test(form.text)) problems.push(`${where}: form "${form.text}" should be one lowercase word`);
  }
  return problems;
}

/** One verb's forms draft → a `forms:` source item (IPA is filled in by content:ipa). */
export function buildForms(row: WordlistRow, draft: FormsDraft): Built {
  const problems: string[] = [];
  // "verb", and be/do/have, which the word list files as "be-verb", "do-verb", "have-verb".
  if (!/(^|-)verb$/.test(row.pos)) problems.push(`${draft.wordId}: not a verb (${row.pos})`);
  const reviewNotes = draft.notes?.trim() ? [draft.notes.trim()] : [];
  const form = (entry: FormsDraft["past"][number]) => ({ text: entry.text.trim(), ipa: "", ...(entry.region ? { region: entry.region } : {}) });
  const item = {
    id: `forms:${row.id.slice("word:".length)}`,
    kind: "forms",
    level: row.level,
    status: "draft",
    ...(reviewNotes.length ? { reviewNotes } : {}),
    body: {
      wordId: row.id,
      past: draft.past.map(form),
      participle: draft.participle.map(form),
      ...(draft.noteVi?.trim() ? { noteVi: draft.noteVi.trim() } : {}),
      audio: "",
      practice: draft.practice.map((sentence) => ({ en: sentence.en.trim(), answer: sentence.answer, vi: sentence.vi.trim() })),
    },
  };
  return validated([item], problems);
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

/**
 * Writing tasks. Each `useWords` entry is a word id ("word:like-v") or a
 * headword; a headword with several parts of speech is reported instead of
 * guessed, so the draft can name the id.
 */
export function buildWriting(level: Level, draft: WritingDraft, wordIndex: Map<string, string>): Built {
  const problems: string[] = [];
  const ids = new Set(wordIndex.values());
  const items = draft.tasks.map((task, i) => {
    const id = `writing:${level.toLowerCase()}-${i + 1}-${slugify(task.modelAnswers[0] ?? "task").slice(0, 24).replace(/-+$/, "")}`;
    const useItems = task.useWords.flatMap((word) => {
      const wanted = word.trim();
      if (wanted.startsWith("word:")) {
        if (ids.has(wanted)) return [wanted];
        problems.push(`${id}: unknown word id ${wanted}`);
        return [];
      }
      const matches = [...wordIndex.entries()].filter(([key]) => key.startsWith(`${wanted.toLowerCase()}|`)).map(([, value]) => value);
      if (matches.length === 1) return matches;
      problems.push(
        matches.length === 0 ? `${id}: "${wanted}" is not in the word list` : `${id}: "${wanted}" is ambiguous, use one of ${matches.join(", ")}`,
      );
      return [];
    });
    return {
      id,
      kind: "writing",
      level,
      sort: i,
      status: "draft",
      body: { kind: "short-writing", promptVi: task.promptVi, modelAnswers: task.modelAnswers, useItems },
    };
  });
  return validated(items, problems);
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

/** A transcription between slashes with at least one letter-like sound in it. */
const IPA_SHAPE = /^\/[^/|]*[a-zɑæʌəɔɛɝɚɪʊθðʃʒŋ][^/|]*\/$/;

const MAX_WORDS: Record<Level, number> = { A1: 10, A2: 10, B1: 14, B2: 14, C1: 18 };

/** Problems with one example sentence against the drafting rules. */
export function checkSentenceDraft(where: string, level: Level, draft: SentenceDraft): string[] {
  const problems: string[] = [];
  const words = splitTokens(draft.en).length;
  if (words > MAX_WORDS[level]) problems.push(`${where}: ${words} words, ${level} allows ${MAX_WORDS[level]}`);
  if (!draft.vi.trim()) problems.push(`${where}: missing Vietnamese translation`);
  if (draft.wrongVariants.length !== 3) problems.push(`${where}: ${draft.wrongVariants.length} wrong variants, expected 3`);
  for (const variant of draft.wrongVariants) {
    const loose = (text: string) => splitTokens(text).join(" ").toLowerCase();
    if (loose(variant.en) === loose(draft.en)) problems.push(`${where}: a wrong variant differs only in case or punctuation: "${variant.en}"`);
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
  else if (draft.ipaSuggestion.trim() && !IPA_SHAPE.test(draft.ipaSuggestion.trim())) {
    problems.push(`${draft.id}: IPA suggestion "${draft.ipaSuggestion}" is not a /transcription/`);
  }
  draft.examples.forEach((example, i) => problems.push(...checkSentenceDraft(`${draft.id} example ${i + 1}`, level, example)));
  return problems;
}

/** Problems with one grammar lesson draft against the drafting rules. */
export function checkGrammarDraft(slug: string, level: Level, draft: GrammarDraft): string[] {
  const problems: string[] = [];
  if (draft.examples.length !== 4) problems.push(`${slug}: ${draft.examples.length} examples, expected 4`);
  draft.examples.forEach((example, i) => problems.push(...checkSentenceDraft(`${slug} example ${i + 1}`, level, example)));
  if (draft.practice.length !== 6) problems.push(`${slug}: ${draft.practice.length} practice items, expected 6`);
  draft.practice.forEach((item, i) => {
    const where = `${slug} practice ${i + 1}`;
    if (!item.prompt.includes("___")) problems.push(`${where}: the prompt has no ___ blank`);
    if (item.options.length !== 0 && item.options.length !== 4) problems.push(`${where}: ${item.options.length} options, expected 4 or none`);
    const matches = item.options.filter((option) => option.trim().toLowerCase() === item.answer.trim().toLowerCase()).length;
    if (item.options.length === 4 && matches !== 1) problems.push(`${where}: the answer must be exactly one of the options`);
  });
  if (draft.mistakes.length < 2 || draft.mistakes.length > 4) problems.push(`${slug}: ${draft.mistakes.length} mistakes, expected 2 to 4`);
  return problems;
}
