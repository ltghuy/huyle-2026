"use client";

import { useState } from "react";
import { CheckCheck } from "lucide-react";
import type { TranslateAnswer, TranslateInstance } from "@/learning/exercises/translate";
import { Button } from "@/components/ui/button";
import { EnglishInput } from "./english-input";
import { CorrectSentence } from "./sentence-exercises";
import type { ExerciseViewProps } from "./types";

/** Dịch câu (feature 016): read the Vietnamese, type the English; a wrong answer can be claimed as also correct. */
export function TranslateView({ instance, answer, onAnswer, result, onClaim }: ExerciseViewProps<TranslateInstance, TranslateAnswer>) {
  const [text, setText] = useState(answer?.text ?? "");

  function handleChange(value: string) {
    setText(value);
    onAnswer(value.trim() ? { text: value } : null);
  }

  return (
    <div className="grid gap-6">
      <h2 className="text-lg font-medium text-muted-foreground">Dịch câu sau sang tiếng Anh</h2>
      <p className="text-xl">{instance.vi}</p>
      <EnglishInput aria-label="Câu tiếng Anh của bạn" value={text} onChange={(event) => handleChange(event.target.value)} disabled={result !== null} />
      {result ? (
        <div className="grid gap-4">
          {!result.correct || result.claimed ? (
            <p className="text-muted-foreground">
              Câu của bạn:{" "}
              <span className="font-medium text-foreground" lang="en">
                {text.trim()}
              </span>
            </p>
          ) : null}
          <CorrectSentence en={instance.en} vi={instance.vi} audio={instance.audio} />
          {onClaim ? (
            <Button type="button" variant="outline" size="lg" className="h-12" onClick={onClaim}>
              <CheckCheck aria-hidden /> Câu của mình cũng đúng
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
