"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Choice } from "@/handbook/jwt/token-view";
import { Verdict } from "@/handbook/ui";

import { type Code, CODE_LABEL, type Situation, SITUATIONS } from "./status";

const OPTIONS = (Object.keys(CODE_LABEL) as Code[]).map((c) => ({ value: c, label: CODE_LABEL[c] }));

type Answer = { code: Code; checked: boolean };

function SituationCard({ item, number, answer, onChoose, onCheck }: { item: Situation; number: number; answer?: Answer; onChoose: (id: string, c: Code) => void; onCheck: (id: string) => void }) {
  const right = answer?.code === item.answer;
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <p className="text-sm font-medium">
        <span className="mr-2 font-mono text-xs text-foreground/75 tabular-nums">{String(number).padStart(2, "0")}</span>
        {item.text}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Choice legend="Send" value={answer?.code ?? ("" as Code)} options={OPTIONS} onChange={(c) => onChoose(item.id, c)} />
        <Button size="sm" variant="outline" disabled={!answer || answer.checked} onClick={() => onCheck(item.id)}>
          Check
        </Button>
      </div>
      {answer?.checked ? (
        <div className="flex flex-col gap-1.5 rounded-md bg-muted/40 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-x-2">
            <Verdict pass={right}>{right ? "Right" : "Not quite"}</Verdict>
            <span>
              Send <strong>{CODE_LABEL[item.answer]}</strong>
            </span>
          </p>
          <p className="text-foreground/85">{item.reason}</p>
          <p className="text-foreground/85">
            <span className="font-medium">Google: </span>
            {item.google}
          </p>
          <p className="text-foreground/85">
            <span className="font-medium">In Next.js: </span>
            <code className="font-mono text-xs">{item.next}</code>
          </p>
        </div>
      ) : null}
    </li>
  );
}

export function StatusDemo() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const checked = SITUATIONS.filter((s) => answers[s.id]?.checked);
  const right = checked.filter((s) => answers[s.id].code === s.answer).length;
  const left = SITUATIONS.length - checked.length;

  function handleChoose(id: string, code: Code) {
    setAnswers((current) => ({ ...current, [id]: { code, checked: false } }));
  }

  function handleCheck(id: string) {
    setAnswers((current) => ({ ...current, [id]: { ...current[id], checked: true } }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ol className="grid min-w-0 gap-3 lg:grid-cols-2">
        {SITUATIONS.map((item, i) => (
          <SituationCard key={item.id} item={item} number={i + 1} answer={answers[item.id]} onChoose={handleChoose} onCheck={handleCheck} />
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm" aria-live="polite">
        <p className="font-medium">
          {checked.length === 0
            ? `Pick and check a code for the ${SITUATIONS.length} situations to see a summary.`
            : left > 0
              ? `${right} of ${checked.length} checked are right; ${left} left.`
              : `${right} of ${SITUATIONS.length} right. The rule underneath: tell the truth about the URL. Moved for good, moved for now, gone, or try later.`}
        </p>
        <Button size="sm" variant="ghost" disabled={Object.keys(answers).length === 0} onClick={() => setAnswers({})}>
          Start over
        </Button>
      </div>
    </div>
  );
}
