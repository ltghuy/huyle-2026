"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Choice } from "@/handbook/jwt/token-view";
import { Verdict } from "@/handbook/ui";

import { type Case, CASES, type Category, CATEGORY_LABEL } from "./cases";

const OPTIONS = (Object.keys(CATEGORY_LABEL) as Category[]).map((value) => ({ value, label: CATEGORY_LABEL[value] }));

type Answer = { category: Category; checked: boolean };

function CaseCard({ item, number, answer, onChoose, onCheck }: { item: Case; number: number; answer?: Answer; onChoose: (id: string, c: Category) => void; onCheck: (id: string) => void }) {
  const right = answer?.category === item.answer;
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <p className="text-sm font-medium">
        <span className="mr-2 font-mono text-xs text-foreground/75 tabular-nums">{String(number).padStart(2, "0")}</span>
        {item.text}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Choice legend="This is" value={answer?.category ?? ("" as Category)} options={OPTIONS} onChange={(c) => onChoose(item.id, c)} />
        <Button size="sm" variant="outline" disabled={!answer || answer.checked} onClick={() => onCheck(item.id)}>
          Check
        </Button>
      </div>
      {answer?.checked ? (
        <div className="flex flex-col gap-1.5 rounded-md bg-muted/40 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-x-2">
            <Verdict pass={right}>{right ? "Right" : "Not quite"}</Verdict>
            <span>
              Answer: <strong>{CATEGORY_LABEL[item.answer]}</strong>
            </span>
          </p>
          <p className="text-foreground/85">{item.reason}</p>
          <a
            href={item.source.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {item.source.label}
            <ExternalLink aria-hidden className="size-3.5" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      ) : null}
    </li>
  );
}

export function CasesDemo() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const checked = CASES.filter((c) => answers[c.id]?.checked);
  const right = checked.filter((c) => answers[c.id].category === c.answer).length;
  const left = CASES.length - checked.length;

  function handleChoose(id: string, category: Category) {
    setAnswers((current) => ({ ...current, [id]: { category, checked: false } }));
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
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm" aria-live="polite">
        <p className="font-medium">
          {checked.length === 0
            ? `Sort and check the ${CASES.length} cases to see a summary.`
            : left > 0
              ? `${right} of ${checked.length} checked are right; ${left} left.`
              : `${right} of ${CASES.length} right. What decides it is why the pages exist: for readers, or mainly to rank.`}
        </p>
        <Button size="sm" variant="ghost" disabled={Object.keys(answers).length === 0} onClick={() => setAnswers({})}>
          Start over
        </Button>
      </div>
    </div>
  );
}
