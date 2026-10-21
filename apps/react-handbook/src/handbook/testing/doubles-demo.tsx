"use client";

import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Choice } from "@/handbook/jwt/token-view";
import { findProducts, type SearchShape, shapeReply } from "@/server/handbook/testing-search.schema";

import { expect, type TestResult, runTests } from "./harness";
import { TestResults } from "./test-results";

// The code under test, written against v1 of the search contract.
type GetJson = (url: string) => Promise<unknown>;

async function searchNames(query: string, getJson: GetJson): Promise<string[]> {
  const body = (await getJson(`/api/handbook/testing/search?q=${encodeURIComponent(query)}`)) as { items: { name: string }[] };
  return body.items.map((item) => item.name);
}

const APP_SOURCE = `async function searchNames(query, getJson) {
  const body = await getJson(\`/api/handbook/testing/search?q=\${query}\`);
  return body.items.map((item) => item.name);
}

test("finds mugs", async () => {
  expect(await searchNames("mug", getJson)).toEqual(["Café mug", "Travel mug"]);
});`;

type Cut = "mock" | "fake" | "real";

const CUTS: readonly { id: Cut; title: string; detail: string; source: string }[] = [
  {
    id: "mock",
    title: "Mock the function",
    detail: "A hand-written reply, plus an expectation that it was called once.",
    source: `const getJson = vi.fn(async () => ({
  items: [{ id: 1, name: "Café mug" }, { id: 2, name: "Travel mug" }],
}));
// after the test:
expect(getJson).toHaveBeenCalledTimes(1);`,
  },
  {
    id: "fake",
    title: "Fake the network",
    detail: "Answers the request with the shared contract module, the same one the server uses.",
    source: `// a request handler, like Mock Service Worker's
const getJson = async (url) => {
  const q = new URL(url, location.href).searchParams.get("q");
  return shapeReply(findProducts(q), serverShape);
};`,
  },
  {
    id: "real",
    title: "Call the real server",
    detail: "A real request to this site's route.",
    source: `const getJson = async (url) =>
  (await fetch(\`\${url}&shape=\${serverShape}\`)).json();`,
  },
];

const SHAPE_OPTIONS = [
  { value: "v1", label: "v1: { items: [{ id, name }] }" },
  { value: "v2", label: "v2: { results: [{ sku, title }] }" },
] as const;

const EXPECTED = ["Café mug", "Travel mug"];

function getterFor(cut: Cut, shape: SearchShape, calls: string[]): GetJson {
  if (cut === "mock") {
    return async (url) => {
      calls.push(url);
      return { items: [{ id: 1, name: "Café mug" }, { id: 2, name: "Travel mug" }] };
    };
  }
  if (cut === "fake") {
    return async (url) => {
      calls.push(url);
      const q = new URL(url, window.location.href).searchParams.get("q") ?? "";
      return shapeReply(findProducts(q), shape);
    };
  }
  return async (url) => {
    calls.push(url);
    const response = await fetch(`${url}&shape=${shape}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`The server answered ${response.status}`);
    return response.json();
  };
}

async function runCut(cut: Cut, shape: SearchShape): Promise<TestResult[]> {
  const calls: string[] = [];
  const getJson = getterFor(cut, shape, calls);
  return runTests([
    {
      name: "finds mugs",
      async run() {
        expect(await searchNames("mug", getJson)).toEqual(EXPECTED);
        if (cut === "mock") expect(calls.length).toBe(1);
      },
    },
  ]);
}

type Results = Partial<Record<Cut, TestResult[]>>;

function summary(shape: SearchShape, results: Results) {
  if (!results.mock || !results.fake || !results.real) return null;
  const mockPass = results.mock.every((r) => r.pass);
  const realPass = results.real.every((r) => r.pass);
  if (shape === "v1") return "The server still speaks v1, so the app works and every test passes.";
  if (mockPass && !realPass) return "The mocked test still passes, yet the app is broken against the real server: the hand-written reply hides the change. The fake answers from the shared contract, so it fails along with the real server.";
  return "Compare the three results above.";
}

export function DoublesDemo() {
  const [shape, setShape] = useState<SearchShape>("v1");
  const [results, setResults] = useState<Results>({});
  const [running, setRunning] = useState(false);
  const runId = useRef(0);

  function handleShape(next: SearchShape) {
    runId.current += 1;
    setShape(next);
    setResults({});
    setRunning(false);
  }

  async function handleRun() {
    const id = ++runId.current;
    setRunning(true);
    const [mock, fake, real] = await Promise.all([runCut("mock", shape), runCut("fake", shape), runCut("real", shape)]);
    if (id !== runId.current) return;
    setResults({ mock, fake, real });
    setRunning(false);
  }

  const text = summary(shape, results);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2">
          <h4 className="text-sm font-medium">The app code and its test</h4>
          <pre className="relative overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-xs leading-relaxed" tabIndex={0} aria-label="App code and test">
            {APP_SOURCE}
          </pre>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <Choice legend="The server ships" value={shape} options={SHAPE_OPTIONS} onChange={handleShape} />
          <p className="text-sm text-foreground/85">
            The app code reads <code className="font-mono text-xs">body.items</code>. Switch the server to v2 to rename the fields, then run the same test with each kind of double.
          </p>
          <div>
            <Button onClick={handleRun} disabled={running}>
              {running ? "Running…" : "Run the test three ways"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 lg:grid-cols-3" aria-live="polite">
        {CUTS.map((cut) => (
          <div key={cut.id} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
            <h4 className="text-sm font-medium">{cut.title}</h4>
            <p className="text-xs text-foreground/75">{cut.detail}</p>
            <pre className="relative overflow-auto rounded-md bg-muted/40 p-2 font-mono text-[0.6875rem] leading-relaxed" tabIndex={0} aria-label={`${cut.title}: test double`}>
              {cut.source}
            </pre>
            <TestResults results={results[cut.id] ?? []} empty={running ? "Running…" : "Not run yet"} />
          </div>
        ))}
      </div>

      {text ? (
        <p className="rounded-lg bg-muted/40 p-3 text-sm" role="status">
          {text}
        </p>
      ) : null}
    </div>
  );
}
