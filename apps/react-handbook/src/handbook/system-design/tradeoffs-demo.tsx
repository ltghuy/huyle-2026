"use client";

import { useState } from "react";

import { Choice } from "@/handbook/jwt/token-view";

import { DECISIONS } from "./framework";

const DECISION_OPTIONS = DECISIONS.map((d) => ({ value: d.id, label: d.name }));

export function TradeoffsDemo() {
  const [decisionId, setDecisionId] = useState(DECISIONS[0].id);
  const decision = DECISIONS.find((d) => d.id === decisionId)!;

  return (
    <div className="flex flex-col gap-4">
      <Choice legend="A recurring decision" value={decisionId} options={DECISION_OPTIONS} onChange={setDecisionId} />

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-foreground/85">{decision.intro}</p>
        <span className="flex flex-wrap gap-1.5">
          {decision.servesAxes.map((axis) => (
            <span key={axis} className="rounded-full bg-info/15 px-2 py-0.5 text-xs font-medium text-[color-mix(in_oklch,var(--info),black_25%)] dark:text-info">
              {axis}
            </span>
          ))}
        </span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {decision.options.map((option) => (
          <li key={option.name} className="flex flex-col gap-2 rounded-lg border p-3">
            <h4 className="text-sm font-semibold">{option.name}</h4>
            <p className="text-sm text-foreground/85">{option.what}</p>
            <dl className="flex flex-col gap-1 text-xs">
              <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                <dt className="font-medium text-success">Wins</dt>
                <dd className="text-foreground/85">{option.wins}</dd>
              </div>
              <div className="grid grid-cols-[3.5rem_1fr] gap-x-2">
                <dt className="font-medium text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning">Costs</dt>
                <dd className="text-foreground/85">{option.costs}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <p className="text-xs text-foreground/75">
        No option wins outright: each serves the {decision.servesAxes.join(", ").toLowerCase()} bar differently. A senior answer names the assumption and the alternative along with the pick.
      </p>
    </div>
  );
}
