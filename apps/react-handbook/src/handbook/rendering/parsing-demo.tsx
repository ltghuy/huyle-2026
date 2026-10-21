"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CodeEditor } from "@/components/playground/code-editor";
import { cn } from "@/lib/utils";

import { domTree, hasContent, type MatchedRule, matchedRules, nodeAt, renderTree, type TreeNode } from "./render-tree";

const PRESETS = [
  {
    label: "Missing tags",
    html: "<title>Fixed by the parser</title>\n<p>One<p>Two\n<table><tr><td>Cell</td></tr></table>",
    css: "p { color: teal; }",
  },
  {
    label: "display vs visibility",
    html: '<h1>Title</h1>\n<p class="gone">display: none</p>\n<p class="hidden">visibility: hidden</p>\n<p>Visible</p>',
    css: ".gone { display: none; }\n.hidden { visibility: hidden; }",
  },
  {
    label: "Generated content",
    html: '<p class="note">Read this first.</p>',
    css: '.note::before {\n  content: "Note: ";\n  font-weight: bold;\n}',
  },
  {
    label: "display: contents",
    html: '<ul class="wrap">\n  <li>One</li>\n  <li>Two</li>\n</ul>',
    css: ".wrap { display: contents; }",
  },
] as const;

const DEBOUNCE_MS = 300;

type Snapshot = { dom: TreeNode; render: TreeNode | null };
type Details = { label: string; display: string; visibility: string; rules: MatchedRule[] };

function useDebounced<T>(value: T) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

function Tree({ node, selected, onSelect }: { node: TreeNode; selected: string | null; onSelect: (path: string) => void }) {
  return (
    <li>
      {node.kind === "element" ? (
        <Button
          variant="ghost"
          size="xs"
          aria-pressed={selected === node.path}
          className={cn("h-auto px-1 py-0.5 font-mono", selected === node.path && "bg-primary/10 text-primary")}
          onClick={() => onSelect(node.path)}
        >
          {node.label}
        </Button>
      ) : (
        <span className={cn("px-1 font-mono", node.kind === "pseudo" ? "text-primary" : "text-foreground/75")}>{node.label}</span>
      )}
      {node.note ? <span className="ml-1 text-[0.6875rem] text-muted-foreground italic">{node.note}</span> : null}
      {node.children.length ? (
        <ul className="ml-3 border-l pl-2">
          {node.children.map((child) => (
            <Tree key={child.path} node={child} selected={selected} onSelect={onSelect} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function ParsingDemo() {
  const [html, setHtml] = useState<string>(PRESETS[1].html);
  const [css, setCss] = useState<string>(PRESETS[1].css);
  const srcDoc = useDebounced(html);
  const appliedCss = useDebounced(css);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [loadedDoc, setLoadedDoc] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [details, setDetails] = useState<Details | null>(null);

  // Apply the CSS as a constructed style sheet, so it doesn't add a node to the
  // DOM tree being shown, then read both trees and the selected node.
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc || loadedDoc !== srcDoc) return;
    const sheet = new (doc.defaultView! as typeof globalThis).CSSStyleSheet();
    sheet.replaceSync(appliedCss);
    doc.adoptedStyleSheets = [sheet];
    setSnapshot({ dom: domTree(doc, srcDoc), render: renderTree(doc) });
    const el = selected ? nodeAt(doc, selected) : null;
    if (el) {
      const style = doc.defaultView!.getComputedStyle(el);
      setDetails({ label: el.localName, display: style.display, visibility: style.visibility, rules: matchedRules(el) });
    } else {
      setDetails(null);
    }
  }, [loadedDoc, srcDoc, appliedCss, selected]);

  // The server-rendered iframe can finish loading before hydration attaches onLoad.
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (doc?.URL === "about:srcdoc" && doc.readyState === "complete") setLoadedDoc(frameRef.current!.srcdoc);
  }, []);

  function handleLoad() {
    setLoadedDoc(srcDoc);
  }

  function handlePreset(preset: (typeof PRESETS)[number]) {
    setHtml(preset.html);
    setCss(preset.css);
    setSelected(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Presets">
        {PRESETS.map((preset) => (
          <Button key={preset.label} variant="outline" size="sm" onClick={() => handlePreset(preset)}>
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="parse-html">HTML</Label>
          <CodeEditor lang="html" id="parse-html" value={html} onChange={(e) => setHtml(e.target.value)} className="min-h-28" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="parse-css">CSS</Label>
          <CodeEditor lang="css" id="parse-css" value={css} onChange={(e) => setCss(e.target.value)} className="min-h-28" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">How the browser drew it (scripts in the sample don&apos;t run)</span>
        <iframe ref={frameRef} srcDoc={srcDoc} sandbox="allow-same-origin" onLoad={handleLoad} title="Parsed sample" className="h-28 w-full rounded-md border bg-white" />
      </div>
      {snapshot ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
            <h4 className="text-sm font-medium">DOM tree</h4>
            <ul className="overflow-x-auto text-xs">
              <Tree node={snapshot.dom} selected={selected} onSelect={setSelected} />
            </ul>
          </div>
          <div className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
            <h4 className="text-sm font-medium">
              Render tree <span className="font-normal text-muted-foreground">(simplified)</span>
            </h4>
            {hasContent(snapshot.render) ? (
              <ul className="overflow-x-auto text-xs">
                <Tree node={snapshot.render!} selected={selected} onSelect={setSelected} />
              </ul>
            ) : (
              <p className="text-xs text-foreground/75">Nothing to render: no visible content in the body.</p>
            )}
          </div>
        </div>
      ) : null}
      <div aria-live="polite" className="rounded-lg border p-3 text-xs">
        {details ? (
          <div className="flex flex-col gap-2">
            <p>
              <span className="font-mono font-medium">&lt;{details.label}&gt;</span> computed <code className="font-mono">display: {details.display}</code>,{" "}
              <code className="font-mono">visibility: {details.visibility}</code>
            </p>
            {details.rules.length ? (
              <ul className="flex flex-col gap-1">
                {details.rules.map((rule) => (
                  <li key={rule.selector + rule.declarations} className="font-mono">
                    <span className="text-primary">{rule.selector}</span> {`{ ${rule.declarations} }`}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-foreground/75">No rules from your CSS match; only the browser&apos;s default styles apply.</p>
            )}
          </div>
        ) : (
          <p className="text-foreground/75">Select an element in either tree to see the rules that match it.</p>
        )}
      </div>
    </div>
  );
}
