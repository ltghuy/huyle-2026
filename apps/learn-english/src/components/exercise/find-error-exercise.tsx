"use client";

import { ArrowRight, CircleAlert, XCircle } from "lucide-react";
import { PART_LETTERS, type FindErrorInstance } from "@/learning/exercises/find-error";
import { cn } from "@/lib/utils";
import { OptionList } from "./option-list";
import { CorrectSentence } from "./sentence-exercises";
import type { ExerciseViewProps } from "./types";

function Instruction({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-medium text-muted-foreground">{children}</h2>;
}

/**
 * The wrong sentence with its four parts underlined and lettered. Once
 * checked, the error and a wrong pick are marked with an icon and words,
 * never colour alone (AC-008).
 */
function UnderlinedSentence({ instance, selected, checked }: { instance: FindErrorInstance; selected: number | null; checked: boolean }) {
  return (
    <p className="text-2xl leading-loose" lang="en">
      {instance.segments.map((segment, i) => {
        if (segment.part === undefined) return <span key={i}>{segment.text}</span>;
        const isError = checked && segment.part === instance.answerIndex;
        const isWrongPick = checked && segment.part === selected && !isError;
        // Exam style: the letter sits centred under its part, outside the
        // underline (a child can't opt out of its parent's underline).
        return (
          <span key={i} className="inline-flex flex-col items-center">
            <span
              className={cn(
                "rounded-sm underline decoration-2 underline-offset-6",
                isError && "bg-destructive/15 decoration-destructive",
                isWrongPick && "bg-muted decoration-dashed",
              )}
            >
              {segment.text}
            </span>
            <span className="mt-1 text-xs leading-none font-semibold text-muted-foreground">
              {PART_LETTERS[segment.part]}
              {isError ? <span className="sr-only">, phần sai</span> : null}
              {isWrongPick ? <span className="sr-only">, bạn đã chọn</span> : null}
            </span>
          </span>
        );
      })}
    </p>
  );
}

/** The error, its replacement and why (AC-005 to AC-007). */
function Correction({ instance, selected }: { instance: FindErrorInstance; selected: number | null }) {
  const pickedWrong = selected !== null && selected !== instance.answerIndex;
  return (
    <div role="group" aria-label="Giải thích lỗi sai" className="grid gap-2 rounded-xl border bg-card p-4 motion-safe:animate-in motion-safe:fade-in">
      {pickedWrong ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <XCircle className="size-4 shrink-0" aria-hidden />
          <span>
            Bạn chọn ({PART_LETTERS[selected]}) <span lang="en">{instance.parts[selected]}</span>, phần này đúng.
          </span>
        </p>
      ) : null}
      <p className="flex flex-wrap items-center gap-2">
        <CircleAlert className="size-5 shrink-0 text-destructive" aria-hidden />
        <span className="font-medium">Phần sai ({PART_LETTERS[instance.answerIndex]}):</span>
        <span lang="en" className="line-through decoration-destructive decoration-2">
          {instance.parts[instance.answerIndex]}
        </span>
        <ArrowRight className="size-4 shrink-0" aria-label="sửa thành" />
        <span lang="en" className="font-semibold text-success">
          {instance.correction}
        </span>
      </p>
      <p className="text-muted-foreground">{instance.explanationVi}</p>
    </div>
  );
}

/** Tìm lỗi sai (feature 011): pick the underlined part that is wrong. */
export function FindErrorView({ instance, answer, onAnswer, result }: ExerciseViewProps<FindErrorInstance, number>) {
  const checked = result !== null;
  return (
    <div className="grid gap-6">
      <Instruction>Chọn phần sai trong câu</Instruction>
      <UnderlinedSentence instance={instance} selected={answer} checked={checked} />
      <OptionList
        label="Các phần được gạch chân"
        options={instance.parts}
        selected={answer}
        onSelect={onAnswer}
        answerIndex={checked ? instance.answerIndex : undefined}
        lang="en"
        marks="letters"
      />
      {checked ? (
        <>
          <Correction instance={instance} selected={answer} />
          <CorrectSentence en={instance.en} vi={instance.vi} audio={instance.audio} />
        </>
      ) : null}
    </div>
  );
}
