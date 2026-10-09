"use client";

import { Play, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle } from "@/handbook/ui";
import type { CssMode, LoadReport, ScriptMode } from "@/server/handbook/render-lab.schema";

import { CSS_MODES, explain, PRESETS, SCRIPT_MODES, type Setup, SLOWEST } from "./loading";

const TIMEOUT_MS = 10_000;

type Run = { id: string; setup: Setup; report: LoadReport | null; failed: boolean };

function newRunId() {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function pageUrl(run: Run) {
  const { css, a, b, inline } = run.setup;
  return `/api/handbook/render/page?run=${run.id}&css=${css}&a=${a}&b=${b}&inline=${inline ? 1 : 0}`;
}

function isReport(data: unknown): data is LoadReport {
  return typeof data === "object" && data !== null && (data as { type?: unknown }).type === "render-lab-report";
}

const CSS_ITEMS = CSS_MODES.map((m) => ({ value: m.id, label: m.label }));
const SCRIPT_ITEMS = SCRIPT_MODES.map((m) => ({ value: m.id, label: m.label }));

function ScriptSelect({ id, label, value, onChange }: { id: string; label: string; value: ScriptMode; onChange: (mode: ScriptMode) => void }) {
  function handleValueChange(mode: string | null) {
    if (mode) onChange(mode as ScriptMode);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select items={SCRIPT_ITEMS} value={value} onValueChange={handleValueChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SCRIPT_MODES.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type Row = { label: string; bar?: [number, number]; mark?: number; text: string };

function rows(setup: Setup, report: LoadReport): Row[] {
  const event = (kind: string, name?: string) => report.events.find((e) => e.kind === kind && e.name === name)?.t;
  const resource = (name: string) => report.resources.find((r) => r.name === name);
  const ms = (t: number) => `${Math.round(t)} ms`;
  const out: Row[] = [];
  const css = resource("css");
  if (css) out.push({ label: "Stylesheet", bar: [css.start, css.end], text: `arrived ${ms(css.end)}` });
  if (setup.inline) {
    const t = event("ran", "inline");
    out.push({ label: "Inline script", mark: t, text: t === undefined ? "didn't run" : `ran ${ms(t)}` });
  }
  for (const name of ["a", "b"] as const) {
    const r = resource(name);
    const ran = report.events.find((e) => e.kind === "ran" && e.name === name);
    const mode = SCRIPT_MODES.find((m) => m.id === setup[name])!.label;
    out.push({
      label: `Script ${name.toUpperCase()} (${mode})`,
      bar: r ? [r.start, r.end] : undefined,
      mark: ran?.t,
      text: `${r ? `arrived ${ms(r.end)}` : "not downloaded"} · ${ran ? `ran ${ms(ran.t)}, ${ran.sawContent ? "saw the article" : "article not parsed yet"}` : "didn't run"}`,
    });
  }
  const milestones: [string, number | undefined | null][] = [
    ["Parser reached the end", event("interactive")],
    ["DOMContentLoaded", event("dcl")],
    ["load", event("load")],
    ["First paint", report.firstPaint],
  ];
  for (const [label, t] of milestones) {
    out.push({ label, mark: t ?? undefined, text: t === null ? "not reported by this browser" : t === undefined ? "didn't happen" : ms(t) });
  }
  return out;
}

function Timeline({ setup, report }: { setup: Setup; report: LoadReport }) {
  const data = rows(setup, report);
  const end = Math.max(...data.flatMap((r) => [r.bar?.[1] ?? 0, r.mark ?? 0])) * 1.05 || 1;
  const pct = (t: number) => `${(t / end) * 100}%`;
  return (
    <ol className="flex flex-col gap-1.5 text-xs" aria-label="Timeline of the run">
      {data.map((row) => (
        <li key={row.label} className="grid gap-1 sm:grid-cols-[12rem_1fr] sm:items-center">
          <span className="flex flex-col">
            <span className="font-medium">{row.label}</span>
            <span className="font-mono text-foreground/75">{row.text}</span>
          </span>
          <span aria-hidden className="relative h-4 rounded-sm bg-muted">
            {row.bar ? (
              <span className="absolute inset-y-1 rounded-sm bg-primary/35" style={{ left: pct(row.bar[0]), width: pct(Math.max(row.bar[1] - row.bar[0], end / 200)) }} />
            ) : null}
            {row.mark !== undefined ? <span className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-sm bg-primary" style={{ left: pct(row.mark) }} /> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function LoadingDemo() {
  const [setup, setSetup] = useState<Setup>(SLOWEST);
  const [run, setRun] = useState<Run | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const runId = run?.id;
  const waiting = run !== null && !run.report && !run.failed;

  useEffect(() => {
    if (!runId) return;
    function handleMessage(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== frameRef.current?.contentWindow) return;
      if (!isReport(event.data) || event.data.run !== runId) return;
      const report = event.data;
      setRun((current) => (current?.id === runId ? { ...current, report } : current));
    }
    const timer = setTimeout(() => setRun((current) => (current?.id === runId && !current.report ? { ...current, failed: true } : current)), TIMEOUT_MS);
    addEventListener("message", handleMessage);
    return () => {
      clearTimeout(timer);
      removeEventListener("message", handleMessage);
    };
  }, [runId]);

  function update(patch: Partial<Setup>) {
    setSetup((current) => ({ ...current, ...patch }));
  }

  function handleCssChange(css: string | null) {
    if (css) update({ css: css as CssMode });
  }

  function handleRun() {
    setRun({ id: newRunId(), setup, report: null, failed: false });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Presets">
        {PRESETS.map((preset) => (
          <Button key={preset.label} variant="outline" size="sm" onClick={() => setSetup(preset.setup)}>
            {preset.label}
          </Button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="render-css">Stylesheet in &lt;head&gt;</Label>
          <Select items={CSS_ITEMS} value={setup.css} onValueChange={handleCssChange}>
            <SelectTrigger id="render-css" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CSS_MODES.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <ScriptSelect id="render-a" label="Script A (1.2 s download)" value={setup.a} onChange={(a) => update({ a })} />
        <ScriptSelect id="render-b" label="Script B (0.4 s download)" value={setup.b} onChange={(b) => update({ b })} />
        <Toggle checked={setup.inline} onCheckedChange={(inline) => update({ inline })} title="Inline script" detail="Right after the stylesheet" />
      </div>
      <Button className="w-fit" onClick={handleRun}>
        <Play aria-hidden />
        {waiting ? "Start over with this setup" : "Load the sample page"}
      </Button>

      {run ? (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">The real sample page</span>
            <iframe key={run.id} ref={frameRef} src={pageUrl(run)} title="Sample page being loaded" className="h-28 w-full rounded-md border bg-white" />
          </div>
          <div aria-live="polite" className="flex min-w-0 flex-col gap-3">
            {run.failed ? (
              <p role="alert" className="flex items-center gap-2 rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
                <TriangleAlert aria-hidden className="size-4" />
                The sample page didn&apos;t finish loading within 10 seconds. Check the connection and try again.
              </p>
            ) : null}
            {run.report ? (
              <>
                {run.report.hidden ? (
                  <p className="flex items-center gap-2 rounded-lg border p-3 text-sm">
                    <TriangleAlert aria-hidden className="size-4" />
                    The tab was hidden during the run, so these timings are unreliable. Run it again with the tab visible.
                  </p>
                ) : null}
                <Timeline setup={run.setup} report={run.report} />
                <ul className="flex flex-col gap-1.5 pl-4 text-sm text-foreground/85">
                  {explain(run.setup, run.report).map((note) => (
                    <li key={note} className="list-disc">
                      {note}
                    </li>
                  ))}
                </ul>
              </>
            ) : waiting ? (
              <p className="text-sm text-muted-foreground">Loading… times are measured by the sample page itself.</p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground/75">Pick a setup and load it. The page, stylesheet and scripts are real downloads from this site, slowed on purpose.</p>
      )}
    </div>
  );
}
