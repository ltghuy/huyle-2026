"use client";

import { useDeferredValue, useMemo, useState } from "react";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CodePanel } from "@/handbook/build-pipeline/code-panel";
import { Choice } from "@/handbook/jwt/token-view";

import { compile, type JsxRuntime } from "./compiler";

const RUNTIMES = [
  { value: "automatic", label: "Automatic (React 17+)" },
  { value: "classic", label: "Classic" },
] as const satisfies readonly { value: JsxRuntime; label: string }[];

const EXAMPLES = [
  {
    value: "list",
    label: "A list with keys",
    code: `export function List({ items }: { items: { id: string; title: string }[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{item.title}</li>
      ))}
    </ul>
  );
}
`,
  },
  {
    value: "fragment",
    label: "A fragment, several children",
    code: `export const Page = ({ user }: { user: string }) => (
  <>
    <h1>Hello, {user}!</h1>
    <p>You have new messages.</p>
  </>
);
`,
  },
  {
    value: "props",
    label: "Spread props, then a key",
    code: `export const Row = (props: { id: string; label: string }) => (
  <Item {...props} key={props.id} selected />
);
`,
  },
] as const;

type ExampleId = (typeof EXAMPLES)[number]["value"];

const OPTIONS = EXAMPLES.map((e) => ({ value: e.value, label: e.label }));

export function JsxDemo() {
  const [runtime, setRuntime] = useState<JsxRuntime>("automatic");
  const [example, setExample] = useState<ExampleId>("list");
  const [source, setSource] = useState<string>(EXAMPLES[0].code);
  const deferred = useDeferredValue(source);
  const result = useMemo(() => compile(deferred, { jsx: runtime }), [deferred, runtime]);

  function handleExampleChange(value: ExampleId) {
    setExample(value);
    setSource(EXAMPLES.find((e) => e.value === value)!.code);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice legend="JSX runtime" value={runtime} options={RUNTIMES} onChange={setRuntime} />
        <Choice legend="Example" value={example} options={OPTIONS} onChange={handleExampleChange} />
      </div>
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="jsx-source" className="font-mono text-xs">
            Example.tsx (edit me)
          </Label>
          <Textarea id="jsx-source" value={source} onChange={(e) => setSource(e.target.value)} spellCheck={false} wrap="off" className="min-h-56 font-mono text-xs leading-relaxed" />
        </div>
        <div aria-live="polite" className="min-w-0">
          {result.ok ? (
            <CodePanel title={runtime === "automatic" ? "Example.js (automatic runtime)" : "Example.js (classic runtime)"} code={result.code} />
          ) : (
            <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-xs">
              Line {result.error.line + 1}, column {result.error.column + 1}: {result.error.message}
            </p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        {runtime === "classic"
          ? "Classic: every element is React.createElement(type, props, ...children), so React must be in scope: the reason for import React in every file before React 17."
          : "Automatic: the compiler adds the import from react/jsx-runtime itself. The key is passed separately, children go into props, and jsxs marks a static list of several children so React doesn't warn about missing keys. A key after a spread can't be pulled out safely, so it falls back to createElement."}
      </p>
    </div>
  );
}
