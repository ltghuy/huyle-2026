"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { CodeEditor } from "@/components/playground/code-editor";
import { CodePanel } from "@/handbook/build-pipeline/code-panel";
import { cn } from "@/lib/utils";

import { compile, lineStarts, type Mapping } from "./compiler";
import { SourceView } from "./source-view";

const SAMPLE = `type Props = { name: string };

export function Greeting({ name }: Props) {
  const upper: string = name.toUpperCase();
  return <h1 title={upper}>Hello, {name}!</h1>;
}
`;

/** Offset of a 0-based line and column. */
function offsetOf(starts: number[], line: number, column: number) {
  return (starts[line] ?? 0) + column;
}

/** The output with the selected segment marked: from its column to the next segment on the same line. */
function OutputView({ code, mappings, selected }: { code: string; mappings: Mapping[]; selected: number | null }) {
  const starts = useMemo(() => lineStarts(code), [code]);
  if (selected === null) return <SourceView source={code} highlight={null} label="Output" />;
  const m = mappings[selected];
  const next = mappings[selected + 1];
  const start = offsetOf(starts, m.genLine, m.genColumn);
  const lineEnd = code.indexOf("\n", start);
  const end = next && next.genLine === m.genLine ? offsetOf(starts, next.genLine, next.genColumn) : lineEnd === -1 ? code.length : lineEnd;
  return <SourceView source={code} highlight={{ start, end }} label="Output with the selected segment highlighted" />;
}

export function SourceMapDemo() {
  const [source, setSource] = useState(SAMPLE);
  const [selected, setSelected] = useState<number | null>(null);
  const deferred = useDeferredValue(source);
  const result = useMemo(() => compile(deferred, { jsx: "automatic", fileName: "Greeting.tsx" }), [deferred]);
  const srcStarts = useMemo(() => lineStarts(deferred), [deferred]);

  function handleSourceChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setSource(e.target.value);
    setSelected(null);
  }

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-3">
        <Label htmlFor="map-source" className="font-mono text-xs">
          Greeting.tsx (edit me)
        </Label>
        <CodeEditor lang="ts" id="map-source" value={source} onChange={handleSourceChange} className="min-h-40" />
        <p aria-live="polite" className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs">
          Line {result.error.line + 1}, column {result.error.column + 1}: {result.error.message}
        </p>
      </div>
    );
  }

  // The raw VLQ text of each segment, in the same order as the decoded list.
  const rawSegments = result.map.mappings.split(";").flatMap((line) => line.split(",").filter(Boolean));
  const mapping = selected !== null ? result.mappings[selected] : null;
  const srcOffset = mapping ? offsetOf(srcStarts, mapping.srcLine, mapping.srcColumn) : -1;
  const srcEnd = mapping ? srcOffset + (mapping.name?.length ?? 1) : -1;
  const mapJson = JSON.stringify({ ...result.map, sourcesContent: ["…the original file, so the developer tools can show it…"] }, null, 2);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="map-source" className="font-mono text-xs">
            Greeting.tsx (edit me)
          </Label>
          <CodeEditor lang="ts" id="map-source" value={source} onChange={handleSourceChange} className="min-h-40" />
          <p className="text-xs text-muted-foreground">The source, with the selected segment&apos;s original position marked:</p>
          <SourceView source={deferred} highlight={mapping ? { start: srcOffset, end: srcEnd } : null} label="Source with the mapped position highlighted" />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="font-mono text-xs font-medium">Greeting.js</p>
          <OutputView code={result.code} mappings={result.mappings} selected={selected} />
          <p aria-live="polite" className="min-h-10 text-xs">
            {mapping
              ? `Output ${mapping.genLine + 1}:${mapping.genColumn + 1} came from Greeting.tsx ${mapping.srcLine + 1}:${mapping.srcColumn + 1}${mapping.name ? `, the name "${mapping.name}"` : ""}.`
              : "Pick a segment below to see where that part of the output came from."}
          </p>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">
            {result.mappings.length} segments, decoded back from the map&apos;s mappings string (right: each segment as written, relative to the one before):
          </p>
          <div role="region" aria-label="Decoded segments" tabIndex={-1} className="max-h-72 overflow-auto rounded-lg border">
            <ol className="divide-y font-mono text-xs">
              {result.mappings.map((m, i) => (
                <li key={`${m.genLine}:${m.genColumn}`}>
                  <button
                    type="button"
                    onClick={() => setSelected(i)}
                    aria-pressed={selected === i}
                    className={cn("grid w-full grid-cols-[1fr_auto] gap-2 px-2 py-1 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50", selected === i && "bg-primary/15")}
                  >
                    <span>
                      out {m.genLine + 1}:{m.genColumn + 1} → src {m.srcLine + 1}:{m.srcColumn + 1}
                      {m.name ? ` (${m.name})` : ""}
                    </span>
                    <span className="text-foreground/70">{rawSegments[i]}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <CodePanel title="Greeting.js.map" code={mapJson} wrap />
      </div>
    </div>
  );
}
