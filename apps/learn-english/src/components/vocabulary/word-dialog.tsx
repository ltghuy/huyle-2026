"use client";

import { useState } from "react";
import { CheckCircle2, Plus, SearchX } from "lucide-react";
import { toast } from "sonner";
import type { ContentItemOf } from "@/content/schema";
import { newCard } from "@/learning/srs";
import type { CardItemId } from "@/learning/types";
import { putCards } from "@/storage/cards";
import { AudioButton } from "@/components/exercise/audio-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type Word = ContentItemOf<"word">;
type Sentence = ContentItemOf<"sentence">;

export type WordLookup = { status: "loading" } | { status: "missing" } | { status: "found"; word: Word; examples: Sentence[] };

interface WordDialogProps {
  open: boolean;
  lookup: WordLookup;
  learned: boolean;
  onClose: () => void;
  /** After a card was created, so the caller can refresh its learned markers. */
  onLearned: () => void;
}

/** Word details, opened from the list or a `?word=word:…` link (AC-007–AC-009). */
export function WordDialog({ open, lookup, learned, onClose, onLearned }: WordDialogProps) {
  function handleOpenChange(next: boolean) {
    if (!next) onClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-h-[calc(100svh-2rem)] gap-5 overflow-y-auto p-5 sm:max-w-lg">
        {lookup.status === "found" ? (
          <WordDetails word={lookup.word} examples={lookup.examples} learned={learned} onLearned={onLearned} />
        ) : lookup.status === "missing" ? (
          <DialogHeader className="items-center py-6 text-center">
            <SearchX className="size-8 text-muted-foreground" aria-hidden />
            <DialogTitle>Không tìm thấy từ này</DialogTitle>
            <DialogDescription>Có thể từ đã được gỡ khỏi khóa học. Bạn chọn một từ khác trong danh sách nhé.</DialogDescription>
          </DialogHeader>
        ) : (
          <div className="grid gap-3" aria-busy="true">
            <DialogTitle className="sr-only">Đang tải từ vựng</DialogTitle>
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-24" />
          </div>
        )}
        <DialogClose render={<Button variant="outline" className="h-11 w-full" />}>Đóng</DialogClose>
      </DialogContent>
    </Dialog>
  );
}

function WordDetails({ word, examples, learned, onLearned }: { word: Word; examples: Sentence[]; learned: boolean; onLearned: () => void }) {
  const { body } = word;
  const [saving, setSaving] = useState(false);

  async function handleMarkLearned() {
    setSaving(true);
    try {
      await putCards([newCard(word.id as CardItemId, Date.now())]);
      onLearned();
      toast.success("Đã thêm từ vào lịch Ôn tập.");
    } catch {
      toast.error("Chưa lưu được. Bạn thử lại nhé.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader className="gap-1">
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-3xl leading-tight font-semibold break-words" lang="en">
              {body.headword}
            </DialogTitle>
            <DialogDescription className="mt-1 text-base">
              {body.ipa ? <span className="ipa">{body.ipa}</span> : null}
              {body.ipa ? " · " : null}
              <span lang="en">{body.pos}</span>
            </DialogDescription>
          </div>
          <AudioButton source="word" audioKey={body.audio} label={body.headword} size="lg" />
        </div>
        {learned ? (
          <Badge variant="secondary" className="mt-2">
            <CheckCircle2 className="text-success" aria-hidden /> Đã học
          </Badge>
        ) : null}
      </DialogHeader>

      <section aria-labelledby="word-meanings" className="grid gap-2">
        <h3 id="word-meanings" className="text-sm font-medium text-muted-foreground">
          Nghĩa
        </h3>
        <ol className="grid list-decimal gap-1 pl-5 text-lg">
          {body.meaningsVi.map((meaning) => (
            <li key={meaning}>{meaning}</li>
          ))}
        </ol>
      </section>

      {examples.length > 0 ? (
        <section aria-labelledby="word-examples" className="grid gap-2">
          <h3 id="word-examples" className="text-sm font-medium text-muted-foreground">
            Ví dụ
          </h3>
          {examples.map((example) => (
            <div key={example.id} className="flex items-start gap-3 rounded-xl bg-muted p-3">
              <div className="min-w-0 flex-1">
                <p className="text-lg" lang="en">
                  {example.body.en}
                </p>
                <p className="mt-1 text-muted-foreground">{example.body.vi}</p>
              </div>
              <AudioButton source="sentence" audioKey={example.body.audio} label={example.body.en} className="size-11" />
            </div>
          ))}
        </section>
      ) : null}

      {learned ? (
        <p className="flex items-center justify-center gap-2 rounded-lg bg-success/10 px-3 py-3 text-sm">
          <CheckCircle2 className="size-5 text-success" aria-hidden /> Từ này đã có trong lịch Ôn tập của bạn.
        </p>
      ) : (
        <Button size="lg" className="h-12 w-full text-base" onClick={handleMarkLearned} disabled={saving}>
          <Plus aria-hidden /> Đánh dấu đã học
        </Button>
      )}
    </>
  );
}
