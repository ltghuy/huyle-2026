"use client";

import { useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

import { outline, type Outline } from "./a11y-reader";
import { WrongWay } from "./ui";

type Build = "boxes" | "semantic" | "skipped";

const BUILDS: { id: Build; title: string; detail: string }[] = [
  { id: "boxes", title: "Generic boxes", detail: "Only <div>s styled to look right; no title or language" },
  { id: "semantic", title: "Meaningful HTML", detail: "header, nav, main, footer, h1–h2, ul, title and lang" },
  { id: "skipped", title: "Meaningful, one level skipped", detail: "“Holidays” uses h4 because it looked the right size" },
];

// The sample is its own document (an iframe), so its header, main and footer
// are real top-level landmarks, and its title and lang are its own.
const STYLE = `
  :root { color-scheme: light dark; font: 14px/1.5 system-ui, sans-serif; color: var(--fg, CanvasText); background: var(--bg, Canvas); }
  body { margin: 0; }
  a { color: inherit; }
  .header { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--line, GrayText); }
  .logo { font-weight: 600; text-decoration: none; }
  .nav { display: flex; gap: 12px; }
  .main { padding: 10px 14px; }
  .h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
  .h2 { font-size: 15px; font-weight: 600; margin: 12px 0 2px; }
  .list { margin: 0; padding-left: 18px; }
  .p { margin: 0; }
  .footer { padding: 8px 14px; border-top: 1px solid var(--line, GrayText); color: var(--muted, GrayText); font-size: 12px; }
`;

function sampleHtml(build: Build, vars: string) {
  const head = `<meta charset="utf-8"><style>:root{${vars}}${STYLE}</style>`;
  if (build === "boxes") {
    return `<!doctype html><html><head>${head}</head><body>
<div class="header"><a class="logo" href="#">Ada's Bakery</a><div class="nav"><a href="#">Menu</a><a href="#">Hours</a><a href="#">Contact</a></div></div>
<div class="main"><div class="h1">Opening hours</div><div class="p">Fresh bread every morning.</div>
<div class="h2">This week</div><div class="list"><div>• Mon–Fri 7:00–18:00</div><div>• Sat 8:00–14:00</div></div>
<div class="h2">Holidays</div><div class="p">Closed on public holidays.</div></div>
<div class="footer">© Ada's Bakery</div></body></html>`;
  }
  const holidays = build === "skipped" ? `<h4 class="h2">Holidays</h4>` : `<h2 class="h2">Holidays</h2>`;
  return `<!doctype html><html lang="en"><head>${head}<title>Opening hours · Ada's Bakery</title></head><body>
<header class="header"><a class="logo" href="#">Ada's Bakery</a><nav class="nav" aria-label="Main"><a href="#">Menu</a><a href="#">Hours</a><a href="#">Contact</a></nav></header>
<main class="main"><h1 class="h1">Opening hours</h1><p class="p">Fresh bread every morning.</p>
<h2 class="h2">This week</h2><ul class="list"><li>Mon–Fri 7:00–18:00</li><li>Sat 8:00–14:00</li></ul>
${holidays}<p class="p">Closed on public holidays.</p></main>
<footer class="footer">© Ada's Bakery</footer></body></html>`;
}

/** The page's theme colors, so the sample matches light and dark mode. */
function readThemeVars() {
  const style = getComputedStyle(document.documentElement);
  const get = (name: string) => style.getPropertyValue(name).trim();
  return `--fg:${get("--foreground")};--bg:${get("--background")};--line:${get("--border")};--muted:${get("--muted-foreground")};color-scheme:${document.documentElement.classList.contains("dark") ? "dark" : "light"};`;
}

function subscribeTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  const media = matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

type DocumentReading = Outline & { title: string; lang: string };

function readDocument(doc: Document): DocumentReading {
  const result = outline(doc.body);
  const problems = [...result.problems];
  if (!doc.title) problems.unshift("No page title: the first thing a screen reader announces is missing.");
  if (!doc.documentElement.lang) problems.unshift("No page language: the screen reader guesses which voice and pronunciation to use.");
  return { ...result, problems, title: doc.title, lang: doc.documentElement.lang };
}

export function StructureDemo() {
  const [build, setBuild] = useState<Build>("semantic");
  const [reading, setReading] = useState<DocumentReading | null>(null);
  const vars = useSyncExternalStore(subscribeTheme, readThemeVars, () => "");

  function handleLoad(event: React.SyntheticEvent<HTMLIFrameElement>) {
    const doc = event.currentTarget.contentDocument;
    if (doc) setReading(readDocument(doc));
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Build the same page with</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {BUILDS.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                build === option.id ? "border-primary/40 bg-primary/5" : "border-dashed",
              )}
            >
              <input
                type="radio"
                name="structure-build"
                checked={build === option.id}
                onChange={() => setBuild(option.id)}
                className="mt-0.5 size-4 shrink-0 accent-primary outline-none"
              />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{option.title}</span>
                <span className="text-xs text-foreground/75">{option.detail}</span>
                {option.id !== "semantic" ? <WrongWay /> : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 lg:grid-cols-2">
        <iframe
          title="Sample page: Ada's Bakery opening hours"
          srcDoc={sampleHtml(build, vars)}
          onLoad={handleLoad}
          className="h-72 w-full rounded-lg border bg-background"
        />
        <OutlinePanel reading={reading} />
      </div>
    </div>
  );
}

function OutlinePanel({ reading }: { reading: DocumentReading | null }) {
  if (!reading) return <p className="text-sm text-muted-foreground">Reading the sample…</p>;
  return (
    <div aria-live="polite" className="flex min-w-0 flex-col gap-3 text-sm">
      <p className="text-xs font-medium text-foreground/75">What a screen reader can navigate (simplified, read from the sample)</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Title</dt>
        <dd className="font-mono break-words">{reading.title || "none"}</dd>
        <dt className="text-muted-foreground">Language</dt>
        <dd className="font-mono">{reading.lang || "none"}</dd>
      </dl>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium">Landmarks ({reading.landmarks.length})</p>
          <ul className="mt-1 flex flex-col gap-0.5 font-mono text-xs">
            {reading.landmarks.length === 0 ? <li className="text-muted-foreground">none</li> : null}
            {reading.landmarks.map((landmark, i) => (
              <li key={i}>
                {landmark.role}
                {landmark.name ? ` “${landmark.name}”` : ""}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium">Headings ({reading.headings.length})</p>
          <ul className="mt-1 flex flex-col gap-0.5 font-mono text-xs">
            {reading.headings.length === 0 ? <li className="text-muted-foreground">none</li> : null}
            {reading.headings.map((heading, i) => (
              <li key={i} style={{ paddingLeft: `${(heading.level - 1) * 0.75}rem` }}>
                h{heading.level} {heading.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
      {reading.problems.length > 0 ? (
        <ul className="flex flex-col gap-1 rounded-lg border border-destructive/40 p-3 text-xs">
          {reading.problems.map((problem) => (
            <li key={problem} className="text-destructive">
              {problem}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-success/40 p-3 text-xs font-medium text-success">No structure problems found.</p>
      )}
    </div>
  );
}
