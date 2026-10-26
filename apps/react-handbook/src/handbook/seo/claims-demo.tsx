"use client";

import { ExternalLink } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Choice } from "@/handbook/jwt/token-view";
import { Verdict as VerdictMark } from "@/handbook/ui";

import { type Claim, CLAIMS, type Verdict, VERDICT_LABEL } from "./claims";

const OPTIONS = (Object.keys(VERDICT_LABEL) as Verdict[]).map((v) => ({ value: v, label: VERDICT_LABEL[v] }));

type Answer = { verdict: Verdict; checked: boolean };

function ClaimCard({ item, number, answer, onChoose, onCheck }: { item: Claim; number: number; answer?: Answer; onChoose: (id: string, v: Verdict) => void; onCheck: (id: string) => void }) {
  const agreed = answer?.verdict === item.answer;
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <p className="text-sm font-medium">
        <span className="mr-2 font-mono text-xs text-foreground/75 tabular-nums">{String(number).padStart(2, "0")}</span>
        {item.claim}
      </p>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Choice legend="This is a" value={answer?.verdict ?? ("" as Verdict)} options={OPTIONS} onChange={(v) => onChoose(item.id, v)} />
        <Button size="sm" variant="outline" disabled={!answer || answer.checked} onClick={() => onCheck(item.id)}>
          Check
        </Button>
      </div>
      {answer?.checked ? (
        <div className="flex flex-col gap-1.5 rounded-md bg-muted/40 p-3 text-sm">
          <p className="flex flex-wrap items-center gap-x-2">
            <VerdictMark pass={agreed}>{agreed ? "Right" : "Not quite"}</VerdictMark>
            <span>
              Answer: <strong>{VERDICT_LABEL[item.answer]}</strong>
            </span>
          </p>
          <p className="text-foreground/85">{item.reason}</p>
          <a
            href={item.source.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex w-fit items-center gap-1 rounded-sm font-medium text-link underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
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

export function ClaimsDemo() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const checked = CLAIMS.filter((c) => answers[c.id]?.checked);
  const agreed = checked.filter((c) => answers[c.id].verdict === c.answer).length;
  const left = CLAIMS.length - checked.length;

  function handleChoose(id: string, verdict: Verdict) {
    setAnswers((current) => ({ ...current, [id]: { verdict, checked: false } }));
  }

  function handleCheck(id: string) {
    setAnswers((current) => ({ ...current, [id]: { ...current[id], checked: true } }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ol className="grid min-w-0 gap-3 lg:grid-cols-2">
        {CLAIMS.map((item, i) => (
          <ClaimCard key={item.id} item={item} number={i + 1} answer={answers[item.id]} onChoose={handleChoose} onCheck={handleCheck} />
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm" aria-live="polite">
        <p className="font-medium">
          {checked.length === 0
            ? `Sort and check the ${CLAIMS.length} claims to see a summary.`
            : left > 0
              ? `${agreed} of ${checked.length} checked are right; ${left} left.`
              : `${agreed} of ${CLAIMS.length} right. The pattern: rankings follow what helps the searcher, and tags or tricks that only exist for crawlers do little.`}
        </p>
        <Button size="sm" variant="ghost" disabled={Object.keys(answers).length === 0} onClick={() => setAnswers({})}>
          Start over
        </Button>
      </div>
    </div>
  );
}
