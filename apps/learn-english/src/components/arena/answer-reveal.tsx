import { AudioButton } from "@/components/exercise/audio-button";
import { Owl } from "@/components/mascot/owl";
import type { PublicPlayer, QuestionType, Reveal } from "@/learning/arena/protocol";
import { cn } from "@/lib/utils";
import { Tile } from "./tile";

const STAGGER_MS = 30;

/** The answer as tiles: a word letter by letter, a sentence word by word. */
function AnswerTiles({ answer, byWord }: { answer: string; byWord: boolean }) {
  const pieces = byWord ? answer.split(/\s+/) : [...answer];
  const small = !byWord && pieces.length > 10;
  return (
    <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5" lang="en" aria-hidden>
      {pieces.map((piece, i) =>
        piece === " " ? (
          <span key={i} className="w-3" />
        ) : (
          <Tile
            key={i}
            flip
            state="correct"
            size={byWord ? "sm" : small ? "sm" : "md"}
            className={cn(byWord && "w-auto px-2.5 text-base", !byWord && "lowercase")}
            style={{ animationDelay: `${i * STAGGER_MS}ms` }}
          >
            {piece}
          </Tile>
        ),
      )}
    </div>
  );
}

interface AnswerRevealProps {
  reveal: Reveal;
  questionType: QuestionType;
  me: string;
  rival: PublicPlayer | undefined;
}

/** The answer for both players before the next question (AC-018): who was faster, then the answer itself. */
export function AnswerReveal({ reveal, questionType, me, rival }: AnswerRevealProps) {
  const byYou = reveal.answeredBy === me;
  const byRival = reveal.answeredBy !== null && !byYou;
  return (
    <section aria-label="Đáp án" className="grid justify-items-center gap-3 rounded-xl border bg-muted/40 p-4 text-center">
      <p className={cn("flex items-center gap-2 text-lg font-bold", byYou ? "text-primary" : byRival ? "text-arena-rival" : "text-muted-foreground")}>
        {byYou ? (
          <>
            Bạn nhanh hơn! <span className="animate-score-pop rounded-md bg-primary px-1.5 text-sm text-primary-foreground">+1</span>
          </>
        ) : byRival ? (
          `${rival?.name ?? "Đối thủ"} nhanh hơn`
        ) : (
          <>
            <Owl mood="sleepy" size={32} /> Hết giờ, không ai đúng
          </>
        )}
      </p>
      <p className="sr-only">Đáp án: {reveal.answer}</p>
      <AnswerTiles answer={reveal.answer} byWord={questionType === "write"} />
      {reveal.ipa || reveal.audio ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {reveal.ipa ? <span className="ipa">{reveal.ipa}</span> : null}
          {reveal.audio ? <AudioButton audioKey={reveal.audio} source="word" label={reveal.answer} /> : null}
        </div>
      ) : null}
    </section>
  );
}
