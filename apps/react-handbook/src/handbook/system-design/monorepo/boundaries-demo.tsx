"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Choice } from "@/handbook/jwt/token-view";
import { Verdict } from "@/handbook/ui";

import { checkImport, type EntryPoint } from "./boundaries";
import { CODE_PROJECTS, project } from "./repo";
import { RepoGraph, type NodeTone } from "./repo-graph";

const PROJECT_ITEMS = CODE_PROJECTS.map((p) => ({ value: p.id, label: p.name }));

const ENTRY_OPTIONS = [
  { value: "root", label: "Package root" },
  { value: "subpath", label: "Exported subpath" },
  { value: "deep", label: "Deep path into src/" },
] as const;

type Attempt = { from: string; to: string; entry: EntryPoint };

const PRESETS: readonly { label: string; attempt: Attempt }[] = [
  { label: "App imports a feature", attempt: { from: "web", to: "billing", entry: "root" } },
  { label: "App imports an app", attempt: { from: "admin", to: "web", entry: "root" } },
  { label: "UI imports the data layer", attempt: { from: "ui", to: "api", entry: "root" } },
  { label: "Deep import", attempt: { from: "marketing", to: "ui", entry: "deep" } },
  { label: "A cycle", attempt: { from: "auth", to: "billing", entry: "root" } },
];

function ProjectSelect({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (id: string) => void }) {
  function handleValueChange(next: string | null) {
    if (next) onChange(next);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select items={PROJECT_ITEMS} value={value} onValueChange={handleValueChange}>
        <SelectTrigger id={id} className="w-full font-mono text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROJECT_ITEMS.map((item) => (
            <SelectItem key={item.value} value={item.value} className="font-mono text-xs">
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function BoundariesDemo() {
  const [attempt, setAttempt] = useState<Attempt>(PRESETS[0].attempt);
  const result = checkImport(attempt.from, attempt.to, attempt.entry);
  const highlight = new Set<string>();
  if (result.cycle) for (let i = 1; i < result.cycle.length - 1; i++) highlight.add(`${result.cycle[i]}>${result.cycle[i + 1]}`);

  function update(patch: Partial<Attempt>) {
    setAttempt((current) => ({ ...current, ...patch }));
  }

  function toneOf(id: string): NodeTone {
    if (id === attempt.from) return "source";
    if (id === attempt.to) return "target";
    return result.cycle?.includes(id) ? "affected" : "muted";
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Example imports">
        {PRESETS.map((preset) => (
          <Button key={preset.label} variant="outline" size="sm" onClick={() => setAttempt(preset.attempt)}>
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ProjectSelect id="boundary-from" label="A file in" value={attempt.from} onChange={(from) => update({ from })} />
        <ProjectSelect id="boundary-to" label="imports" value={attempt.to} onChange={(to) => update({ to })} />
        <div className="sm:col-span-2">
          <Choice legend="Through" value={attempt.entry} options={ENTRY_OPTIONS} onChange={(entry) => update({ entry })} />
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-3 text-sm" aria-live="polite">
        <p className="font-mono text-xs break-all">
          {project(attempt.from).path}/src/index.ts: import &#123; … &#125; from &quot;{result.specifier}&quot;
        </p>
        <p>
          <Verdict pass={result.allowed}>{result.allowed ? "Allowed" : "Rejected by the boundary rules"}</Verdict>
          {result.internal ? <span className="text-foreground/85"> An internal import inside one project: boundary rules don&apos;t apply.</span> : null}
        </p>
        {result.violations.length > 0 ? (
          <ul className="flex flex-col gap-1.5 pl-4">
            {result.violations.map((v) => (
              <li key={v.rule} className="list-disc">
                <strong>{v.rule}:</strong> {v.message}
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-xs text-foreground/75">
          Review needed from <span className="font-mono">{result.reviewers.join(", ")}</span> (CODEOWNERS for {project(attempt.from).path}/).
        </p>
      </div>

      <RepoGraph
        title="Import being checked"
        description={`${project(attempt.from).name} importing ${result.specifier}: ${result.allowed ? "allowed" : `rejected (${result.violations.map((v) => v.rule).join("; ")})`}.`}
        tone={toneOf}
        highlight={highlight}
        proposed={{ from: attempt.from, to: attempt.to, allowed: result.allowed }}
      />
      <p className="text-xs text-foreground/75">
        One example rule set: apps → features → UI or data → utilities, each layer importing only downward (features may also import features). Teams also tag
        projects by domain or team, and some forbid feature-to-feature imports entirely.
      </p>
    </div>
  );
}
