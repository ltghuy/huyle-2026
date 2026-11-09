"use client";

import { useState } from "react";
import type { ChooseSentenceInstance } from "@/learning/exercises/choose-sentence";
import type { SentenceGapInstance } from "@/learning/exercises/sentence-gap";
import type { Tile } from "@/learning/exercises/tiles";
import type { WordOrderInstance } from "@/learning/exercises/word-order";
import { AudioButton } from "./audio-button";
import { EnglishInput } from "./english-input";
import { OptionList } from "./option-list";
import { SentenceWords } from "./sentence-words";
import type { ExerciseViewProps } from "./types";

function Instruction({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-medium text-muted-foreground">{children}</h2>;
}

interface CorrectSentenceProps {
  en: string;
  vi: string;
  audio: string;
  /** Show the sentence as word chips that open each word's details (word order, quick task 037). */
  words?: { tokens: readonly string[]; wordIds: readonly string[] };
}

/** The correct sentence with its translation and audio, shown once the answer is checked. */
export function CorrectSentence({ en, vi, audio, words }: CorrectSentenceProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted p-4">
      <div className="min-w-0 flex-1">
        {words ? (
          <SentenceWords tokens={words.tokens} wordIds={words.wordIds} />
        ) : (
          <p className="text-lg font-medium" lang="en">
            {en}
          </p>
        )}
        <p className={words ? "mt-3 text-muted-foreground" : "mt-1 text-muted-foreground"}>{vi}</p>
      </div>
      <AudioButton source="sentence" audioKey={audio} label={en} />
    </div>
  );
}

/** Tap tiles to build the sentence; tap a placed tile to send it back. */
function TileBuilder({
  tiles,
  answer,
  onAnswer,
  locked,
  minToCheck,
}: {
  tiles: Tile[];
  answer: number[] | null;
  onAnswer: (answer: number[] | null) => void;
  locked: boolean;
  minToCheck: number;
}) {
  const [placed, setPlaced] = useState<number[]>(answer ?? []);
  const byId = new Map(tiles.map((tile) => [tile.id, tile]));

  function update(next: number[]) {
    setPlaced(next);
    onAnswer(next.length >= minToCheck ? next : null);
  }

  return (
    <div className="grid gap-4">
      <div
        aria-label="Câu của bạn"
        className="flex min-h-16 flex-wrap content-start gap-2 border-b-2 border-dashed pb-3"
        lang="en"
      >
        {placed.map((id) => (
          <button
            key={id}
            type="button"
            disabled={locked}
            onClick={() => update(placed.filter((placedId) => placedId !== id))}
            className="min-h-11 rounded-lg border bg-card px-3 text-lg shadow-xs hover:bg-muted"
          >
            {byId.get(id)?.text}
          </button>
        ))}
      </div>
      <div aria-label="Các từ để chọn" className="flex flex-wrap justify-center gap-2" lang="en">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            disabled={locked || placed.includes(tile.id)}
            onClick={() => update([...placed, tile.id])}
            className="min-h-11 rounded-lg border bg-card px-3 text-lg shadow-xs hover:bg-muted disabled:opacity-30"
          >
            {tile.text}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WordOrderView({ instance, answer, onAnswer, result }: ExerciseViewProps<WordOrderInstance, number[]>) {
  return (
    <div className="grid gap-6">
      <Instruction>Sắp xếp các từ thành câu đúng</Instruction>
      <p className="text-xl">{instance.vi}</p>
      <TileBuilder tiles={instance.tiles} answer={answer} onAnswer={onAnswer} locked={result !== null} minToCheck={instance.body.tokens.length} />
      {result ? <CorrectSentence en={instance.body.tokens.join(" ")} vi={instance.vi} audio={instance.audio} words={instance.body} /> : null}
    </div>
  );
}

export function SentenceGapView({ instance, answer, onAnswer, result }: ExerciseViewProps<SentenceGapInstance, string>) {
  return (
    <div className="grid gap-6">
      <Instruction>Điền từ còn thiếu vào câu</Instruction>
      <p className="text-2xl leading-relaxed" lang="en">
        {instance.display.map((token, i) =>
          token === null ? (
            <span key={i} className="mx-1 inline-block min-w-16 border-b-2 border-primary text-center text-primary">
              {answer ?? " "}
            </span>
          ) : (
            <span key={i}>{i === 0 ? token : ` ${token}`}</span>
          ),
        )}
      </p>
      <p className="text-muted-foreground">{instance.vi}</p>
      {instance.options ? (
        <OptionList
          label="Các lựa chọn"
          options={instance.options}
          selected={answer === null ? null : instance.options.indexOf(answer)}
          onSelect={(index) => onAnswer(instance.options![index])}
          answerIndex={result ? instance.options.indexOf(instance.answer) : undefined}
          lang="en"
        />
      ) : (
        <EnglishInput
          aria-label="Từ còn thiếu"
          value={answer ?? ""}
          onChange={(event) => onAnswer(event.target.value.trim() ? event.target.value : null)}
          disabled={result !== null}
        />
      )}
      {result ? <CorrectSentence en={instance.en} vi={instance.vi} audio={instance.audio} /> : null}
    </div>
  );
}

export function ChooseSentenceView({ instance, answer, onAnswer, result }: ExerciseViewProps<ChooseSentenceInstance, number>) {
  return (
    <div className="grid gap-6">
      <Instruction>Chọn câu đúng</Instruction>
      <p className="text-xl">{instance.vi}</p>
      <OptionList
        label="Các câu"
        options={instance.options.map((option) => option.text)}
        selected={answer}
        onSelect={onAnswer}
        answerIndex={result ? instance.answerIndex : undefined}
        lang="en"
      />
    </div>
  );
}
