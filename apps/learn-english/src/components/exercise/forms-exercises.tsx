"use client";

import type { FormsGapInstance, FormsListeningInstance, FormsTypingInstance, VerbSummary } from "@/learning/exercises/forms";
import { AudioButton } from "./audio-button";
import { EnglishInput } from "./english-input";
import { OptionList } from "./option-list";
import type { ExerciseViewProps } from "./types";

// Views of the irregular verb forms exercises (feature 008).

const FORM_NAMES = { past: "quá khứ (V2)", participle: "quá khứ phân từ (V3)" } as const;

function Instruction({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-medium text-muted-foreground">{children}</h2>;
}

/** The three forms and the meaning, shown once the answer is checked. */
function VerbReveal({ verb }: { verb: VerbSummary }) {
  return (
    <div role="group" aria-label="Ba dạng của động từ" className="grid gap-2 rounded-xl border bg-card p-4 motion-safe:animate-in motion-safe:fade-in">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-xl font-semibold" lang="en">
          {verb.headword} – {verb.past.join(" / ")} – {verb.participle.join(" / ")}
        </p>
        {verb.audio ? <AudioButton source="word" audioKey={verb.audio} label={`ba dạng của ${verb.headword}`} /> : null}
      </div>
      <p className="text-muted-foreground" lang="vi">
        {verb.meaningsVi.join("; ")}
      </p>
    </div>
  );
}

export function FormsTypingView({ instance, answer, onAnswer, result }: ExerciseViewProps<FormsTypingInstance, string>) {
  return (
    <div className="grid gap-6">
      <Instruction>Gõ dạng {FORM_NAMES[instance.form]} của động từ</Instruction>
      <div className="grid gap-1 text-center">
        <p className="text-3xl font-semibold" lang="en">
          {instance.verb.headword}
        </p>
        <p className="text-muted-foreground" lang="vi">
          {instance.verb.meaningsVi.join("; ")}
        </p>
      </div>
      <EnglishInput
        aria-label={`Dạng ${FORM_NAMES[instance.form]}`}
        value={answer ?? ""}
        onChange={(event) => onAnswer(event.target.value.trim() ? event.target.value : null)}
        disabled={result !== null}
      />
      {result ? <VerbReveal verb={instance.verb} /> : null}
    </div>
  );
}

export function FormsGapView({ instance, answer, onAnswer, result }: ExerciseViewProps<FormsGapInstance, number>) {
  return (
    <div className="grid gap-6">
      <Instruction>
        Chọn dạng đúng của <span lang="en">“{instance.verb.headword}”</span>
      </Instruction>
      <div className="grid gap-1 text-center">
        <p className="text-2xl font-semibold" lang="en">
          {instance.sentence}
        </p>
        <p className="text-muted-foreground" lang="vi">
          {instance.vi}
        </p>
      </div>
      <OptionList
        label="Các lựa chọn"
        options={instance.options}
        selected={answer}
        onSelect={onAnswer}
        answerIndex={result ? instance.answerIndex : undefined}
        lang="en"
      />
      {result ? <VerbReveal verb={instance.verb} /> : null}
    </div>
  );
}

export function FormsListeningView({ instance, answer, onAnswer, result, onAudioError }: ExerciseViewProps<FormsListeningInstance, number>) {
  return (
    <div className="grid gap-6">
      <Instruction>Nghe ba dạng của động từ và chọn cách viết đúng</Instruction>
      <div className="flex justify-center">
        <AudioButton source="word" audioKey={instance.audio} label="ba dạng cần nghe" size="lg" onError={onAudioError} />
      </div>
      <OptionList
        label="Các lựa chọn"
        options={instance.options}
        selected={answer}
        onSelect={onAnswer}
        answerIndex={result ? instance.answerIndex : undefined}
        lang="en"
      />
      {result ? <VerbReveal verb={instance.verb} /> : null}
    </div>
  );
}
