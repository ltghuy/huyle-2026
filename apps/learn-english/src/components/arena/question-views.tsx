"use client";

import { useEffect, useState } from "react";
import { SendHorizontal } from "lucide-react";
import { AudioButton, audioUrl } from "@/components/exercise/audio-button";
import { LetterInput } from "@/components/exercise/letter-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PublicQuestion, Reveal } from "@/learning/arena/protocol";
import { cn } from "@/lib/utils";
import { tileVariants } from "./tile";
import { useTypedAnswer } from "./use-typed-answer";

const KEYS = ["1", "2", "3", "4"];

type Of<T extends PublicQuestion["type"]> = Extract<PublicQuestion, { type: T }>;

interface ListenProps {
  question: Of<"listen">;
  /** Set once the question ends: the answer is shown on the options. */
  reveal: Reveal | null;
  /** You picked wrong and can't pick again this question. */
  lockedOut: boolean;
  /** A spectator: the options show but can't be picked (feature 026). */
  watching?: boolean;
  onChoose: (choice: number) => void;
}

/** Whether a key press was typed into a field (then it isn't a shortcut). */
function inField(event: KeyboardEvent): boolean {
  const target = event.target;
  return target instanceof Element && Boolean(target.closest("input, textarea, [contenteditable='true']"));
}

/** "Nghe và chọn từ": the clip plays once, Space replays it, 1–4 or a tap picks (AC-014). */
export function QuestionListen({ question, reveal, lockedOut, watching = false, onChoose }: ListenProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const open = !reveal && !lockedOut && !watching;

  useEffect(() => {
    const audio = new Audio(audioUrl("word", question.audio));
    void audio.play().catch(() => {});
    return () => audio.pause();
  }, [question.audio]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (inField(event) || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === " ") {
        event.preventDefault();
        void new Audio(audioUrl("word", question.audio)).play().catch(() => {});
        return;
      }
      const index = KEYS.indexOf(event.key);
      if (index >= 0 && open) {
        setPicked(index);
        onChoose(index);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onChoose, question.audio]);

  function handlePick(index: number) {
    setPicked(index);
    onChoose(index);
  }

  function stateOf(index: number) {
    if (reveal) return index === reveal.answerIndex ? "correct" : index === picked ? "wrong" : "locked";
    if (lockedOut) return index === picked ? "wrong" : "locked";
    return watching ? "locked" : "idle";
  }

  return (
    <div className="grid gap-5">
      <div className="grid justify-items-center gap-2">
        <AudioButton audioKey={question.audio} source="word" label="từ cần chọn" size="lg" className="size-20 [&_svg:not([class*='size-'])]:size-8" />
        <p className="text-sm text-muted-foreground">{watching ? "Người chơi nghe rồi chọn từ đúng" : "Nghe rồi chọn từ đúng"} · phím cách để nghe lại</p>
      </div>
      <div role="radiogroup" aria-label="Chọn từ bạn nghe được" className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-2">
        {question.options.map((option, index) => (
          <button
            key={`${index}-${option}`}
            type="button"
            role="radio"
            aria-checked={picked === index}
            disabled={!open}
            onClick={() => handlePick(index)}
            className={tileVariants({ state: stateOf(index), size: "option", interactive: true })}
            lang="en"
          >
            <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md border text-sm text-muted-foreground">
              {KEYS[index]}
            </span>
            {option}
          </button>
        ))}
      </div>
      {lockedOut && !reveal && !watching ? (
        <p role="status" className="text-center text-sm text-muted-foreground">
          Bạn đã chọn sai, chờ đối thủ…
        </p>
      ) : null}
    </div>
  );
}

interface TypedProps {
  /** Your wrong tries in the room so far (from the room's "wrong" frames). */
  wrongCount: number;
  closed: boolean;
  /** A spectator: the prompt and the blank slots show, with nothing to type or send (feature 026). */
  watching?: boolean;
  onAnswer: (text: string) => void;
  onTyping: () => void;
}

function WrongNote({ show }: { show: boolean }) {
  return (
    <p role={show ? "alert" : undefined} className={cn("min-h-5 text-sm", show ? "text-destructive" : "text-transparent")}>
      {show ? "Chưa đúng, bạn thử lại nhé." : " "}
    </p>
  );
}

/** "Nhớ lại từ": the meaning, then the word typed into letter slots (AC-014: retries until someone is right). */
export function QuestionRecall({ question, wrongCount, closed, watching = false, onAnswer, onTyping }: TypedProps & { question: Of<"recall"> }) {
  const { text, change, send, inputRef, wrongTry } = useTypedAnswer({ wrongCount, onSend: onAnswer, onTyping });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    send();
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <div className="grid justify-items-center gap-2 text-center">
        <Badge variant="secondary" lang="en">
          {question.pos}
        </Badge>
        <p className="text-2xl font-semibold text-balance">{question.meaningsVi.join("; ")}</p>
      </div>
      <div data-shake className="grid gap-1">
        <LetterInput ref={inputRef} aria-label="Từ tiếng Anh" mask={question.mask} value={text} onChange={change} disabled={closed || watching} invalid={wrongTry > 0} />
        {watching ? null : (
          <div className="flex items-center justify-between gap-2">
            <WrongNote show={wrongTry > 0} />
            <Button type="submit" className="h-11 gap-2" disabled={closed || !text.trim()}>
              <SendHorizontal aria-hidden /> Gửi
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

/** "Viết câu": read the Vietnamese, type the English; Enter sends, Shift+Enter is a new line. */
export function QuestionWrite({ question, wrongCount, closed, watching = false, onAnswer, onTyping }: TypedProps & { question: Of<"write"> }) {
  const { text, change, send, inputRef, wrongTry } = useTypedAnswer({ wrongCount, onSend: onAnswer, onTyping });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    send();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="rounded-xl bg-muted p-4">
        <p className="text-xs font-medium text-muted-foreground">Dịch sang tiếng Anh</p>
        <p className="mt-1 text-xl font-semibold text-balance">{question.vi}</p>
      </div>
      {watching ? null : (
        <div data-shake className="grid gap-1">
          <Textarea
            ref={inputRef}
            lang="en"
            rows={2}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            aria-label="Câu tiếng Anh"
            placeholder="Gõ câu tiếng Anh…"
            value={text}
            onChange={(event) => change(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={closed}
            aria-invalid={wrongTry > 0 || undefined}
            className={cn("min-h-20 resize-none text-lg md:text-lg", wrongTry > 0 && "border-destructive")}
          />
          <div className="flex items-center justify-between gap-2">
            <WrongNote show={wrongTry > 0} />
            <Button type="submit" className="h-11 gap-2" disabled={closed || !text.trim()}>
              <SendHorizontal aria-hidden /> Gửi
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
