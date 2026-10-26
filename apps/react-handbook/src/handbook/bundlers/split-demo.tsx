"use client";

import { FileText, Play, Settings } from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodePanel } from "@/handbook/build-pipeline/code-panel";
import { formatBytes } from "@/handbook/build-pipeline/sizes";
import { Toggle } from "@/handbook/ui";

import { planChunks } from "./bundler/chunks";
import { buildGraph } from "./bundler/graph";
import { bundle } from "./bundler/link";
import { callExport, type RunEvent, type RunHandle, runBundle } from "./bundler/runtime";
import { SPLIT } from "./projects";
import { RunLog } from "./run-log";

const encoder = new TextEncoder();
const KIND_LABEL = { entry: "entry chunk", lazy: "lazy chunk", shared: "shared chunk" } as const;

export function SplitDemo() {
  const [splitShared, setSplitShared] = useState(false);
  const graph = useMemo(() => buildGraph(SPLIT, "src/main.ts"), []);
  const { chunks, files } = useMemo(() => {
    const { plan, chunks: info } = planChunks(graph, { splitShared });
    return { chunks: info, files: bundle(graph, { chunks: plan }) };
  }, [graph, splitShared]);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [handle, setHandle] = useState<RunHandle | null>(null);
  const run = useRef(0);

  const downloaded = events.filter((e) => e.kind === "loaded").length;
  const bytes = (name: string) => encoder.encode(files.find((f) => f.name === name)?.code ?? "").byteLength;

  function handleStart() {
    const id = ++run.current;
    const collected: RunEvent[] = [];
    const onEvent = (e: RunEvent) => {
      if (run.current !== id) return;
      collected.push(e);
      setEvents([...collected]);
    };
    setEvents([]);
    setHandle(runBundle(files, { latencyMs: 500, onEvent }));
  }

  function handleOpen(name: "openAbout" | "openSettings") {
    if (!handle) return;
    const id = run.current;
    void callExport(handle, name, (e) => {
      if (run.current === id) setEvents((current) => [...current, e]);
    });
  }

  function handleSplitChange(checked: boolean) {
    run.current++;
    setSplitShared(checked);
    setEvents([]);
    setHandle(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <Toggle
        checked={splitShared}
        onCheckedChange={handleSplitChange}
        title="Split shared modules into their own chunk"
        detail="What webpack's splitChunks and Rollup's chunking do by default; off shows the duplication it prevents."
      />
      <ul className="grid gap-2 md:grid-cols-2" aria-label="Chunks">
        {chunks.map((c) => {
          const name = c.id === "main" ? "main.js" : `${c.id}.chunk.js`;
          return (
            <li key={c.id} className="flex flex-col gap-1 rounded-lg border p-2 text-xs">
              <p className="flex flex-wrap items-baseline justify-between gap-2">
                <code className="font-mono text-sm font-medium">{name}</code>
                <span className="text-foreground/75">
                  {KIND_LABEL[c.kind]} · {formatBytes(bytes(name))}
                </span>
              </p>
              <p className="font-mono">{c.modules.join(", ")}</p>
            </li>
          );
        })}
      </ul>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleStart}>
              <Play aria-hidden />
              {handle ? "Reload the page" : "Load the page"}
            </Button>
            <Button variant="outline" onClick={() => handleOpen("openAbout")} disabled={!handle}>
              <FileText aria-hidden />
              Open About
            </Button>
            <Button variant="outline" onClick={() => handleOpen("openSettings")} disabled={!handle}>
              <Settings aria-hidden />
              Open Settings
            </Button>
          </div>
          <RunLog label="Run log: lazy loading" events={events} empty="Load the page, then open the two lazy pages in either order." />
          <p className="text-xs text-muted-foreground">
            {downloaded} chunk downloads so far. Each download waits 500 ms, standing in for the network. A chunk is downloaded at most once; a module in two chunks is
            downloaded twice but runs once, because the runtime caches modules by id.
          </p>
        </div>
        <Tabs defaultValue="main.js" key={files.length} className="min-w-0">
          <TabsList aria-label="Chunk files" className="h-auto max-w-full flex-wrap justify-start">
            {files.map((f) => (
              <TabsTrigger key={f.name} value={f.name} className="flex-none font-mono text-xs">
                {f.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {files.map((f) => (
            <TabsContent key={f.name} value={f.name}>
              <CodePanel title={f.name} code={f.code} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
