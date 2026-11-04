import { AudioButton } from "@/components/exercise/audio-button";
import { Owl } from "@/components/mascot/owl";
import type { PublicPlayer, QuestionType, Reveal } from "@/learning/arena/protocol";
import { cn } from "@/lib/utils";
import { slotWords, TileWord, wordTileClass } from "./letter-slots";
import { Tile } from "./tile";

const STAGGER_MS = 30;

/** The answer as tiles: a word letter by letter (shrinking to fit a phone), a sentence word by word. */
function AnswerTiles({ answer, byWord }: { answer: string; byWord: boolean }) {
  if (byWord) {
    return (
      <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5" lang="en" aria-hidden>
        {answer.split(/\s+/).map((word, i) => (
          <Tile key={i} flip state="correct" size="sm" className="w-auto px-2.5 text-base" style={{ animationDelay: `${i * STAGGER_MS}ms` }}>
            {word}
          </Tile>
        ))}
      </div>
    );
  }
  const words = slotWords([...answer].map((char) => ({ kind: char === " " ? "gap" : "letter", char })));
  const single = words.length === 1;
  let index = 0;
  return (
    <div className="flex w-full flex-wrap justify-center gap-x-3 gap-y-2" lang="en" aria-hidden>
      {words.map((word, w) => (
        <TileWord key={w} single={single}>
          {word.map((piece) => {
            const delay = index++ * STAGGER_MS;
            return (
              <Tile key={delay} flip state="correct" size={single ? "md" : "sm"} className={cn("lowercase", wordTileClass(single))} style={{ animationDelay: `${delay}ms` }}>
                {piece.char}
              </Tile>
            );
          })}
        </TileWord>
      ))}
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
