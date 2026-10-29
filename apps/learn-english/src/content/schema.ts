import { z } from "zod";
import { LEVELS } from "../learning/types";

// Course content schemas, shared by the content scripts, the content API and
// the app. Source files in `content/` hold `SourceItem`s (with a review
// status); the database and the API serve `ContentItem`s.

export const levelSchema = z.enum(LEVELS);

export const CONTENT_KINDS = ["word", "grammar", "sentence", "writing", "placement", "forms", "set"] as const;
export const contentKindSchema = z.enum(CONTENT_KINDS);
export type ContentKind = z.infer<typeof contentKindSchema>;

const idOf = (kind: ContentKind) =>
  z.string().regex(new RegExp(`^${kind}:[a-z0-9][a-z0-9-]*$`), `must look like ${kind}:<slug>`);

const nonEmpty = z.string().trim().min(1);
// Content hash of an audio clip in R2 (sha256 hex); empty until audio is generated.
const audioKey = z.union([z.string().regex(/^[0-9a-f]{64}$/), z.literal("")]);

export const wordBodySchema = z.object({
  headword: nonEmpty,
  variants: z.array(nonEmpty).default([]),
  pos: nonEmpty,
  ipa: z.string(),
  meaningsVi: z.array(nonEmpty).min(1),
  examples: z.array(idOf("sentence")).min(1),
  synonyms: z.array(idOf("word")).default([]),
  audio: audioKey,
  // "added": a word the course needs that neither list has (content/added-words.json).
  // "specialized": a job word that exists only inside a vocabulary set (feature 012).
  source: z.enum(["cefrj-1.5", "octanove-1.0", "added", "specialized"]),
});

export const grammarBodySchema = z.object({
  titleEn: nonEmpty,
  titleVi: nonEmpty,
  ruleVi: nonEmpty,
  pattern: z
    .array(z.object({ form: z.enum(["affirmative", "negative", "question"]), en: nonEmpty }))
    .min(1),
  usageVi: z.array(nonEmpty).min(1),
  signalWords: z.array(nonEmpty).default([]),
  mistakes: z.array(z.object({ wrong: nonEmpty, right: nonEmpty, explanationVi: nonEmpty })).default([]),
  examples: z.array(idOf("sentence")).min(1),
  practice: z
    .array(
      z.object({
        prompt: nonEmpty,
        options: z.array(nonEmpty).length(4).optional(),
        answer: nonEmpty,
        explanationVi: nonEmpty,
      }),
    )
    .default([]),
});

export const sentenceBodySchema = z
  .object({
    en: nonEmpty,
    vi: nonEmpty,
    audio: audioKey,
    tokens: z.array(nonEmpty).min(2),
    // Every accepted word order, as indexes into `tokens`.
    acceptedOrders: z.array(z.array(z.number().int().nonnegative())).min(1),
    // Plausible wrong sentences for "choose the correct sentence".
    wrongVariants: z.array(z.object({ en: nonEmpty, explanationVi: nonEmpty })).default([]),
    // Token indexes that make a sensible blank for "fill in the missing word".
    gapCandidates: z.array(z.number().int().nonnegative()).default([]),
    wordIds: z.array(idOf("word")).default([]),
    grammarSlug: z.string().optional(),
  })
  .superRefine((body, ctx) => {
    const n = body.tokens.length;
    body.acceptedOrders.forEach((order, i) => {
      const isPermutation =
        order.length === n && new Set(order).size === n && order.every((index) => index < n);
      if (!isPermutation) {
        ctx.addIssue({ code: "custom", path: ["acceptedOrders", i], message: "must be a permutation of the token indexes" });
      }
    });
    body.gapCandidates.forEach((index, i) => {
      if (index >= n) ctx.addIssue({ code: "custom", path: ["gapCandidates", i], message: "out of range" });
    });
  });

export const writingBodySchema = z.object({
  kind: z.literal("short-writing"),
  promptVi: nonEmpty,
  useItems: z.array(z.string()).default([]),
  modelAnswers: z.array(nonEmpty).min(1),
});

export const placementBodySchema = z
  .object({
    kind: z.enum(["meaning-mcq", "grammar-mcq"]),
    prompt: nonEmpty,
    options: z.array(nonEmpty).length(4),
    answerIndex: z.number().int().min(0).max(3),
  })
  .refine((body) => new Set(body.options).size === 4, { message: "options must be distinct" });

// One accepted spelling of a past or past participle; `region` marks a form
// used only in American or only in British English (got / gotten).
const verbForm = z.object({ text: nonEmpty, ipa: z.string(), region: z.enum(["us", "uk"]).optional() });

/**
 * The past and past participle of an irregular verb (feature 008). The item
 * id is `forms:<the word's slug>`, and it is also the review card id, so
 * forms are scheduled apart from the word's meaning.
 */
export const formsBodySchema = z.object({
  wordId: idOf("word"),
  // The first form is the one taught first; later ones are accepted variants.
  past: z.array(verbForm).min(1),
  participle: z.array(verbForm).min(1),
  // Another sense with other forms: "treo cổ: hang → hanged → hanged".
  noteVi: z.string().optional(),
  // One clip saying "base, past, participle".
  audio: audioKey,
  // Sentences with "___" where a form goes, for "choose the right form".
  practice: z
    .array(z.object({ en: z.string().regex(/___/, "needs a ___ blank"), answer: z.enum(["past", "participle"]), vi: nonEmpty }))
    .min(2),
});

const base = { level: levelSchema, topic: z.string().optional(), sort: z.number().int().default(0) };

const wordItemSchema = z.object({ ...base, id: idOf("word"), kind: z.literal("word"), body: wordBodySchema });
const sentenceItemSchema = z.object({ ...base, id: idOf("sentence"), kind: z.literal("sentence"), body: sentenceBodySchema });

/**
 * A specialized vocabulary set (feature 012). `wordIds` is the learning
 * order. In source files `words` and `sentences` are empty; publish fills
 * them with the set's words and every example of those words, so the app
 * loads a whole set in one request.
 */
export const setBodySchema = z.object({
  titleVi: nonEmpty,
  titleEn: nonEmpty,
  descriptionVi: nonEmpty,
  wordIds: z
    .array(idOf("word"))
    .min(1)
    .refine((ids) => new Set(ids).size === ids.length, { message: "word ids must be unique" }),
  words: z.array(wordItemSchema).default([]),
  sentences: z.array(sentenceItemSchema).default([]),
});

export const contentItemSchema = z.discriminatedUnion("kind", [
  wordItemSchema,
  z.object({ ...base, id: idOf("grammar"), kind: z.literal("grammar"), body: grammarBodySchema }),
  sentenceItemSchema,
  z.object({ ...base, id: idOf("writing"), kind: z.literal("writing"), body: writingBodySchema }),
  z.object({ ...base, id: idOf("placement"), kind: z.literal("placement"), body: placementBodySchema }),
  z.object({ ...base, id: idOf("forms"), kind: z.literal("forms"), body: formsBodySchema }),
  z.object({ ...base, id: idOf("set"), kind: z.literal("set"), body: setBodySchema }),
]);
export type ContentItem = z.infer<typeof contentItemSchema>;
export type ContentItemOf<K extends ContentKind> = Extract<ContentItem, { kind: K }>;

// Only approved items are published (AC-053).
export const reviewStatusSchema = z.enum(["draft", "approved"]);
// `reviewNotes` are hints for the owner's review (e.g. "check the IPA"); never published.
export const sourceItemSchema = z.intersection(
  contentItemSchema,
  z.object({ status: reviewStatusSchema, reviewNotes: z.array(z.string()).optional() }),
);
export type SourceItem = z.infer<typeof sourceItemSchema>;
