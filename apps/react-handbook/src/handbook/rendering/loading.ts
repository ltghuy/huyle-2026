import type { CssMode, LoadReport, ScriptMode } from "@/server/handbook/render-lab.schema";

export type Setup = { css: CssMode; a: ScriptMode; b: ScriptMode; inline: boolean };

export const SLOWEST: Setup = { css: "slow", a: "head", b: "head", inline: true };

export const PRESETS: { label: string; setup: Setup }[] = [
  { label: "Slowest: everything blocks", setup: SLOWEST },
  { label: "Both defer", setup: { css: "fast", a: "defer", b: "defer", inline: false } },
  { label: "Both async", setup: { css: "fast", a: "async", b: "async", inline: false } },
  { label: "Classic at end of body", setup: { css: "fast", a: "body-end", b: "body-end", inline: false } },
];

export const SCRIPT_MODES: { id: ScriptMode; label: string }[] = [
  { id: "head", label: "Classic in <head>" },
  { id: "body-end", label: "Classic at end of <body>" },
  { id: "defer", label: "defer" },
  { id: "async", label: "async" },
  { id: "module", label: 'type="module"' },
];

export const CSS_MODES: { id: CssMode; label: string }[] = [
  { id: "none", label: "No stylesheet" },
  { id: "fast", label: "Fast (0.1 s)" },
  { id: "slow", label: "Slow (1.5 s)" },
];

const NAME = { a: "Script A", b: "Script B" } as const;

function ms(t: number) {
  return `${Math.round(t)} ms`;
}

/** What blocked what in a finished run, in words, from what the page measured. */
export function explain(setup: Setup, report: LoadReport): string[] {
  const ran = (name: string) => report.events.find((e) => e.kind === "ran" && e.name === name);
  const at = (kind: string) => report.events.find((e) => e.kind === kind)?.t;
  const arrived = (name: string) => report.resources.find((r) => r.name === name)?.end;
  const interactive = at("interactive");
  const dcl = at("dcl");
  const cssEnd = arrived("css");
  const notes: string[] = [];

  if (cssEnd !== undefined && report.firstPaint !== null && report.firstPaint >= cssEnd) {
    notes.push(`The stylesheet blocked rendering: it arrived at ${ms(cssEnd)} and nothing was painted before it (first paint at ${ms(report.firstPaint)}).`);
  }
  const inline = ran("inline");
  if (setup.inline && inline && cssEnd !== undefined && inline.t >= cssEnd) {
    notes.push(`The inline script waited for the stylesheet before it could run (${ms(inline.t)}): scripts may read styles, so the browser finishes loading earlier CSS first.`);
  }

  for (const name of ["a", "b"] as const) {
    const event = ran(name);
    const mode = setup[name];
    if (!event) continue;
    if (mode === "head") {
      notes.push(`${NAME[name]} (classic, in <head>) blocked the parser: nothing after it was parsed until it ran at ${ms(event.t)}, so it ${event.sawContent ? "could" : "couldn't"} see the article.`);
    } else if (mode === "body-end") {
      notes.push(`${NAME[name]} (classic, end of <body>) still blocked the parser, but the article above it was already parsed${report.firstPaint !== null && report.firstPaint < event.t ? " and painted" : ""} when it ran at ${ms(event.t)}.`);
    } else if (mode === "defer" || mode === "module") {
      const label = mode === "defer" ? "defer" : "a module (deferred by default)";
      notes.push(`${NAME[name]} is ${label}: it downloaded during parsing and ran at ${ms(event.t)}, after parsing finished${interactive !== undefined ? ` (${ms(interactive)})` : ""} and before DOMContentLoaded${dcl !== undefined ? ` (${ms(dcl)})` : ""}.`);
    } else {
      const when = dcl === undefined ? "" : event.t < dcl ? ", before DOMContentLoaded" : ", after DOMContentLoaded";
      notes.push(`${NAME[name]} is async: it ran as soon as it arrived (${ms(event.t)})${when}, without waiting for the parser or the other scripts.`);
    }
  }

  const ranA = ran("a");
  const ranB = ran("b");
  if (ranA && ranB) {
    const first = ranA.t <= ranB.t ? "A" : "B";
    const inOrderModes = (["head", "body-end", "defer", "module"] as ScriptMode[]).includes(setup.a) && setup.a === setup.b;
    if (setup.a === "async" && setup.b === "async") {
      notes.push(`Both async: they ran in the order they arrived (${first} first; B is the faster download), not the order they are written.`);
    } else if (inOrderModes) {
      notes.push(`Both ${setup.a === "module" ? "modules" : setup.a === "defer" ? "defer" : "classic"}: they ran in document order (A then B), even though B downloads faster.`);
    }
  }

  for (const e of report.events.filter((e) => e.kind === "error")) {
    notes.push(`${e.name === "css" ? "The stylesheet" : NAME[e.name as "a" | "b"] ?? e.name} failed to load.`);
  }
  return notes;
}
