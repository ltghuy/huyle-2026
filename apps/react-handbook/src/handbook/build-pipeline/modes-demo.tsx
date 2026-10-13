"use client";

import { useState } from "react";

import { Choice } from "@/handbook/jwt/token-view";

import { CodePanel } from "./code-panel";
import { DEV_OUTPUT, MINIFIED, modeFlagSteps } from "./sample";
import { sizeLabel, useSize } from "./sizes";

type Mode = "development" | "production";

const OPTIONS = [
  { value: "development", label: "Development" },
  { value: "production", label: "Production" },
] as const satisfies readonly { value: Mode; label: string }[];

const TRAITS: readonly { label: string; development: string; production: string }[] = [
  { label: "File name", development: "main.js: the same name every time", production: "index-<hash>.js: changes when the content changes" },
  { label: "Minified", development: "No: readable, with module paths kept", production: "Yes: no whitespace, one-letter local names" },
  { label: "Source map", development: "Inlined into the file as a data: URL, for fast rebuilds", production: "A separate .map file, served or uploaded to your error tracker" },
  {
    label: "Development-only checks",
    development: "Kept: your console.log, and React's development build with its warnings",
    production: "Removed: the same flag also picks React's production build",
  },
  { label: "On save", development: "Rebuild only what changed, in memory, then hot-update the page", production: "One full build to disk; nothing watches for changes" },
];

export function ModesDemo() {
  const [mode, setMode] = useState<Mode>("development");
  const devSize = useSize(DEV_OUTPUT);
  const prodSize = useSize(MINIFIED);

  return (
    <div className="flex flex-col gap-4">
      <Choice legend="Build mode" value={mode} options={OPTIONS} onChange={setMode} />

      <dl className="grid gap-2 text-sm sm:grid-cols-2" aria-live="polite">
        {TRAITS.map((trait) => (
          <div key={trait.label} className="rounded-lg border p-2">
            <dt className="text-xs text-muted-foreground">{trait.label}</dt>
            <dd>{trait[mode]}</dd>
          </div>
        ))}
        <div className="rounded-lg border p-2">
          <dt className="text-xs text-muted-foreground">Size of the sample&apos;s code</dt>
          <dd className="tabular-nums">
            {sizeLabel(mode === "development" ? devSize : prodSize)}{" "}
            <span className="text-xs text-foreground/75">(the other mode: {sizeLabel(mode === "development" ? prodSize : devSize)})</span>
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">How the mode flag removes a branch</h4>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {modeFlagSteps(mode).map((step, i) => (
            <li key={step.label} className="flex flex-col gap-1 rounded-lg border p-2">
              <span className="text-xs text-muted-foreground">
                {i + 1}. {step.label}
              </span>
              <code className="font-mono text-xs break-words">{step.code}</code>
            </li>
          ))}
        </ol>
      </div>

      <CodePanel title={mode === "development" ? "main.js (development)" : "index-<hash>.js (production)"} code={mode === "development" ? DEV_OUTPUT : MINIFIED} wrap={mode === "production"} />
      <p className="text-xs text-muted-foreground">Simplified: the sample app from the stages demo, with React&apos;s own code left out. Sizes are measured in your browser.</p>
    </div>
  );
}
