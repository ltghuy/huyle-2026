"use client";

import { useEffect, useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { FetchError } from "../crawling/fetch-error";
import { FieldSelect } from "../field-select";
import { fetchDocument, PAGE_OPTIONS } from "./pages";

// Approximate result layout: Arial, a 600 px title line on desktop, two
// lines of snippet; on mobile a narrower box with more lines.
const LAYOUTS = {
  desktop: { titleFont: "20px Arial", titleWidth: 600, titleLines: 1, textFont: "14px Arial", textWidth: 600, textLines: 2 },
  mobile: { titleFont: "18px Arial", titleWidth: 328, titleLines: 2, textFont: "14px Arial", textWidth: 328, textLines: 3 },
} as const;

let canvas: HTMLCanvasElement | null = null;

function measure(text: string, font: string) {
  // The first render (also on the server) has no text yet.
  if (!text) return 0;
  canvas ??= document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = font;
  return ctx.measureText(text).width;
}

/** Fits text into `lines` lines of `width` px, word by word; returns the shown text and whether it was cut. */
function fit(text: string, font: string, width: number, lines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  let used = 1;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next, font) <= width) {
      line = next;
      continue;
    }
    if (used === lines) {
      out.push(line);
      return { shown: `${out.join(" ")} …`, cut: true };
    }
    out.push(line);
    line = word;
    used += 1;
  }
  out.push(line);
  return { shown: out.join(" "), cut: false };
}

function Result({ kind, path, title, description }: { kind: keyof typeof LAYOUTS; path: string; title: string; description: string }) {
  const l = LAYOUTS[kind];
  const t = fit(title, l.titleFont, l.titleWidth, l.titleLines);
  const d = fit(description, l.textFont, l.textWidth, l.textLines);
  const crumbs = ["learn.huyle.work", ...path.split("/").filter(Boolean)].join(" › ");
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-xs font-medium text-foreground/75">{kind === "desktop" ? "Desktop" : "Mobile"}</p>
      <div className="min-w-0 rounded-lg border bg-white p-4 text-left text-[#202124] dark:bg-[#202124] dark:text-[#bdc1c6]" style={{ maxWidth: l.titleWidth + 34, fontFamily: "Arial, sans-serif" }}>
        <p className="truncate text-xs">{crumbs}</p>
        <p className="mt-1 text-[#1a0dab] dark:text-[#99c3ff]" style={{ font: l.titleFont, lineHeight: 1.3 }}>
          {title ? t.shown : <span className="italic">(Google writes a title from the page)</span>}
        </p>
        <p className="mt-1 text-sm leading-snug text-[#4d5156] dark:text-[#bdc1c6]">{d.shown}</p>
      </div>
      <p className="text-xs text-foreground/80">
        Title {Math.round(measure(title, l.titleFont))} px of {l.titleWidth * l.titleLines}: {t.cut ? "likely cut off" : "fits"}. Snippet: {d.cut ? "likely cut off" : "fits"}.
      </p>
    </div>
  );
}

export function SerpDemo() {
  const [path, setPath] = useState(PAGE_OPTIONS[0].value);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    let live = true;
    fetchDocument(path)
      .then(({ doc }) => {
        if (!live) return;
        setTitle(doc.querySelector("title")?.textContent ?? "");
        setDescription(doc.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? "");
        setError(null);
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, [path, attempt]);

  function handleRetry() {
    setError(null);
    setAttempt((n) => n + 1);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <FieldSelect label="Start from a page of this site" value={path} options={PAGE_OPTIONS} onChange={setPath} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={titleId} className="text-xs">
            Title ({title.length} characters)
          </Label>
          <Input id={titleId} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Label htmlFor={descId} className="text-xs">
          Meta description ({description.length} characters)
        </Label>
        <Textarea id={descId} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      {error ? <FetchError what={path} message={error} onRetry={handleRetry} /> : null}
      <div aria-live="polite" className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,634px)_minmax(0,1fr)]">
        <Result kind="desktop" path={path} title={title} description={description} />
        <Result kind="mobile" path={path} title={title} description={description} />
      </div>
      <p className="text-xs text-foreground/75">
        An approximation: widths are measured in Arial at the sizes results commonly use. Google may also show a different title or build the
        snippet from the page&apos;s text.
      </p>
    </div>
  );
}
