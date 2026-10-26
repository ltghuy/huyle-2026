"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { Choice } from "@/handbook/jwt/token-view";
import { Toggle } from "@/handbook/ui";

import { approach } from "./composition";
import { DEFAULT_ANSWERS, recommend, type FitAnswers, type Verdict } from "./fit";

const TEAM_OPTIONS = [
  { value: "one", label: "One" },
  { value: "few", label: "Two or three" },
  { value: "many", label: "Four or more" },
] as const;
const BLOCKING_OPTIONS = [
  { value: "rarely", label: "Rarely" },
  { value: "sometimes", label: "Sometimes" },
  { value: "often", label: "Every week" },
] as const;
const FRAMEWORK_OPTIONS = [
  { value: "one", label: "One framework" },
  { value: "migrating", label: "Migrating off a legacy app" },
  { value: "several", label: "Several, by choice" },
] as const;
const LAYOUT_OPTIONS = [
  { value: "pages", label: "Each team owns whole pages" },
  { value: "mixed", label: "Several teams on one page" },
] as const;
const BUDGET_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "tight", label: "Tight (slow phones, emerging markets)" },
] as const;

const VERDICT_TITLE: Record<Verdict, string> = {
  "one-app": "Stay with one app",
  modular: "Split into modules inside one app",
  "micro-frontends": "Micro frontends",
};

export function FitDemo() {
  const [answers, setAnswers] = useState<FitAnswers>(DEFAULT_ANSWERS);
  const result = recommend(answers);

  function update(patch: Partial<FitAnswers>) {
    setAnswers((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice legend="How many teams build the frontend?" value={answers.teams} options={TEAM_OPTIONS} onChange={(teams) => update({ teams })} />
        <Choice legend="How often does one team's release wait on another's?" value={answers.blocking} options={BLOCKING_OPTIONS} onChange={(blocking) => update({ blocking })} />
        <Choice legend="Frameworks" value={answers.frameworks} options={FRAMEWORK_OPTIONS} onChange={(frameworks) => update({ frameworks })} />
        <Choice legend="How do the teams' parts meet?" value={answers.layout} options={LAYOUT_OPTIONS} onChange={(layout) => update({ layout })} />
        <Choice legend="Performance budget" value={answers.budget} options={BUDGET_OPTIONS} onChange={(budget) => update({ budget })} />
        <Toggle
          checked={answers.seo}
          onCheckedChange={(seo) => update({ seo })}
          title="Content must be in the first HTML"
          detail="Search traffic matters, or first paint on slow devices does."
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm" aria-live="polite">
        <p className="text-xs font-medium text-foreground/75">Recommendation</p>
        <p className="text-base font-semibold">
          {VERDICT_TITLE[result.verdict]}
          {result.approach ? <span className="font-normal text-foreground/85">, composed with: {approach(result.approach).name.toLowerCase()}</span> : null}
        </p>
        <ul className="flex flex-col gap-1.5 pl-4">
          {result.reasons.map((reason) => (
            <li key={reason} className="list-disc text-foreground/85">
              {reason}
            </li>
          ))}
        </ul>
        {result.warnings.map((warning) => (
          <p key={warning} className="flex gap-2 text-foreground/85">
            <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning" />
            <span>
              <span className="font-medium">Watch out:</span> {warning}
            </span>
          </p>
        ))}
      </div>
      <p className="text-xs text-foreground/75">
        One example rule set. Real decisions also weigh how much platform work you can staff: someone has to own the shell, the shared libraries and the contracts.
        The route-level split is the cheapest form, so check whether it is enough before composing pieces on one page.
      </p>
    </div>
  );
}
