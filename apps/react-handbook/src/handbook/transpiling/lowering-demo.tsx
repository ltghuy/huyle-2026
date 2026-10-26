"use client";

import { useState } from "react";

import { CodePanel } from "@/handbook/build-pipeline/code-panel";
import { sizeLabel, useSize } from "@/handbook/build-pipeline/sizes";
import { Choice } from "@/handbook/jwt/token-view";

import { TYPESCRIPT_VERSION } from "./constructs";
import { SAMPLES, type Target, TARGETS } from "./lowering";

const TARGET_OPTIONS = TARGETS.map((t) => ({ value: t, label: t }));
const SAMPLE_OPTIONS = SAMPLES.map((s) => ({ value: s.id, label: s.label }));

const normalize = (code: string) => code.replace(/\s+/g, "");

function TargetSize({ code, label }: { code: string; label: string }) {
  const size = useSize(code);
  return (
    <li className="flex justify-between gap-2 rounded-md border px-2 py-1 text-xs">
      <span className="font-medium">{label}</span>
      <span className="text-muted-foreground tabular-nums">{sizeLabel(size)}</span>
    </li>
  );
}

export function LoweringDemo() {
  const [sampleId, setSampleId] = useState(SAMPLES[0].id);
  const [target, setTarget] = useState<Target>("ES2015");
  const sample = SAMPLES.find((s) => s.id === sampleId)!;
  const output = sample.outputs[target];
  const unchanged = normalize(output) === normalize(sample.source);

  let verdict: string;
  if (sample.builtin) verdict = "Unchanged at every target: these are functions the browser must provide, not syntax. Older browsers need a polyfill (such as core-js) loaded before your code.";
  else if (unchanged) verdict = `Unchanged: ${target} already has this syntax (it arrived in ${sample.since}).`;
  else verdict = `Rewritten: ${target} predates this syntax (${sample.since}), so the compiler expresses it with older code.`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice legend="Feature" value={sampleId} options={SAMPLE_OPTIONS} onChange={setSampleId} />
        <Choice legend="Target" value={target} options={TARGET_OPTIONS} onChange={setTarget} />
      </div>
      <p aria-live="polite" className="text-sm">
        {verdict}
      </p>
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <CodePanel title="Source" code={sample.source} />
        <CodePanel title={`Output for ${target}`} code={output} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs text-muted-foreground">Output size for each target, measured in your browser:</p>
        <ul className="grid gap-1.5 sm:grid-cols-4">
          {TARGETS.map((t) => (
            <TargetSize key={t} label={t} code={sample.outputs[t]} />
          ))}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">Real output of TypeScript {TYPESCRIPT_VERSION} with helpers inlined (importHelpers off), as a per-file transpile produces it.</p>
    </div>
  );
}
