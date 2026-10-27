"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { ChooseSentenceInstance } from "@/learning/exercises/choose-sentence";
import type { SentenceGapInstance } from "@/learning/exercises/sentence-gap";
import type { Tile } from "@/learning/exercises/tiles";
import type { TileTranslateInstance } from "@/learning/exercises/tile-translate";
import type { WordOrderInstance } from "@/learning/exercises/word-order";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AudioButton } from "./audio-button";
import { EnglishInput } from "./english-input";
import { OptionList } from "./option-list";
import type { ExerciseViewProps } from "./types";

function Instruction({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-medium text-muted-foreground">{children}</h2>;
}

/** The correct sentence with its translation and audio, shown once the answer is checked. */
function CorrectSentence({ en, vi, audio }: { en: string; vi: string; audio: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted p-4">
      <div className="min-w-0 flex-1">
        <p className="text-lg font-medium" lang="en">
          {en}
        </p>
        <p className="mt-1 text-muted-foreground">{vi}</p>
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
      <TileBuilder tiles={instance.tiles} answer={answer} onAnswer={onAnswer} locked={result !== null} minToCheck={instance.tiles.length} />
      {result ? <CorrectSentence en={instance.body.tokens.join(" ")} vi={instance.vi} audio={instance.audio} /> : null}
    </div>
  );
}

export function TileTranslateView({ instance, answer, onAnswer, result }: ExerciseViewProps<TileTranslateInstance, number[]>) {
  return (
    <div className="grid gap-6">
      <Instruction>Dịch câu sau sang tiếng Anh</Instruction>
      <p className="text-xl">{instance.vi}</p>
      <TileBuilder tiles={instance.tiles} answer={answer} onAnswer={onAnswer} locked={result !== null} minToCheck={2} />
      {result ? <CorrectSentence en={instance.body.tokens.join(" ")} vi={instance.vi} audio={instance.audio} /> : null}
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

/** Free writing, self-checked: write, compare with model answers, then mark yourself. */
export interface WritingInstance {
  kind: "writing";
  writingId: string;
  promptVi: string;
  modelAnswers: string[];
}

export interface WritingAnswer {
  text: string;
  correct: boolean;
}

export function WritingView({ instance, onAnswer, result }: ExerciseViewProps<WritingInstance, WritingAnswer>) {
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [mark, setMark] = useState<boolean | null>(null);

  function handleMark(correct: boolean) {
    setMark(correct);
    onAnswer({ text, correct });
  }

  return (
    <div className="grid gap-6">
      <Instruction>Bài viết</Instruction>
      <p className="text-xl">{instance.promptVi}</p>
      <Textarea
        lang="en"
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="sentences"
        aria-label="Bài viết của bạn"
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={revealed}
        className="min-h-36 text-lg"
      />
      {!revealed ? (
        <Button type="button" variant="secondary" size="lg" className="h-12" disabled={!text.trim()} onClick={() => setRevealed(true)}>
          Xem bài mẫu
        </Button>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-2">
            <p className="font-medium">Bài mẫu</p>
            {instance.modelAnswers.map((model) => (
              <p key={model} className="rounded-xl bg-muted p-4 text-lg" lang="en">
                {model}
              </p>
            ))}
          </div>
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
    </div>
  );
}

export function gradeWriting(instance: WritingInstance, answer: WritingAnswer) {
  return { correct: answer.correct, expected: instance.modelAnswers[0] ?? "" };
}
