// Test-only builders for content items used by the exercise tests.
import type { Level } from "../types";
import type { GrammarItem, SentenceItem, WordItem } from "./types";

type WordBody = WordItem["body"];

export function word(
  slug: string,
  body: Partial<WordBody> = {},
  level: Level = "A1",
): WordItem {
  return {
    id: `word:${slug}`,
    kind: "word",
    level,
    sort: 0,
    body: {
      headword: slug.replace(/-/g, " "),
      variants: [],
      pos: "noun",
      ipa: "",
      meaningsVi: [`nghĩa ${slug}`],
      examples: ["sentence:x"],
      synonyms: [],
      audio: "",
      source: "cefrj-1.5",
      ...body,
    },
  };
}

export function sentence(slug: string, body: Partial<SentenceItem["body"]> & { tokens: string[] }): SentenceItem {
  return {
    id: `sentence:${slug}`,
    kind: "sentence",
    level: "A1",
    sort: 0,
    body: {
      en: body.tokens.join(" "),
      vi: `câu ${slug}`,
      audio: "",
      acceptedOrders: [body.tokens.map((_, i) => i)],
      wrongVariants: [],
      gapCandidates: [],
      wordIds: [],
      ...body,
    },
  };
}

export function grammar(slug: string, practice: GrammarItem["body"]["practice"]): GrammarItem {
  return {
    id: `grammar:${slug}`,
    kind: "grammar",
    level: "A1",
    sort: 0,
    body: {
      titleEn: slug,
      titleVi: slug,
      ruleVi: "quy tắc",
      pattern: [{ form: "affirmative", en: "S + V" }],
      usageVi: ["cách dùng"],
      signalWords: [],
      mistakes: [],
      examples: ["sentence:x"],
      practice,
    },
  };
}
