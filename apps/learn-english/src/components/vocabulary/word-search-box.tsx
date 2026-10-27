"use client";

import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import type { ContentItemOf } from "@/content/schema";
import { useAllWords, type AllWordsState } from "@/hooks/use-all-words";
import { Badge } from "@/components/ui/badge";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { searchWords } from "./word-search";

type Word = ContentItemOf<"word">;

const NO_WORDS: readonly Word[] = [];

function headwordOf(word: Word): string {
  return word.body.headword;
}

function emptyMessage(status: AllWordsState["status"]): string {
  if (status === "error") return "Không tải được danh sách từ. Bạn kiểm tra kết nối rồi thử lại nhé.";
  if (status === "ready") return "Không tìm thấy từ nào.";
  return "Đang tải danh sách từ…";
}

/** Search box with suggestions from every level (feature 002, AC-001–AC-006). */
export function WordSearchBox({ onSelect }: { onSelect: (wordId: string) => void }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Words of every level download on first focus, not with the page.
  const [wanted, setWanted] = useState(false);
  const all = useAllWords(wanted);
  const words = all.status === "ready" ? all.words : NO_WORDS;
  const results = useMemo(() => searchWords(words, query), [words, query]);
  const hasQuery = query.trim() !== "";

  function handleFocus() {
    if (!wanted) setWanted(true);
    else if (all.status === "error") all.retry();
  }

  function handleValueChange(word: Word | null) {
    if (!word) return;
    setQuery("");
    setOpen(false);
    onSelect(word.id);
  }

  return (
    <Combobox<Word>
      items={results}
      filter={null}
      value={null}
      onValueChange={handleValueChange}
      inputValue={query}
      onInputValueChange={setQuery}
      open={open && hasQuery}
      onOpenChange={setOpen}
      itemToStringLabel={headwordOf}
      autoHighlight
    >
      <ComboboxInput
        type="search"
        aria-label="Tìm từ vựng ở mọi trình độ"
        placeholder="Tìm từ, ví dụ: action"
        autoComplete="off"
        spellCheck={false}
        showTrigger={false}
        onFocus={handleFocus}
        className="h-11 w-full md:max-w-md"
      >
        <InputGroupAddon align="inline-start">
          <SearchIcon aria-hidden />
        </InputGroupAddon>
      </ComboboxInput>
      <ComboboxContent>
        <ComboboxEmpty>{emptyMessage(all.status)}</ComboboxEmpty>
        <ComboboxList>
          {(word: Word) => (
            <ComboboxItem key={word.id} value={word} className="min-h-11 gap-3 px-2 py-1.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium" lang="en">
                  {word.body.headword}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  <span lang="en">{word.body.pos}</span> · {word.body.meaningsVi[0]}
                </span>
              </span>
              <Badge variant="outline" className="shrink-0 tabular-nums">
                {word.level}
              </Badge>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
