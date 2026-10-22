"use client";

import { useState } from "react";

import { CodeBlock } from "@/handbook/e2e/code-block";
import { Choice } from "@/handbook/jwt/token-view";

import { type Answers, type Freshness, type Personal, recommend, type Search, STRATEGY_ROWS } from "./strategy";

const SEARCH: readonly { value: Search; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];
const PERSONAL: readonly { value: Personal; label: string }[] = [
  { value: "no", label: "Same for everyone" },
  { value: "partly", label: "Partly personal" },
  { value: "yes", label: "All personal" },
];
const FRESHNESS: readonly { value: Freshness; label: string }[] = [
  { value: "rarely", label: "Rarely" },
  { value: "hourly", label: "About hourly" },
  { value: "request", label: "On every request" },
];

export function StrategyDemo() {
  const [answers, setAnswers] = useState<Answers>({ search: "yes", personal: "no", freshness: "hourly" });
  const strategy = recommend(answers);

  function handleSearch(search: Search) {
    setAnswers((a) => ({ ...a, search }));
  }

  function handlePersonal(personal: Personal) {
    setAnswers((a) => ({ ...a, personal }));
  }

  function handleFreshness(freshness: Freshness) {
    setAnswers((a) => ({ ...a, freshness }));
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-col gap-3">
        <Choice legend="Must the page appear in search?" value={answers.search} options={SEARCH} onChange={handleSearch} />
        <Choice legend="Is the content the same for every visitor?" value={answers.personal} options={PERSONAL} onChange={handlePersonal} />
        <Choice legend="How often does it change?" value={answers.freshness} options={FRESHNESS} onChange={handleFreshness} />
      </div>

      <div aria-live="polite" className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-1.5 rounded-lg bg-muted/40 p-3 text-sm">
          <p className="font-medium">{strategy.name}</p>
          <p className="text-foreground/85">{strategy.why}</p>
          <p className="text-foreground/85">
            <span className="font-medium">Cost: </span>
            {strategy.cost}
          </p>
        </div>
        <CodeBlock path="In the route's page.tsx" code={strategy.code} lang="ts" />
      </div>

      <div tabIndex={0} role="region" aria-label="Rendering strategies compared" className="min-w-0 overflow-x-auto rounded-lg border outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <table className="w-full min-w-[36rem] text-left text-xs">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 font-medium">Strategy</th>
              <th className="px-3 py-2 font-medium">First HTML</th>
              <th className="px-3 py-2 font-medium">Server work</th>
              <th className="px-3 py-2 font-medium">Freshness</th>
              <th className="px-3 py-2 font-medium">Search</th>
            </tr>
          </thead>
          <tbody>
            {STRATEGY_ROWS.map((r) => (
              <tr key={r.name} className="border-b last:border-b-0">
                <th scope="row" className="px-3 py-1.5 font-medium">
                  {r.name}
                </th>
                <td className="px-3 py-1.5">{r.html}</td>
                <td className="px-3 py-1.5">{r.server}</td>
                <td className="px-3 py-1.5">{r.fresh}</td>
                <td className="px-3 py-1.5">{r.search}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
