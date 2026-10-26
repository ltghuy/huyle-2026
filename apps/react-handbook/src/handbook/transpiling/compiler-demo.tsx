"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeEditor } from "@/components/playground/code-editor";
import { CodePanel } from "@/handbook/build-pipeline/code-panel";
import { cn } from "@/lib/utils";

import { AstTree } from "./ast-tree";
import type { AnyNode, Token } from "./compiler/ast";
import { compile, type CompileOk, lineStarts, position } from "./compiler";
import { SourceView } from "./source-view";

export const COUNTER_SAMPLE = `import { useState } from "react";
import type { ReactNode } from "react";

type Props = { label: string; initial?: number; children?: ReactNode };

export function Counter({ label, initial = 0, children }: Props) {
  const [count, setCount] = useState<number>(initial);
  const double = (n: number): number => n * 2;
  return (
    <div className="counter">
      <p>
        {label}: {count} (doubled {double(count)})
      </p>
      <button onClick={() => setCount(count + 1)}>Add one</button>
      {children}
    </div>
  );
}
`;

const SUPPORTED = [
  "import and export (including import type and export type)",
  "const, let and var with destructuring; functions and arrow functions, async and await",
  "if/else, for…of, return and throw",
  "expressions: calls, members, ?., ??, operators, ternaries, templates, objects, arrays, spread, regex",
  "types: annotations, type and interface, generics, unions, tuples, function types, as, satisfies, !",
  "JSX: elements, fragments, attributes, spread props, expressions and text",
];

const NOT_SUPPORTED = "classes, enums, namespaces, decorators, switch, while, try/catch, function expressions, generators and comments in the output.";

function tokenText(token: Token) {
  return token.kind === "jsxText" ? JSON.stringify(token.text) : token.text;
}

function TokenList({ tokens, source, selected, onSelect }: { tokens: Token[]; source: string; selected: AnyNode | null; onSelect: (token: Token) => void }) {
  const starts = useMemo(() => lineStarts(source), [source]);
  return (
    <div role="region" aria-label={`Tokens (${tokens.length})`} tabIndex={-1} className="max-h-96 overflow-auto rounded-lg border">
      <ol className="divide-y font-mono text-xs">
        {tokens.map((token) => {
          const at = position(starts, token.start);
          const isSelected = selected?.start === token.start && selected.end === token.end;
          return (
            <li key={token.start}>
              <button
                type="button"
                onClick={() => onSelect(token)}
                aria-pressed={isSelected}
                className={cn("grid w-full grid-cols-[6.5rem_1fr_3.5rem] gap-2 px-2 py-1 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50", isSelected && "bg-primary/15")}
              >
                <span className="text-foreground/70">{token.kind}</span>
                <span className="truncate whitespace-pre">{tokenText(token)}</span>
                <span className="text-right text-foreground/70 tabular-nums">
                  {at.line + 1}:{at.column + 1}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function CompilerDemo() {
  const [source, setSource] = useState(COUNTER_SAMPLE);
  const [selected, setSelected] = useState<AnyNode | null>(null);
  const deferred = useDeferredValue(source);
  const result = useMemo(() => compile(deferred, { jsx: "automatic" }), [deferred]);
  const [lastGood, setLastGood] = useState<CompileOk>(() => compile(COUNTER_SAMPLE, { jsx: "automatic" }) as CompileOk);
  // Keep the last successful compile to show (marked stale) while the source has an error.
  if (result.ok && result !== lastGood) setLastGood(result);
  const shown = result.ok ? result : lastGood;
  const stale = !result.ok;

  function handleSourceChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setSource(e.target.value);
    setSelected(null);
  }

  function handleTokenSelect(token: Token) {
    setSelected({ type: `${token.kind} token`, start: token.start, end: token.end });
  }

  function handleReset() {
    setSource(COUNTER_SAMPLE);
    setSelected(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="compiler-source" className="font-mono text-xs">
              Counter.tsx (edit me)
            </Label>
            <Button variant="ghost" size="sm" onClick={handleReset} disabled={source === COUNTER_SAMPLE}>
              <RotateCcw aria-hidden />
              Reset
            </Button>
          </div>
          <CodeEditor lang="ts" id="compiler-source" value={source} onChange={handleSourceChange} className="min-h-72" />
          <div aria-live="polite">
            {result.ok ? null : (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />
                <span>
                  <strong>
                    Line {result.error.line + 1}, column {result.error.column + 1}:
                  </strong>{" "}
                  {result.error.message}. The views show the last version that compiled.
                </span>
              </p>
            )}
          </div>
          {selected ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">
                Where <span className="font-mono text-foreground">{selected.type}</span> came from in the source:
              </p>
              <SourceView source={stale ? lastGoodSource(lastGood) : deferred} highlight={selected} label="Source with the selected node highlighted" />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Pick a token or a tree node to highlight the source text it came from.</p>
          )}
        </div>

        <Tabs defaultValue="tree" className={cn("min-w-0", stale && "opacity-60")}>
          <TabsList aria-label="Compiler stages">
            <TabsTrigger value="tokens">1. Tokens</TabsTrigger>
            <TabsTrigger value="tree">2. Syntax tree</TabsTrigger>
            <TabsTrigger value="output">3. JavaScript</TabsTrigger>
          </TabsList>
          {stale ? <p className="text-xs font-medium">Stale: from the last version that compiled.</p> : null}
          <TabsContent value="tokens" className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">The scanner&apos;s output: {shown.tokens.length} tokens. Whitespace and comments are skipped.</p>
            <TokenList tokens={shown.tokens} source={stale ? lastGoodSource(lastGood) : deferred} selected={selected} onSelect={handleTokenSelect} />
          </TabsContent>
          <TabsContent value="tree" className="flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">
              The parser&apos;s output. Nodes marked <span className="rounded-sm border px-1 text-[0.625rem]">type</span> exist only for the type checker; the transform deletes them.
            </p>
            <AstTree root={shown.ast} selected={selected} onSelect={setSelected} label="Syntax tree" />
          </TabsContent>
          <TabsContent value="output">
            <CodePanel title="Counter.js" code={shown.code} />
          </TabsContent>
        </Tabs>
      </div>

      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer font-medium">What this simplified compiler supports</summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-foreground/85">
          {SUPPORTED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-2 text-foreground/85">Not supported: {NOT_SUPPORTED}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          It was checked against TypeScript&apos;s own per-file transpile (react-jsx, target ESNext): for the samples on this page the output is the same apart from
          formatting.
        </p>
      </details>
    </div>
  );
}

function lastGoodSource(result: CompileOk) {
  return result.map.sourcesContent[0];
}
