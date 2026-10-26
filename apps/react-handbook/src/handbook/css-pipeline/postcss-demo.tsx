"use client";

import { useEffect, useState } from "react";

import { Label } from "@/components/ui/label";
import { CodeEditor } from "@/components/playground/code-editor";
import { CodePanel } from "@/handbook/build-pipeline/code-panel";
import { Toggle } from "@/handbook/ui";
import { AstTree } from "@/handbook/transpiling/ast-tree";
import type { AnyNode } from "@/handbook/transpiling/compiler/ast";
import { SourceView } from "@/handbook/transpiling/source-view";

import { loadPostcss, PLUGINS, type PluginId, toTree } from "./postcss-tools";
import { useNearViewport } from "./use-near-viewport";

const SAMPLE = `/* A card, written with native nesting */
.card {
  color: #ffffff;
  background: #4b2a99;
  margin: 0px auto;
  user-select: none;

  &:hover {
    background: #663399;
  }

  .title {
    backdrop-filter: blur(4px);
  }

  @media (min-width: 40em) {
    padding: 2rem;
  }
}
`;

type Output = { ok: true; tree: AnyNode; css: string } | { ok: false; message: string };

export function PostcssDemo() {
  const [source, setSource] = useState(SAMPLE);
  const [enabled, setEnabled] = useState<Record<PluginId, boolean>>({ nesting: true, prefixes: true, minify: false });
  const [output, setOutput] = useState<Output | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AnyNode | null>(null);
  const { ref, near } = useNearViewport<HTMLDivElement>();

  // PostCSS is downloaded once the demo is near the screen, and runs asynchronously; only the latest input's result is kept.
  useEffect(() => {
    if (!near) return;
    let current = true;
    loadPostcss()
      .then(async (postcss) => {
        try {
          const tree = toTree(postcss.parse(source, { from: "card.css" }));
          const plugins = PLUGINS.filter((p) => enabled[p.id]).map((p) => p.make());
          const result = await postcss(plugins).process(source, { from: "card.css" });
          if (current) setOutput({ ok: true, tree, css: result.css });
        } catch (error) {
          const e = error as { reason?: string; line?: number; column?: number; message?: string };
          if (current) setOutput({ ok: false, message: e.reason ? `Line ${e.line}, column ${e.column}: ${e.reason}` : String(e.message) });
        }
      })
      .catch(() => {
        if (current) setLoadError("PostCSS couldn't be loaded. Check your connection and reload the page.");
      });
    return () => {
      current = false;
    };
  }, [source, enabled, near]);

  function handleSourceChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setSource(e.target.value);
    setSelected(null);
  }

  function handleToggle(id: PluginId, checked: boolean) {
    setEnabled((current) => ({ ...current, [id]: checked }));
  }

  if (loadError) return <p className="text-sm text-destructive">{loadError}</p>;

  return (
    <div ref={ref} className="flex flex-col gap-4">
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="postcss-source" className="font-mono text-xs">
            card.css (edit me)
          </Label>
          <CodeEditor lang="css" id="postcss-source" value={source} onChange={handleSourceChange} className="min-h-72" />
          {selected ? <SourceView source={source} highlight={selected} label="Source of the selected node" lang="css" /> : <p className="text-xs text-muted-foreground">Pick a node in the tree to see its source.</p>}
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-xs text-muted-foreground">PostCSS&apos;s syntax tree (the real parser, version 8.5):</p>
          <div aria-live="polite">
            {!output ? (
              <p className="text-sm text-muted-foreground">Loading PostCSS…</p>
            ) : output.ok ? (
              <AstTree root={output.tree} selected={selected} onSelect={setSelected} label="PostCSS syntax tree" />
            ) : (
              <p className="rounded-lg border border-destructive/40 bg-destructive/5 p-2 font-mono text-xs">{output.message}</p>
            )}
          </div>
        </div>
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-xs font-medium text-foreground/75">Plugins, run in this order</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {PLUGINS.map((p, i) => (
            <Toggle key={p.id} checked={enabled[p.id]} onCheckedChange={(checked) => handleToggle(p.id, checked)} title={`${i + 1}. ${p.label}`} detail={p.detail} />
          ))}
        </div>
      </fieldset>
      {output?.ok ? <CodePanel title="card.out.css" code={output.css} wrap={enabled.minify} /> : null}
      <p className="text-xs text-muted-foreground">
        The plugins are small ones written for this page with PostCSS&apos;s plugin API; the prefix table is simplified (Autoprefixer uses Can I Use data and your
        browserslist).
      </p>
    </div>
  );
}
