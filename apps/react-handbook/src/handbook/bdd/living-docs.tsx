"use client";

import type { Background, Examples, Rule, Scenario, Step, Tag } from "@cucumber/messages";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Verdict } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import { exampleTitle, parseGherkin, type StepDef } from "./gherkin";
import { StepInspector } from "./step-inspector";

export type ScenarioResult = { feature: string; title: string; outcome: "expected" | "unexpected" | "flaky" | "skipped"; durationMs: number };

type Props = {
  features: readonly { path: string; text: string }[];
  results: readonly ScenarioResult[];
  ranAt: string | null;
  defs: readonly StepDef[];
};

const DATE = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" });

function tagNames(tags: readonly Tag[]) {
  return tags.map((t) => t.name);
}

function ResultBadge({ result }: { result: ScenarioResult | undefined }) {
  if (!result) return <span className="text-xs text-foreground/75">Not run yet</span>;
  const pass = result.outcome === "expected" || result.outcome === "flaky";
  const label = result.outcome === "expected" ? "Passed" : result.outcome === "flaky" ? "Passed on retry" : result.outcome === "skipped" ? "Skipped" : "Failed";
  return (
    <span className="inline-flex items-center gap-2 text-xs whitespace-nowrap">
      <Verdict pass={pass}>{label}</Verdict>
      <span className="font-mono text-foreground/75 tabular-nums">{(result.durationMs / 1000).toFixed(1)} s</span>
    </span>
  );
}

function Steps({ steps, selected, onSelect }: { steps: readonly Step[]; selected: string | null; onSelect: (text: string) => void }) {
  return (
    <ol className="flex flex-col gap-0.5 font-mono text-xs leading-relaxed">
      {steps.map((step) => (
        <li key={step.id}>
          <button
            type="button"
            aria-pressed={selected === step.text}
            onClick={() => onSelect(step.text)}
            className={cn("rounded-sm px-1 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50", selected === step.text && "bg-primary/10")}
          >
            <span className="font-semibold">{step.keyword.trim()}</span> {step.text}
          </button>
        </li>
      ))}
    </ol>
  );
}

function ExamplesTable({ examples, outline, feature, results, startIndex }: { examples: Examples; outline: Scenario; feature: string; results: readonly ScenarioResult[]; startIndex: number }) {
  const header = examples.tableHeader?.cells.map((c) => c.value) ?? [];
  return (
    <div className="relative overflow-x-auto" role="region" aria-label={`Examples for ${outline.name}`} tabIndex={0}>
      <table className="w-full min-w-[28rem] text-left text-xs">
        <thead>
          <tr className="border-b">
            {header.map((h) => (
              <th key={h} className="py-1 pr-3 font-medium">
                {h}
              </th>
            ))}
            <th className="py-1 font-medium">Latest run</th>
          </tr>
        </thead>
        <tbody>
          {examples.tableBody.map((row, i) => {
            const values = row.cells.map((c) => c.value);
            const title = exampleTitle(outline.name, header, values, startIndex + i);
            return (
              <tr key={row.id} className="border-b last:border-0">
                {values.map((v, j) => (
                  <td key={j} className="py-1 pr-3 font-mono">
                    {v}
                  </td>
                ))}
                <td className="py-1">
                  <ResultBadge result={results.find((r) => r.feature === feature && r.title === title)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ScenarioView({ scenario, feature, inherited, results, selected, onSelect }: { scenario: Scenario; feature: string; inherited: string[]; results: readonly ScenarioResult[]; selected: string | null; onSelect: (text: string) => void }) {
  const tags = [...inherited, ...tagNames(scenario.tags)];
  // Example numbers run on across an outline's examples tables, as the runner counts them.
  const starts = scenario.examples.map((_, i) => 1 + scenario.examples.slice(0, i).reduce((n, e) => n + e.tableBody.length, 0));
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h5 className="text-sm font-medium">
          <span className="text-foreground/75">{scenario.keyword}:</span> {scenario.name}
        </h5>
        {scenario.examples.length === 0 ? <ResultBadge result={results.find((r) => r.feature === feature && r.title === scenario.name)} /> : null}
      </div>
      {tags.length > 0 ? <p className="font-mono text-xs text-foreground/75">{tags.join(" ")}</p> : null}
      <Steps steps={scenario.steps} selected={selected} onSelect={onSelect} />
      {scenario.examples.map((examples, i) => (
        <ExamplesTable key={examples.id} examples={examples} outline={scenario} feature={feature} results={results} startIndex={starts[i]} />
      ))}
    </section>
  );
}

function hasTag(scenario: Scenario, inherited: string[], tag: string | null) {
  return tag === null || inherited.includes(tag) || tagNames(scenario.tags).includes(tag);
}

export function LivingDocs({ features, results, ranAt, defs }: Props) {
  const parsed = useMemo(() => features.map((f) => ({ path: f.path, ...parseGherkin(f.text, f.path) })), [features]);
  const [tag, setTag] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const f of parsed) {
      const feature = f.document?.feature;
      if (!feature) continue;
      tagNames(feature.tags).forEach((t) => set.add(t));
      for (const child of feature.children) {
        const scenarios = child.rule ? child.rule.children.flatMap((c) => (c.scenario ? [c.scenario] : [])) : child.scenario ? [child.scenario] : [];
        scenarios.forEach((s) => tagNames(s.tags).forEach((t) => set.add(t)));
      }
    }
    return [...set].sort();
  }, [parsed]);

  function renderChildren(children: readonly { background?: Background; scenario?: Scenario; rule?: Rule }[], feature: string, inherited: string[]) {
    return children.map((child) => {
      if (child.background) {
        return (
          <section key={child.background.id} className="flex flex-col gap-1 rounded-lg bg-muted/40 p-3">
            <h5 className="text-xs font-medium text-foreground/75">Background: before every scenario</h5>
            <Steps steps={child.background.steps} selected={selected} onSelect={setSelected} />
          </section>
        );
      }
      if (child.rule) {
        const ruleTags = [...inherited, ...tagNames(child.rule.tags)];
        const visible = child.rule.children.some((c) => c.scenario && hasTag(c.scenario, ruleTags, tag));
        if (!visible) return null;
        return (
          <section key={child.rule.id} className="flex flex-col gap-2 border-l-2 pl-3">
            <h5 className="text-sm font-semibold">Rule: {child.rule.name}</h5>
            {renderChildren(child.rule.children, feature, ruleTags)}
          </section>
        );
      }
      if (child.scenario && hasTag(child.scenario, inherited, tag)) {
        return <ScenarioView key={child.scenario.id} scenario={child.scenario} feature={feature} inherited={[]} results={results} selected={selected} onSelect={setSelected} />;
      }
      return null;
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-foreground/75">Show:</span>
        <Button size="sm" variant={tag === null ? "default" : "outline"} aria-pressed={tag === null} onClick={() => setTag(null)}>
          Everything
        </Button>
        {allTags.map((t) => (
          <Button key={t} size="sm" variant={tag === t ? "default" : "outline"} aria-pressed={tag === t} onClick={() => setTag(t)} className="font-mono">
            {t}
          </Button>
        ))}
      </div>
      <p className="text-xs text-foreground/75">
        {ranAt ? `Results from the latest recorded run, ${DATE.format(new Date(ranAt))}.` : "No run has been recorded yet."} Select a step to see the code it runs.
      </p>

      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        {parsed.map((f) => {
          const feature = f.document?.feature;
          if (!feature) return <p key={f.path}>{f.path} could not be read.</p>;
          const featureTags = tagNames(feature.tags);
          if (tag !== null && !featureTags.includes(tag) && !JSON.stringify(feature.children).includes(`"name":"${tag}"`)) return null;
          return (
            <article key={f.path} className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
              <header className="flex flex-col gap-1">
                <p className="font-mono text-xs text-foreground/75">
                  {f.path} {featureTags.join(" ")}
                </p>
                <h4 className="font-semibold">Feature: {feature.name}</h4>
                <p className="text-sm whitespace-pre-line text-foreground/85">{feature.description.trim().replace(/\n\s+/g, " ")}</p>
              </header>
              {renderChildren(feature.children, feature.name, featureTags)}
            </article>
          );
        })}
      </div>

      {selected ? (
        <div className="rounded-lg border p-3" aria-live="polite">
          <StepInspector text={selected} defs={defs} />
        </div>
      ) : null}
    </div>
  );
}
