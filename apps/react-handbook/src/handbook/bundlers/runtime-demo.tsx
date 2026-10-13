"use client";

import { HelpCircle, Play } from "lucide-react";
import { useDeferredValue, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodePanel } from "@/handbook/build-pipeline/code-panel";
import { Choice } from "@/handbook/jwt/token-view";

import { planChunks } from "./bundler/chunks";
import { buildGraph } from "./bundler/graph";
import { bundle } from "./bundler/link";
import { callExport, type RunEvent, type RunHandle, runBundle } from "./bundler/runtime";
import { FileEditor } from "./file-editor";
import { CIRCULAR, SHOP } from "./projects";
import { RunLog } from "./run-log";
import { useProject } from "./use-project";

const PRESETS = [
  { value: "shop", label: "Shop app", files: SHOP, entry: "src/main.ts" },
  { value: "circular", label: "Circular imports", files: CIRCULAR, entry: "src/a.ts" },
] as const;

type PresetId = (typeof PRESETS)[number]["value"];

const OPTIONS = PRESETS.map((p) => ({ value: p.value, label: p.label }));

export function RuntimeDemo() {
  const [presetId, setPresetId] = useState<PresetId>("shop");
  const preset = PRESETS.find((p) => p.value === presetId)!;
  const { files, update, reset, changed } = useProject(preset.files);
  const deferred = useDeferredValue(files);
  const graph = useMemo(() => buildGraph(deferred, preset.entry), [deferred, preset.entry]);
  const output = useMemo(() => bundle(graph, { chunks: planChunks(graph, { splitShared: false }).plan }), [graph]);
  const [events, setEvents] = useState<RunEvent[]>([]);
  const [handle, setHandle] = useState<RunHandle | null>(null);
  const run = useRef(0);

  const broken = [...graph.modules.values()].some((m) => m.error || m.imports.some((i) => i.error));

  function handlePresetChange(value: PresetId) {
    setPresetId(value);
    setEvents([]);
    setHandle(null);
  }

  function handleRun() {
    const id = ++run.current;
    const collected: RunEvent[] = [];
    setEvents([]);
    const onEvent = (e: RunEvent) => {
      if (run.current !== id) return;
      collected.push(e);
      setEvents([...collected]);
    };
    setHandle(runBundle(output, { latencyMs: 400, onEvent }));
  }

  function handleOpenHelp() {
    if (!handle) return;
    const id = run.current;
    void callExport(handle, "openHelp", (e) => {
      if (run.current === id) setEvents((current) => [...current, e]);
    });
  }

  const canOpenHelp = !!handle?.exports && typeof handle.exports.openHelp === "function";

  return (
    <div className="flex flex-col gap-4">
      <Choice legend="Sample" value={presetId} options={OPTIONS} onChange={handlePresetChange} />
      <FileEditor key={presetId} files={files} onChange={update} onReset={reset} changed={changed} label="Project files" />
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <Tabs defaultValue="main.js" key={presetId + output.length} className="min-w-0">
          <TabsList aria-label="Bundle files">
            {output.map((f) => (
              <TabsTrigger key={f.name} value={f.name} className="font-mono text-xs">
                {f.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {output.map((f) => (
            <TabsContent key={f.name} value={f.name}>
              <CodePanel title={f.name} code={f.code} />
            </TabsContent>
          ))}
        </Tabs>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleRun} disabled={broken}>
              <Play aria-hidden />
              {handle ? "Run again" : "Run the bundle"}
            </Button>
            {canOpenHelp ? (
              <Button variant="outline" onClick={handleOpenHelp}>
                <HelpCircle aria-hidden />
                Call openHelp()
              </Button>
            ) : null}
          </div>
          <RunLog label="Run log: the bundle" events={events} empty={broken ? "Fix the errors in the files to run the bundle." : "Runs main.js in your browser and records what the runtime does."} />
          <p className="text-xs text-muted-foreground">
            &quot;run&quot; is logged when a module&apos;s function starts; its imports run first, inside it. Lazy chunks are &quot;downloaded&quot; after a 400 ms
            delay standing in for the network.
          </p>
        </div>
      </div>
    </div>
  );
}
