import type { ContentItemOf } from "@/content/schema";
import { formsIdOf } from "@/learning/verbs";
import type { ContentIndex } from "@/lib/session/content-index";
import type { WordLookup } from "./word-dialog";

type Word = ContentItemOf<"word">;

/** The first set's name for a specialized word (AC-004); undefined for course words. */
function specializedSetTitle(index: ContentIndex, word: Word): string | undefined {
  if (word.body.source !== "specialized") return undefined;
  const first = index.byId.get(index.setsByWord.get(word.id)?.[0] ?? "");
  return first?.kind === "set" ? first.body.titleVi : undefined;
}

/** What the word dialog shows for `id`: the word with its examples and irregular forms, from the first index that has it. */
export function lookupWord(id: string, indexes: readonly (ContentIndex | null)[], stillLoading: boolean): WordLookup {
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
