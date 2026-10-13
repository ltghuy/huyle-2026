"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CodePanel } from "@/handbook/build-pipeline/code-panel";
import { Choice } from "@/handbook/jwt/token-view";

import { compileSass } from "./sass/compile";
import { SASS_SAMPLES } from "./sass/samples";

type SampleId = (typeof SASS_SAMPLES)[number]["value"];

const OPTIONS = SASS_SAMPLES.map((s) => ({ value: s.value, label: s.label }));

export function SassDemo() {
  const [sample, setSample] = useState<SampleId>("card");
  const [source, setSource] = useState<string>(SASS_SAMPLES[0].code);
  const deferred = useDeferredValue(source);
  const result = useMemo(() => compileSass(deferred), [deferred]);
  const [lastCss, setLastCss] = useState(() => (compileSass(SASS_SAMPLES[0].code) as { css: string }).css);
  // Keep the last good output on screen while the source has an error.
  if (result.ok && result.css !== lastCss) setLastCss(result.css);

  function handleSampleChange(value: SampleId) {
    setSample(value);
    setSource(SASS_SAMPLES.find((s) => s.value === value)!.code);
  }

  return (
    <div className="flex flex-col gap-4">
      <Choice legend="Sample" value={sample} options={OPTIONS} onChange={handleSampleChange} />
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="sass-source" className="font-mono text-xs">
            styles.scss (edit me)
          </Label>
          <Textarea id="sass-source" value={source} onChange={(e) => setSource(e.target.value)} spellCheck={false} wrap="off" className="min-h-80 font-mono text-xs leading-relaxed" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div aria-live="polite">
            {result.ok ? null : (
              <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs">
                <strong>Line {result.line}:</strong> {result.message}. Showing the last CSS that compiled.
              </p>
            )}
          </div>
          <CodePanel title={result.ok ? "styles.css" : "styles.css (stale)"} code={result.ok ? result.css : lastCss} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Simplified compiler for a subset of SCSS (variables, nesting, &amp;, @media, @mixin/@include); its output for these samples is the same as Dart Sass 1.93.
        Not supported: @use, @extend, control flow, functions and arithmetic.
      </p>
    </div>
  );
}
