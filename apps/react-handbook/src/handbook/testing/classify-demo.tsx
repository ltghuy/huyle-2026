"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Choice } from "@/handbook/jwt/token-view";
import { Verdict } from "@/handbook/ui";

import { type Case, CASES, LEVEL_LABEL, QUESTIONS } from "./cases";
import type { Level } from "./suite-model";

const LEVEL_OPTIONS = (Object.keys(LEVEL_LABEL) as Level[]).map((level) => ({ value: level, label: LEVEL_LABEL[level] }));

type Answer = { level: Level; checked: boolean };

function CaseCard({ item, number, answer, onChoose, onCheck }: { item: Case; number: number; answer?: Answer; onChoose: (id: string, level: Level) => void; onCheck: (id: string) => void }) {
  const agreed = answer ? item.accepted.includes(answer.level) : false;
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <p className="text-sm font-medium">
        <span className="mr-2 font-mono text-xs text-foreground/75 tabular-nums">{String(number).padStart(2, "0")}</span>
        {item.title}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Choice legend="Test it at" value={answer?.level ?? ("" as Level)} options={LEVEL_OPTIONS} onChange={(level) => onChoose(item.id, level)} />
        <Button size="sm" variant="outline" disabled={!answer || answer.checked} onClick={() => onCheck(item.id)}>
          Check
        </Button>
      </div>
      {answer?.checked ? (
        <div className="flex flex-col gap-1.5 rounded-md bg-muted/40 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-x-2">
            <Verdict pass={agreed}>{agreed ? "Agrees" : "Differs"}</Verdict>
            <span>
              Recommended: <strong>{LEVEL_LABEL[item.recommended]}</strong>
              {item.accepted.length > 1 ? ` (${item.accepted.filter((l) => l !== item.recommended).map((l) => LEVEL_LABEL[l]).join(", ")} also fits)` : null}
            </span>
          </p>
          <p className="text-foreground/85">{item.reason}</p>
          <p className="text-foreground/85">
            <span className="font-medium">At {LEVEL_LABEL[answer.level].toLowerCase()}:</span> {item.notes[answer.level]}
          </p>
        </div>
      ) : null}
    </li>
  );
}

export function ClassifyDemo() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const checked = CASES.filter((c) => answers[c.id]?.checked);
  const agreed = checked.filter((c) => c.accepted.includes(answers[c.id].level)).length;
  const left = CASES.length - checked.length;

  function handleChoose(id: string, level: Level) {
    setAnswers((current) => ({ ...current, [id]: { level, checked: false } }));
  }

  function handleCheck(id: string) {
    setAnswers((current) => ({ ...current, [id]: { ...current[id], checked: true } }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ol className="grid min-w-0 gap-3 lg:grid-cols-2">
        {CASES.map((item, i) => (
          <CaseCard key={item.id} item={item} number={i + 1} answer={answers[item.id]} onChoose={handleChoose} onCheck={handleCheck} />
        ))}
      </ol>

      <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">
            {checked.length === 0
              ? `Place and check the ${CASES.length} cases to see a summary.`
              : `${agreed} of ${checked.length} checked agree with the recommendation${left > 0 ? `; ${left} left` : ""}.`}
          </p>
          <Button size="sm" variant="ghost" disabled={Object.keys(answers).length === 0} onClick={() => setAnswers({})}>
            Start over
          </Button>
        </div>
        <ul className="flex list-disc flex-col gap-1 pl-4 text-foreground/85">
          {QUESTIONS.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
