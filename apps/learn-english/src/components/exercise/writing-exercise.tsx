"use client";

import { useState, useSyncExternalStore } from "react";
import { CheckCircle2, CircleAlert, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { needsCorrection, WRITING_AREAS, type WritingArea, type WritingReview } from "@/learning/exercises/writing-ai";
import type { Level } from "@/learning/types";
import { hasUsableAiKey, subscribeAiKeys } from "@/lib/ai-keys";
import { cn } from "@/lib/utils";
import type { ExerciseViewProps } from "./types";

// "Bài viết" (feature 001, AI review in feature 036). With a usable Google AI key the
// learner writes and presses "Kiểm tra": the AI reviews grammar, vocabulary and meaning
// and corrects the paragraph. Without one, or when no key can answer, it is the
// self-check: write, compare with the sample answers, then mark yourself.

export interface WritingInstance {
  kind: "writing";
  writingId: string;
  level: Level;
  promptVi: string;
  modelAnswers: string[];
}

/** "ai": written for the AI review. "self": the learner's own mark after reading the samples. */
export type WritingAnswer = { mode: "ai"; text: string } | { mode: "self"; text: string; correct: boolean };

export const AREA_LABELS: Record<WritingArea, string> = {
  grammar: "Ngữ pháp",
  vocabulary: "Từ vựng",
  meaning: "Ý nghĩa",
};

export const AI_FALLBACK_NOTICE = "Lúc này chưa chấm bằng AI được, bạn tự so với bài mẫu nhé.";

function aiKeySnapshot(): boolean {
  return hasUsableAiKey();
}

function noAiKeyOnServer(): boolean {
  return false;
}

function ModelAnswers({ models }: { models: readonly string[] }) {
  return (
    <div className="grid gap-2">
      <p className="font-medium">Bài mẫu</p>
      {models.map((model) => (
        <p key={model} className="rounded-xl bg-muted p-4 text-lg" lang="en">
          {model}
        </p>
      ))}
    </div>
  );
}

/** The AI's notes on the three areas, the corrected paragraph, then the samples (AC-003). */
function ReviewDetails({ review, text, models }: { review: WritingReview; text: string; models: readonly string[] }) {
  return (
    <section aria-label="Nhận xét của AI" className="grid gap-4">
      <ul className="grid gap-2">
        {WRITING_AREAS.map((area) => {
          const note = review[area];
          const Icon = note.ok ? CheckCircle2 : CircleAlert;
          return (
            <li key={area} className="flex gap-3 rounded-xl border p-3">
              <Icon aria-hidden className={cn("mt-0.5 size-5 shrink-0", note.ok ? "text-success" : "text-warning")} />
              <div className="grid gap-0.5">
                <p className="font-medium">
                  {AREA_LABELS[area]} <span className="sr-only">{note.ok ? ": tốt" : ": cần sửa"}</span>
                </p>
                <p className="text-sm text-muted-foreground">{note.noteVi}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="grid gap-2">
        <p className="font-medium">Bài đã sửa</p>
        {needsCorrection(text, review) ? (
          <p className="rounded-xl border-2 border-success/40 bg-success/10 p-4 text-lg" lang="en">
            {review.correctedEn}
          </p>
        ) : (
          <p className="text-muted-foreground">Bài của bạn không cần sửa gì.</p>
        )}
      </div>
      <ModelAnswers models={models} />
    </section>
  );
}

export function WritingView({ instance, onAnswer, result, checking, aiUnavailable }: ExerciseViewProps<WritingInstance, WritingAnswer>) {
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [mark, setMark] = useState<boolean | null>(null);
  const hasKey = useSyncExternalStore(subscribeAiKeys, aiKeySnapshot, noAiKeyOnServer);
  const aiMode = hasKey && !aiUnavailable;
  const review = result?.writingReview;

  function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(event.target.value);
    // For the AI, the paragraph is the answer: "Kiểm tra" opens once something is written (AC-001).
    if (aiMode) onAnswer(event.target.value.trim() ? { mode: "ai", text: event.target.value } : null);
  }

  function handleMark(correct: boolean) {
    setMark(correct);
    onAnswer({ mode: "self", text, correct });
  }

  return (
    <div className="grid gap-6">
      <h2 className="text-lg font-medium text-muted-foreground">Bài viết</h2>
      <p className="text-xl">{instance.promptVi}</p>
      <Textarea
        lang="en"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="sentences"
        aria-label="Bài viết của bạn"
        value={text}
        onChange={handleChange}
        disabled={revealed || checking || result !== null}
        className="min-h-36 text-lg"
      />
      {review ? (
        <ReviewDetails review={review} text={text} models={instance.modelAnswers} />
      ) : aiMode ? null : (
        <>
          {aiUnavailable ? (
            <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm">
              {AI_FALLBACK_NOTICE}
            </p>
          ) : null}
          {!revealed ? (
            <Button type="button" variant="secondary" size="lg" className="h-12" disabled={!text.trim()} onClick={() => setRevealed(true)}>
              Xem bài mẫu
            </Button>
          ) : (
            <div className="grid gap-4">
              <ModelAnswers models={instance.modelAnswers} />
              <div className="grid gap-2">
                <p className="font-medium">So với bài mẫu, bài của bạn thế nào?</p>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("h-12", mark === true && "border-success bg-success/10")}
                    aria-pressed={mark === true}
                    disabled={result !== null}
                    onClick={() => handleMark(true)}
                  >
                    <ThumbsUp aria-hidden /> Mình viết đúng
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("h-12", mark === false && "border-destructive bg-destructive/10")}
                    aria-pressed={mark === false}
                    disabled={result !== null}
                    onClick={() => handleMark(false)}
                  >
                    <ThumbsDown aria-hidden /> Còn lỗi
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function gradeWriting(instance: WritingInstance, answer: WritingAnswer) {
  // Only the self-check is graded here; an AI answer goes through the review (registry `aiReview`).
  return { correct: answer.mode === "self" && answer.correct, expected: instance.modelAnswers[0] ?? "" };
}
