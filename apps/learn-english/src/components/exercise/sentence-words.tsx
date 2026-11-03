"use client";

import { useMemo, useState } from "react";
import type { ContentItemOf } from "@/content/schema";
import { levelsFor, useContentIndex } from "@/hooks/use-content-index";
import { useProfile } from "@/hooks/use-profile";
import { buildWordFinder } from "@/learning/sentence-words";
import { useCardIds } from "@/components/library/use-card-ids";
import { WordDialog } from "@/components/vocabulary/word-dialog";
import { lookupWord } from "@/components/vocabulary/word-lookup";
import { cn } from "@/lib/utils";

const CHIP = "min-h-11 rounded-lg border bg-card px-3 text-lg shadow-xs";

/**
 * A sentence as word chips, like the word-order tiles; a word the course knows opens
 * the word dialog (quick task 037). Words come from the levels the learner's lessons load.
 */
export function SentenceWords({ tokens, wordIds }: { tokens: readonly string[]; wordIds: readonly string[] }) {
  const profile = useProfile();
  const level = profile.status === "ready" ? profile.data.level : profile.status === "error" ? "A1" : null;
  const levels = useMemo(() => (level ? levelsFor(level) : null), [level]);
  const content = useContentIndex(levels);
  const index = content.status === "ready" ? content.index : null;
  const { ids: cardIds, reload: reloadCards } = useCardIds();
  const [openId, setOpenId] = useState<string | null>(null);

  const matched = useMemo(() => {
    if (!index) return tokens.map(() => null);
    const words = [...index.byId.values()].filter((item): item is ContentItemOf<"word"> => item.kind === "word");
    const find = buildWordFinder(words, index.forms);
    return tokens.map((token) => find(token, wordIds));
  }, [index, tokens, wordIds]);

  return (
    <>
      <div className="flex flex-wrap gap-2" lang="en">
        {tokens.map((token, i) => {
          const id = matched[i];
          return id ? (
            <button key={i} type="button" onClick={() => setOpenId(id)} className={cn(CHIP, "hover:bg-muted")} aria-label={`${token}: xem nghĩa`}>
              {token}
            </button>
          ) : (
            <span key={i} className={cn(CHIP, "inline-flex items-center")}>
              {token}
            </span>
          );
        })}
      </div>
      <WordDialog
        open={openId !== null}
        lookup={openId ? lookupWord(openId, [index], false) : { status: "loading" }}
        learned={Boolean(openId && cardIds?.has(openId))}
        onClose={() => setOpenId(null)}
        onLearned={reloadCards}
      />
    </>
  );
}
