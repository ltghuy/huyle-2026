"use client";

import { useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCheck, Lightbulb } from "lucide-react";
import { hintWithAi } from "@/ai-grading/gemini-client";
import { HINTS_PER_RUN, type TranslateAnswer, type TranslateHint, type TranslateInstance } from "@/learning/exercises/translate";
import { hasUsableAiKey, subscribeAiKeys } from "@/lib/ai-keys";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EnglishInput } from "./english-input";
import { CorrectSentence } from "./sentence-exercises";
import type { ExerciseViewProps } from "./types";

/** Shown on the spent "Gợi ý" button (AC-009). */
export const NO_HINTS_LEFT = `Bạn đã dùng hết ${HINTS_PER_RUN} lượt gợi ý của bài này. Hãy thử tự dịch: sau khi Kiểm tra, bạn sẽ thấy đáp án và cách hiểu từng từ.`;

/** A sentence's AI hints stay for the visit: pressing "Gợi ý" on it again asks Google nothing. */
const HINT_CACHE_MS = 30 * 60 * 1000;

function aiKeySnapshot(): boolean {
  return hasUsableAiKey();
}

function noAiKeyOnServer(): boolean {
  return false;
}

/**
 * Dịch câu (feature 016): read the Vietnamese, type the English; a wrong answer can be claimed as also correct.
 * "Gợi ý" shows the sentence's words and grammar, the grammar hints from the learner's AI key, and marks the
 * answer hinted (feature 043).
 */
export function TranslateView({ instance, answer, onAnswer, result, onClaim, checking = false, hintsLeft = HINTS_PER_RUN, onHint }: ExerciseViewProps<TranslateInstance, TranslateAnswer>) {
  const [text, setText] = useState(answer?.text ?? "");
  const [hinted, setHinted] = useState(answer?.hinted ?? false);
  const hasKey = useSyncExternalStore(subscribeAiKeys, aiKeySnapshot, noAiKeyOnServer);
  const hint = instance.hint;
  const canHint = hint !== undefined && (hasKey || hint.words.length > 0 || hint.grammar !== undefined);

  function handleChange(value: string) {
    setText(value);
    onAnswer(value.trim() ? { text: value, ...(hinted ? { hinted } : {}) } : null);
  }

  function handleHint() {
    setHinted(true);
    onHint?.();
    if (text.trim()) onAnswer({ text, hinted: true });
  }

  return (
    <div className="grid gap-6">
      <h2 className="text-lg font-medium text-muted-foreground">Dịch câu sau sang tiếng Anh</h2>
      <p className="text-xl">{instance.vi}</p>
      <EnglishInput aria-label="Câu tiếng Anh của bạn" value={text} onChange={(event) => handleChange(event.target.value)} disabled={result !== null || checking} />
      {!result && hint && canHint ? (
        hinted ? (
          <HintPanel hint={hint} instance={instance} hasKey={hasKey} />
        ) : hintsLeft > 0 ? (
          <Button type="button" variant="ghost" className="h-11 justify-self-center" onClick={handleHint} disabled={checking}>
            <Lightbulb aria-hidden /> Gợi ý <span className="text-muted-foreground tabular-nums">· còn {hintsLeft}</span>
          </Button>
        ) : (
          <SpentHintButton />
        )
      ) : null}
      {result ? (
        <div className="grid gap-4">
          {!result.correct || result.claimed || result.aiGraded ? (
            <p className="text-muted-foreground">
              Câu của bạn:{" "}
              <span className="font-medium text-foreground" lang="en">
                {text.trim()}
              </span>
            </p>
          ) : null}
          <CorrectSentence en={instance.en} vi={instance.vi} audio={instance.audio} words={instance} />
          {onClaim ? (
            <Button type="button" variant="outline" size="lg" className="h-12" onClick={onClaim}>
              <CheckCheck aria-hidden /> Câu của mình cũng đúng
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The "Gợi ý" button once the run's hints are used (AC-009): it looks disabled but stays focusable, so the
 * tooltip opens on hover, keyboard focus and tap (phones have no hover).
 */
function SpentHintButton() {
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger
        render={
          <Button type="button" variant="ghost" aria-disabled="true" className="h-11 justify-self-center opacity-50 hover:bg-transparent" />
        }
        onClick={() => setOpen(true)}
      >
        <Lightbulb aria-hidden /> Gợi ý <span className="tabular-nums">· hết lượt</span>
      </TooltipTrigger>
      <TooltipContent className="max-w-72 text-center">{NO_HINTS_LEFT}</TooltipContent>
    </Tooltip>
  );
}

interface HintPanelProps {
  hint: TranslateHint;
  instance: Pick<TranslateInstance, "sentenceId" | "vi" | "en">;
  hasKey: boolean;
}

/** "Từ vựng" from the content, "Ngữ pháp" from the grammar lesson and the AI (feature 043, AC-002, AC-006 to AC-008). */
function HintPanel({ hint, instance, hasKey }: HintPanelProps) {
  return (
    <section aria-label="Gợi ý" className="grid gap-3 rounded-xl bg-muted p-4">
      {hint.words.length > 0 ? (
        <div className="grid gap-1">
          <h3 className="text-sm font-medium text-muted-foreground">Từ vựng</h3>
          <ul className="grid gap-1">
            {hint.words.map((word) => (
              <li key={`${word.headword}-${word.pos}`}>
                <span className="font-semibold" lang="en">
                  {word.headword}
                </span>{" "}
                <span className="text-sm text-muted-foreground" lang="en">
                  ({word.pos})
                </span>
                : {word.meaningsVi.join("; ")}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="grid gap-1">
        <h3 className="text-sm font-medium text-muted-foreground">Ngữ pháp</h3>
        {hint.grammar ? (
          <p>
            Bài liên quan: <span lang="en">{hint.grammar.titleEn}</span> ({hint.grammar.titleVi})
          </p>
        ) : null}
        {hasKey ? (
          <AiGrammarHints instance={instance} />
        ) : (
          <p className="text-sm text-muted-foreground">Thêm khóa Google AI trong Cài đặt để nhận gợi ý ngữ pháp (thì, cấu trúc câu) cho từng câu.</p>
        )}
      </div>
    </section>
  );
}

/** Asks the learner's AI key once per sentence, only after "Gợi ý" (AC-006, AC-008). */
function AiGrammarHints({ instance }: { instance: HintPanelProps["instance"] }) {
  const hints = useQuery({
    queryKey: ["translate-hint", instance.sentenceId],
    queryFn: ({ signal }) => hintWithAi({ vi: instance.vi, en: instance.en }, signal),
    staleTime: Infinity,
    gcTime: HINT_CACHE_MS,
    retry: false,
  });

  if (hints.isPending) {
    return (
      <div className="grid gap-2" aria-busy="true" aria-label="Đang lấy gợi ý ngữ pháp">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    );
  }
  if (!hints.data) return <p className="text-sm text-muted-foreground">Lúc này chưa lấy được gợi ý ngữ pháp từ AI.</p>;
  return (
    <ul className="grid list-disc gap-1 pl-5" aria-live="polite">
      {hints.data.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
