"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleAlert, Lightbulb, Minus, Plus, Snail, Volume2, X } from "lucide-react";
import { toast } from "sonner";
import { compareDictation, dictationSummary, dictationWords, type DictationAnswer, type DictationInstance, type DictationMark } from "@/learning/exercises/dictation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { audioUrl } from "./audio-button";
import { EnglishInput } from "./english-input";
import { CorrectSentence } from "./sentence-exercises";
import type { ExerciseViewProps } from "./types";

const SLOW_RATE = 0.75;

/**
 * The sentence's clip, played once when the task opens (AC-001) and again at
 * normal or slow speed on demand. A clip that fails to load reports through
 * `onError`, so the runner can swap in an exercise without audio.
 */
function useSentenceAudio(audioKey: string, onError?: () => void) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const onErrorRef = useRef(onError);
  const [playingRate, setPlayingRate] = useState<number | null>(null);

  useEffect(() => {
    onErrorRef.current = onError;
  });

  useEffect(() => {
    const audio = new Audio(audioUrl("sentence", audioKey));
    audioRef.current = audio;
    const handlePlaying = () => setPlayingRate(audio.playbackRate);
    const handleStop = () => setPlayingRate(null);
    const handleError = () => {
      setPlayingRate(null);
      toast.error("Không phát được âm thanh. Bạn kiểm tra kết nối mạng nhé.");
      onErrorRef.current?.();
    };
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handleStop);
    audio.addEventListener("ended", handleStop);
    audio.addEventListener("error", handleError);
    // The browser may refuse to start audio on its own; the buttons still work.
    void audio.play().catch(() => {});
    return () => {
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handleStop);
      audio.removeEventListener("ended", handleStop);
      audio.removeEventListener("error", handleError);
      audio.pause();
      audioRef.current = null;
    };
  }, [audioKey]);

  function play(rate: number) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    audio.playbackRate = rate;
    void audio.play().catch(() => {});
  }

  return { playingRate, play };
}

function Instruction({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-medium text-muted-foreground">{children}</h2>;
}

/** One slot per word, filled as the learner types (AC-003). */
function WordSlots({ total, typed }: { total: number; typed: number }) {
  const extra = typed - total;
  return (
    <div className="grid justify-items-center gap-2">
      <div className="flex flex-wrap justify-center gap-1.5" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={cn("h-1.5 w-6 rounded-full transition-colors", i < typed ? "bg-primary" : "bg-muted-foreground/25")} />
        ))}
        {extra > 0 ? <span className="text-xs leading-none font-medium text-destructive">+{extra}</span> : null}
      </div>
      <p className="text-sm text-muted-foreground">
        Câu có {total} từ{typed > 0 ? `, bạn đã gõ ${typed} từ` : ""}
      </p>
    </div>
  );
}

const MARK_STYLES: Record<DictationMark["status"], { Icon: typeof Check; label: string; className: string }> = {
  right: { Icon: Check, label: "đúng", className: "border-success/40 bg-success/10" },
  slip: { Icon: CircleAlert, label: "gần đúng", className: "border-success/40 bg-success/10" },
  wrong: { Icon: X, label: "sai", className: "border-destructive/40 bg-destructive/10" },
  missed: { Icon: Minus, label: "thiếu", className: "border-dashed border-destructive/60" },
  extra: { Icon: Plus, label: "thừa", className: "border-dashed border-destructive/60" },
};

/** The sentence word by word with each word's mark (AC-008, AC-009). */
function DictationMarks({ marks }: { marks: DictationMark[] }) {
  const summary = dictationSummary(marks);
  return (
    <div role="group" aria-label={summary} className="grid gap-3 motion-safe:animate-in motion-safe:fade-in">
      <p className="text-sm font-medium" aria-hidden>
        {summary}
      </p>
      <ul className="flex flex-wrap gap-2" aria-hidden>
        {marks.map((mark, i) => {
          const { Icon, label, className } = MARK_STYLES[mark.status];
          const typed = mark.status === "slip" || mark.status === "wrong" ? mark.typed : null;
          return (
            <li key={i} className={cn("flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5", className)}>
              <Icon className={cn("size-4 shrink-0", mark.status === "right" || mark.status === "slip" ? "text-success" : "text-destructive")} />
              <span className="grid leading-tight">
                <span lang="en" className={cn("font-medium", mark.status === "extra" && "line-through")}>
                  {mark.status === "extra" ? mark.typed : mark.word}
                </span>
                {typed !== null ? (
                  <span className="text-xs text-muted-foreground">
                    {label}: <span lang="en">{typed}</span>
                  </span>
                ) : mark.status !== "right" ? (
                  <span className="text-xs text-muted-foreground">{label}</span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Nghe chép (feature 010): hear the sentence, type it, see each word marked. */
export function DictationView({ instance, answer, onAnswer, result, onAudioError }: ExerciseViewProps<DictationInstance, DictationAnswer>) {
  const { playingRate, play } = useSentenceAudio(instance.audio, onAudioError);
  const [text, setText] = useState(answer?.text ?? "");
  const [hinted, setHinted] = useState(answer?.hinted ?? false);

  function handleChange(value: string) {
    setText(value);
    onAnswer(value.trim() ? { text: value, hinted } : null);
  }

  function handleHint() {
    setHinted(true);
    if (text.trim()) onAnswer({ text, hinted: true });
  }

  return (
    <div className="grid gap-6">
      <Instruction>Nghe và chép lại câu</Instruction>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" variant="outline" size="lg" className="h-12 rounded-full px-5" onClick={() => play(1)} aria-pressed={playingRate === 1}>
          <Volume2 aria-hidden /> Nghe lại
        </Button>
        <Button type="button" variant="outline" size="lg" className="h-12 rounded-full px-5" onClick={() => play(SLOW_RATE)} aria-pressed={playingRate === SLOW_RATE}>
          <Snail aria-hidden /> Nghe chậm
        </Button>
      </div>
      <WordSlots total={instance.wordCount} typed={dictationWords(text).length} />
      <EnglishInput aria-label="Câu bạn nghe được" value={text} onChange={(event) => handleChange(event.target.value)} disabled={result !== null} />
      {!result ? (
        hinted ? (
          <p className="rounded-xl bg-muted p-4 text-muted-foreground">{instance.vi}</p>
        ) : (
          <Button type="button" variant="ghost" className="h-11 justify-self-center" onClick={handleHint}>
            <Lightbulb aria-hidden /> Gợi ý
          </Button>
        )
      ) : (
        <>
          <DictationMarks marks={compareDictation(instance.en, text)} />
          <CorrectSentence en={instance.en} vi={instance.vi} audio={instance.audio} />
        </>
      )}
    </div>
  );
}
