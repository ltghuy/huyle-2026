"use client";

import { useState } from "react";

import { Choice } from "@/handbook/jwt/token-view";

// A short self-check: the signs that a team gets value from Gherkin, and the
// signs that it would only add a layer. Weights are a judgement, shown as such.

type Answer = "yes" | "no";

const QUESTIONS: readonly { id: string; text: string; yes: number; no: number; why: string }[] = [
  { id: "readers", text: "Do people outside engineering (product, QA, support) read the tests or want to?", yes: 2, no: -2, why: "Scenarios are worth their cost when someone who doesn't read code reads them." },
  { id: "examples", text: "Are rules agreed with concrete examples before they're built?", yes: 2, no: -1, why: "The format pays off in the conversation before code: examples settle what the rule is." },
  { id: "rules", text: "Is the product full of business rules (prices, eligibility, permissions) more than screens?", yes: 1, no: -1, why: "Rules with many cases fit examples tables; layout and flow fit code tests better." },
  { id: "owner", text: "Will someone keep the step library tidy and the wording consistent?", yes: 1, no: -2, why: "Without an owner, steps multiply and scenarios drift into click scripts." },
  { id: "speed", text: "Is the team happy to add a translation layer between the words and the code?", yes: 1, no: -1, why: "Every scenario runs through step definitions: one more layer to read and debug." },
];

const OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
] as const;

function verdict(score: number) {
  if (score >= 4) return "Worth it: people outside engineering will use the scenarios, and the rules suit examples. Start with the riskiest rules, not every screen.";
  if (score >= 1) return "Maybe: use Gherkin for a few rule-heavy features that others review, and plain end-to-end tests for the rest.";
  return "Probably not: the scenarios would be read only by engineers. Write clear end-to-end tests with good names instead; you keep the confidence without the extra layer.";
}

export function WorthItDemo() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const answered = QUESTIONS.filter((q) => answers[q.id]);
  const score = answered.reduce((sum, q) => sum + (answers[q.id] === "yes" ? q.yes : q.no), 0);

  function handleAnswer(id: string, value: Answer) {
    setAnswers((current) => ({ ...current, [id]: value }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ol className="flex flex-col gap-3">
        {QUESTIONS.map((q, i) => (
          <li key={q.id} className="flex min-w-0 flex-col gap-1.5 rounded-lg border p-3">
            <p className="text-sm">
              <span className="mr-2 font-mono text-xs text-foreground/75">{i + 1}</span>
              {q.text}
            </p>
            <Choice legend={q.text} hideLegend value={answers[q.id] ?? ("" as Answer)} options={OPTIONS} onChange={(v) => handleAnswer(q.id, v)} />
            {answers[q.id] ? <p className="text-xs text-foreground/75">{q.why}</p> : null}
          </li>
        ))}
      </ol>
      <p className="rounded-lg bg-muted/40 p-3 text-sm" aria-live="polite">
        {answered.length < QUESTIONS.length ? `${QUESTIONS.length - answered.length} question${QUESTIONS.length - answered.length === 1 ? "" : "s"} left.` : verdict(score)}
      </p>
      <p className="text-xs text-foreground/75">A rule of thumb, not a measurement: each answer moves the verdict by a weight chosen for this page.</p>
    </div>
  );
}
