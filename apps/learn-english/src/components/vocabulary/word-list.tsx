"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { ContentItemOf } from "@/content/schema";
import { withParams } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Word = ContentItemOf<"word">;

/** Words rendered per chunk; long lists grow with "Xem thêm". */
const CHUNK = 60;

interface WordListProps {
  words: readonly Word[];
  learned: ReadonlySet<string>;
  /** The page's query string; each card links to it plus `word`. */
  search: string;
  onOpen: () => void;
  /** A tag per card: the level, or the set's name for a specialized word (feature 012). */
  labelOf?: (word: Word) => string;
}

/** Word cards of a level or a vocabulary set, with learned markers. */
export function WordList({ words, learned, search, onOpen, labelOf }: WordListProps) {
  const [limit, setLimit] = useState(CHUNK);
  const visible = words.slice(0, limit);
  return (
    <section aria-label="Danh sách từ" className="grid gap-4">
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((word) => (
          <li key={word.id} className="[contain-intrinsic-size:auto_6rem] [content-visibility:auto]">
            <WordCard
              word={word}
              learned={learned.has(word.id)}
              label={labelOf?.(word)}
              href={`/vocabulary${withParams(search, { word: word.id })}`}
              onOpen={onOpen}
            />
          </li>
        ))}
      </ul>
      {words.length > limit ? (
        <Button variant="outline" className="h-11 justify-self-center px-6" onClick={() => setLimit((value) => value + CHUNK)}>
          Xem thêm {Math.min(CHUNK, words.length - limit)} từ
        </Button>
      ) : null}
    </section>
  );
}

function WordCard({ word, learned, label, href, onOpen }: { word: Word; learned: boolean; label?: string; href: string; onOpen: () => void }) {
  const { body } = word;
  return (
    <Link
      href={href}
      scroll={false}
      onClick={onOpen}
      className={cn(
        "flex min-h-24 flex-col gap-1 rounded-xl border bg-card p-4 transition-colors outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50",
        learned && "border-success/40",
      )}
    >
      <span className="flex items-start gap-2">
        <span className="min-w-0 flex-1 text-xl font-semibold break-words" lang="en">
          {body.headword}
        </span>
        {learned ? (
          <Badge variant="secondary" className="shrink-0">
            <CheckCircle2 className="text-success" aria-hidden /> Đã học
          </Badge>
        ) : null}
      </span>
      <span className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="min-w-0 flex-1">
          {body.ipa ? <span className="ipa">{body.ipa}</span> : null}
          {body.ipa ? " · " : null}
          <span lang="en">{body.pos}</span>
        </span>
        {label ? (
          <Badge variant="outline" className="max-w-[50%] shrink-0 truncate">
            {label}
          </Badge>
        ) : null}
      </span>
      <span className="line-clamp-1">{body.meaningsVi[0]}</span>
    </Link>
  );
}
