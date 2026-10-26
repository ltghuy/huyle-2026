"use client";

import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { CodePanel } from "./code-panel";
import { BUNDLED, emittedHtml, GRAPH, MINIFIED, MINIFIED_CSS, OPTIMIZATIONS, OPTIMIZED, RESOLUTIONS, type SampleFile, SOURCE, sourceMap, TRANSFORMED } from "./sample";
import { contentHash } from "./sizes";

const STAGES = [
  { id: "resolve", title: "Resolve", does: "Starting from the entry, find the file behind every import, building a graph of modules." },
  { id: "transform", title: "Transform", does: "Turn each module into plain JavaScript: strip types, compile JSX, and turn CSS into something the bundle can load." },
  { id: "bundle", title: "Bundle", does: "Put the modules into one file, each wrapped in a function, with a small runtime that links their imports and exports." },
  { id: "optimize", title: "Optimize", does: "Drop code nothing uses or can reach, join modules into one scope, and minify." },
  { id: "emit", title: "Emit", does: "Write the files with content hashes in their names, an HTML page that loads them, and source maps." },
] as const;

const fileLabel = (name: string) => name.replace("src/", "").replace(" → JS (dev)", "").replace(" → JS", "");

/** Tabs over files; each tab can show one panel or a before/after pair. */
function FileTabs({ label, files, after }: { label: string; files: readonly SampleFile[]; after?: readonly SampleFile[] }) {
  return (
    <Tabs defaultValue={files[0].name} className="min-w-0">
      <TabsList aria-label={label} className="h-auto max-w-full flex-wrap justify-start">
        {files.map((file) => (
          <TabsTrigger key={file.name} value={file.name} className="flex-none font-mono text-xs">
            {fileLabel(file.name)}
          </TabsTrigger>
        ))}
      </TabsList>
      {files.map((file, i) => (
        <TabsContent key={file.name} value={file.name} className={cn("grid min-w-0 gap-3", after && "lg:grid-cols-2")}>
          <CodePanel title={file.name} code={file.code} />
          {after ? <CodePanel title={after[i].name} code={after[i].code} /> : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function ResolveStage() {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <FileTabs label="Source files" files={SOURCE} />
        <CodePanel title="Output: the module graph" code={GRAPH} showSize={false} lang="text" />
      </div>
      <ol className="grid gap-2 text-sm" aria-label="How each import was resolved">
        {RESOLUTIONS.map((r) => (
          <li key={`${r.from}-${r.specifier}`} className="rounded-lg border p-2">
            <p className="flex flex-wrap items-baseline gap-x-2 font-mono text-xs">
              <span className="text-muted-foreground">{r.from}</span>
              <span className="font-medium">&quot;{r.specifier}&quot;</span>
              <span aria-hidden>→</span>
              <span className="sr-only">resolves to</span>
              <span className="font-medium break-all">{r.resolved}</span>
            </p>
            <p className="mt-1 text-xs text-foreground/75">{r.how}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function OptimizeStage() {
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid gap-2 text-sm sm:grid-cols-2" aria-label="Optimizations applied">
        {OPTIMIZATIONS.map((o, i) => (
          <li key={o.title} className="flex gap-2 rounded-lg border p-2">
            <span className="font-mono text-xs leading-5 text-muted-foreground tabular-nums">{i + 1}</span>
            <span>
              <span className="font-medium">{o.title}.</span> <span className="text-foreground/75">{o.detail}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <CodePanel title="Input: the bundle" code={BUNDLED} />
        <Tabs defaultValue="minified" className="min-w-0">
          <TabsList aria-label="Optimized output">
            <TabsTrigger value="readable">Before minifying</TabsTrigger>
            <TabsTrigger value="minified">Minified</TabsTrigger>
          </TabsList>
          <TabsContent value="readable">
            <CodePanel title="Output: tree-shaken, hoisted" code={OPTIMIZED} />
          </TabsContent>
          <TabsContent value="minified" className="flex flex-col gap-3">
            <CodePanel title="Output: minified JS" code={MINIFIED} wrap />
            <CodePanel title="Output: minified CSS" code={MINIFIED_CSS} wrap />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function EmitStage() {
  const [names, setNames] = useState<{ js: string; css: string } | null>(null);

  useEffect(() => {
    let current = true;
    void Promise.all([contentHash(MINIFIED), contentHash(MINIFIED_CSS)]).then(([js, css]) => {
      if (current) setNames({ js: `assets/index-${js}.js`, css: `assets/index-${css}.css` });
    });
    return () => {
      current = false;
    };
  }, []);

  if (!names) return <p className="text-sm text-muted-foreground">Hashing the output…</p>;
  const files: SampleFile[] = [
    { name: "dist/index.html", code: emittedHtml(names.js, names.css) },
    { name: `dist/${names.js}`, code: MINIFIED },
    { name: `dist/${names.css}`, code: MINIFIED_CSS },
    { name: `dist/${names.js}.map`, code: sourceMap(names.js) },
  ];
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-foreground/85">
        Each hash is the first 8 hex digits of the SHA-256 of that file&apos;s content, computed in your browser just now. Change one character of the code and the
        name changes, so browsers and CDNs can cache these files forever.
      </p>
      <Tabs defaultValue={files[0].name} className="min-w-0">
        <TabsList aria-label="Emitted files" className="h-auto max-w-full flex-wrap justify-start">
          {files.map((file) => (
            <TabsTrigger key={file.name} value={file.name} className="flex-none font-mono text-xs">
              {file.name.replace("dist/", "")}
            </TabsTrigger>
          ))}
        </TabsList>
        {files.map((file) => (
          <TabsContent key={file.name} value={file.name}>
            <CodePanel title={file.name} code={file.code} wrap={!file.name.endsWith(".html")} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function StageBody({ index }: { index: number }) {
  switch (STAGES[index].id) {
    case "resolve":
      return <ResolveStage />;
    case "transform":
      return <FileTabs label="Files, before and after the transform" files={SOURCE} after={TRANSFORMED} />;
    case "bundle":
      return (
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <CodePanel title="Input: the graph of transformed modules" code={GRAPH} showSize={false} lang="text" />
          <CodePanel title="Output: one bundle (development-style)" code={BUNDLED} />
        </div>
      );
    case "optimize":
      return <OptimizeStage />;
    case "emit":
      return <EmitStage />;
  }
}

export function StagesDemo() {
  const [index, setIndex] = useState(0);
  const stage = STAGES[index];
  const last = STAGES.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Build stages">
        {STAGES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              aria-current={i === index ? "step" : undefined}
              className={cn(
                "flex min-h-11 w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                i === index ? "border-primary bg-primary/10 font-medium" : i < index ? "border-primary/40" : "border-dashed text-foreground/75",
              )}
            >
              <span className="font-mono text-xs text-muted-foreground tabular-nums">{i + 1}</span>
              {s.title}
            </button>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={() => setIndex(index - 1)} disabled={index === 0}>
          <ChevronLeft aria-hidden />
          Back
        </Button>
        <Button onClick={() => setIndex(index + 1)} disabled={index === last}>
          Next
          <ChevronRight aria-hidden />
        </Button>
        <Button variant="ghost" onClick={() => setIndex(0)} disabled={index === 0}>
          <RotateCcw aria-hidden />
          Restart
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <p aria-live="polite" className="text-sm">
          <span className="font-medium">
            Stage {index + 1} of {STAGES.length}: {stage.title}.
          </span>{" "}
          <span className="text-foreground/85">{stage.does}</span>
        </p>
        <StageBody index={index} />
        <p className="text-xs text-muted-foreground">
          Simplified: the outputs are written out by hand to match what the tools emit for this sample. React&apos;s own code is left out, so the sizes
          (measured in your browser) cover the sample code only.
        </p>
      </div>
    </div>
  );
}
