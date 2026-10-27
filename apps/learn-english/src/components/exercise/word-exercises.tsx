"use client";

import { useMemo, useState } from "react";
import type { GrammarGapInstance } from "@/learning/exercises/grammar-gap";
import type { ListeningChoiceInstance, ListeningTypingInstance } from "@/learning/exercises/listening";
import type { McqInstance } from "@/learning/exercises/mcq";
import { letterChoices, type MissingLettersInstance } from "@/learning/exercises/missing-letters";
import type { RecallInstance } from "@/learning/exercises/recall";
import { cn } from "@/lib/utils";
import { AudioButton } from "./audio-button";
import { EnglishInput } from "./english-input";
import { OptionList } from "./option-list";
import type { ExerciseViewProps } from "./types";

function Prompt({ children, lang }: { children: React.ReactNode; lang?: "en" | "vi" }) {
  return (
    <p className={cn("text-center font-semibold", lang === "en" ? "text-3xl" : "text-2xl")} lang={lang}>
      {children}
    </p>
  );
}

function Instruction({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-medium text-muted-foreground">{children}</h2>;
}

export function McqView({ instance, answer, onAnswer, result }: ExerciseViewProps<McqInstance, number>) {
  const toVietnamese = instance.direction === "en-vi";
  return (
    <div className="grid gap-6">
      <Instruction>{toVietnamese ? "Chọn nghĩa đúng của từ" : "Chọn từ tiếng Anh đúng"}</Instruction>
      <Prompt lang={toVietnamese ? "en" : "vi"}>{instance.prompt}</Prompt>
      <OptionList
        label="Các lựa chọn"
        options={instance.options.map((option) => option.text)}
        selected={answer}
        onSelect={onAnswer}
        answerIndex={result ? instance.answerIndex : undefined}
        lang={toVietnamese ? "vi" : "en"}
      />
    </div>
  );
}

export function ListeningChoiceView({ instance, answer, onAnswer, result, onAudioError }: ExerciseViewProps<ListeningChoiceInstance, number>) {
  return (
    <div className="grid gap-6">
      <Instruction>Nghe và chọn từ bạn nghe được</Instruction>
      <div className="flex justify-center">
        <AudioButton source="word" audioKey={instance.audio} label="từ cần nghe" size="lg" onError={onAudioError} />
      </div>
      <OptionList
        label="Các lựa chọn"
        options={instance.options}
        selected={answer}
        onSelect={onAnswer}
        answerIndex={result ? instance.answerIndex : undefined}
        lang="en"
      />
    </div>
  );
}

export function ListeningTypingView({ instance, answer, onAnswer, result, onAudioError }: ExerciseViewProps<ListeningTypingInstance, string>) {
  return (
    <div className="grid gap-6">
      <Instruction>Nghe và gõ lại từ</Instruction>
      <div className="flex justify-center">
        <AudioButton source="word" audioKey={instance.audio} label="từ cần nghe" size="lg" onError={onAudioError} />
      </div>
      <EnglishInput
        aria-label="Từ bạn nghe được"
        value={answer ?? ""}
        onChange={(event) => onAnswer(event.target.value.trim() ? event.target.value : null)}
        disabled={result !== null}
      />
    </div>
  );
}

export function RecallView({ instance, answer, onAnswer, result }: ExerciseViewProps<RecallInstance, string>) {
  return (
    <div className="grid gap-6">
      <Instruction>Gõ từ tiếng Anh có nghĩa là</Instruction>
      <Prompt lang="vi">{instance.meaningsVi.join("; ")}</Prompt>
      <p className="text-center text-sm text-muted-foreground" lang="en">
        ({instance.pos})
      </p>
      <EnglishInput
        aria-label="Từ tiếng Anh"
        value={answer ?? ""}
        onChange={(event) => onAnswer(event.target.value.trim() ? event.target.value : null)}
        disabled={result !== null}
      />
    </div>
  );
}

export function GrammarGapView({ instance, answer, onAnswer, result }: ExerciseViewProps<GrammarGapInstance, number | string>) {
  return (
    <div className="grid gap-6">
      <Instruction>Điền vào chỗ trống</Instruction>
      <Prompt lang="en">{instance.prompt}</Prompt>
      {instance.mode === "choice" ? (
        <OptionList
          label="Các lựa chọn"
          options={instance.options}
          selected={typeof answer === "number" ? answer : null}
          onSelect={onAnswer}
          answerIndex={result ? instance.answerIndex : undefined}
          lang="en"
        />
      ) : (
        <EnglishInput
          aria-label="Đáp án"
          value={typeof answer === "string" ? answer : ""}
          onChange={(event) => onAnswer(event.target.value.trim() ? event.target.value : null)}
          disabled={result !== null}
        />
      )}
    </div>
  );
}

/**
 * Fill the blanks by tapping letter tiles: Vietnamese Telex typing can swallow
 * letters (s, f, r, x, j become tone marks), so tiles are the main input.
 */
export function MissingLettersView({ instance, onAnswer, result, seed }: ExerciseViewProps<MissingLettersInstance, string[]>) {
  const tiles = useMemo(() => letterChoices(instance, seed), [instance, seed]);
  // Which tile fills each blank (index into `tiles`), left to right.
  const [filled, setFilled] = useState<(number | null)[]>(() => instance.answer.map(() => null));
  const locked = result !== null;

  function update(next: (number | null)[]) {
    setFilled(next);
    onAnswer(next.every((tile) => tile !== null) ? next.map((tile) => tiles[tile!]) : null);
  }

  function handleTile(tileIndex: number) {
    const slot = filled.indexOf(null);
    if (slot === -1 || filled.includes(tileIndex)) return;
    update(filled.map((value, i) => (i === slot ? tileIndex : value)));
  }

  function handleClearSlot(slot: number) {
    update(filled.map((value, i) => (i === slot ? null : value)));
  }

  let blank = -1;
  return (
    <div className="grid gap-6">
      <Instruction>Điền chữ cái còn thiếu</Instruction>
      <p className="text-center text-xl" lang="vi">
        {instance.meaningsVi.join("; ")}
      </p>
      <div className="flex justify-center">
        <AudioButton source="word" audioKey={instance.audio} label="từ cần điền" />
      </div>
      <div className="flex flex-wrap justify-center gap-1.5" lang="en" aria-label="Từ cần điền">
        {instance.cells.map((cell, i) => {
          if (!cell.hidden) {
            return (
              <span key={i} className="flex h-14 w-10 items-center justify-center text-3xl font-semibold">
                {cell.char}
              </span>
            );
          }
          blank++;
          const slot = blank;
          const tile = filled[slot];
          return (
            <button
              key={i}
              type="button"
              disabled={locked || tile === null}
              onClick={() => handleClearSlot(slot)}
              aria-label={tile === null ? `Ô trống ${slot + 1}` : `Ô ${slot + 1}: ${tiles[tile]}, bấm để xóa`}
              className={cn(
                "flex h-14 w-10 items-center justify-center rounded-lg border-2 border-dashed text-3xl font-semibold",
                tile !== null && "border-solid border-primary",
                locked && (result?.correct ? "border-success text-success" : "border-destructive text-destructive"),
              )}
            >
              {tile === null ? "" : tiles[tile]}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-2" aria-label="Chữ cái để chọn">
        {tiles.map((letter, index) => (
          <button
            key={index}
            type="button"
            disabled={locked || filled.includes(index)}
            onClick={() => handleTile(index)}
            className="flex size-12 items-center justify-center rounded-lg border bg-card text-xl font-semibold shadow-xs hover:bg-muted disabled:opacity-30"
            lang="en"
          >
            {letter}
          </button>
        ))}
      </div>
    </div>
  );
}
