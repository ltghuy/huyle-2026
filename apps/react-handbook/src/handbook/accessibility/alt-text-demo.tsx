"use client";

/* eslint-disable @next/next/no-img-element -- the demo is about the plain <img> alt attribute */

import { useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { announce } from "./a11y-reader";
import { ReaderBox, useDomSnapshot, Verdict } from "./ui";

type Use = "informative" | "decorative" | "link";

const USES: { id: Use; title: string; detail: string }[] = [
  { id: "informative", title: "Informative", detail: "In an article: the chart is the evidence" },
  { id: "decorative", title: "Decorative", detail: "The caption next to it already says the same" },
  { id: "link", title: "As a link", detail: "Clicking it opens the sales report" },
];

// A small bar chart as an SVG file, so it is a real <img> with a real alt.
const CHART = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120"><rect width="240" height="120" fill="#fff"/>` +
    [40, 46, 50, 70]
      .map((h, i) => `<rect x="${24 + i * 54}" y="${100 - h}" width="34" height="${h}" fill="${i === 3 ? "#1d4ed8" : "#9ca3af"}"/>`)
      .join("") +
    `<text x="221" y="${100 - 74}" font-family="sans-serif" font-size="11" text-anchor="end" fill="#111">+40%</text>` +
    ["Jan", "Feb", "Mar", "Apr"].map((m, i) => `<text x="${41 + i * 54}" y="114" font-family="sans-serif" font-size="10" text-anchor="middle" fill="#374151">${m}</text>`).join("") +
    `</svg>`,
)}`;

const FILE_NAME = /\.(png|jpe?g|gif|svg|webp|avif)$|^(img|dsc|image)[-_ ]?\d+|[-_](final|v\d+)\b/i;
const REDUNDANT = /^(an? )?(image|picture|photo|graphic|screenshot) (of|showing)\b/i;

function feedback(use: Use, alt: string, hasAlt: boolean): { pass: boolean; text: string }[] {
  const text = alt.trim();
  if (!hasAlt) {
    return [{ pass: false, text: "No alt attribute: many screen readers read the file name instead, here a long data address." }];
  }
  if (!text) {
    if (use === "decorative") return [{ pass: true, text: "Right: alt=\"\" hides a decorative image, so the caption isn't read twice." }];
    if (use === "link") return [{ pass: false, text: "The link has no name: a screen reader says only “link”." }];
    return [{ pass: false, text: "An empty alt hides the image: listeners miss that April sales rose 40%." }];
  }
  const notes: { pass: boolean; text: string }[] = [];
  if (use === "decorative") notes.push({ pass: false, text: "This image only repeats its caption: use alt=\"\" so it isn't read twice." });
  if (REDUNDANT.test(text)) notes.push({ pass: false, text: "Drop “image of”: the screen reader already says it's an image." });
  if (FILE_NAME.test(text)) notes.push({ pass: false, text: "That looks like a file name, not a description." });
  if (text.length > 150) notes.push({ pass: false, text: `${text.length} characters: keep alt under about 150 and put details in a caption or linked description.` });
  if (use === "link" && !/report|sales/i.test(text)) notes.push({ pass: false, text: "Name where the link goes (for example “Sales report”), not what the picture looks like." });
  if (use === "informative" && !/40/.test(text)) notes.push({ pass: false, text: "Include the fact the chart shows: April sales rose 40%." });
  if (notes.length === 0) notes.push({ pass: true, text: "Good: short, natural, and says what matters in this context." });
  return notes;
}

export function AltTextDemo() {
  const [use, setUse] = useState<Use>("informative");
  const [alt, setAlt] = useState("Bar chart: sales were flat from January to March, then rose 40% in April.");
  const [hasAlt, setHasAlt] = useState(true);
  const sampleRef = useRef<HTMLDivElement>(null);
  const line = useDomSnapshot(sampleRef, readSample);

  const image = <img data-target src={CHART} alt={hasAlt ? alt : undefined} width={240} height={120} className="h-auto w-full max-w-60 rounded-md border" />;

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">How the image is used</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {USES.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer gap-2 rounded-lg border p-3 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                use === option.id ? "border-primary/40 bg-primary/5" : "border-dashed",
              )}
            >
              <input
                type="radio"
                name="alt-use"
                checked={use === option.id}
                onChange={() => setUse(option.id)}
                className="mt-0.5 size-4 shrink-0 accent-primary outline-none"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{option.title}</span>
                <span className="text-xs text-foreground/75">{option.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <figure ref={sampleRef} className="flex flex-col gap-1.5">
          {use === "link" ? (
            <a data-link href="#images-and-media" className="w-fit rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              {image}
            </a>
          ) : (
            image
          )}
          {use === "decorative" ? <figcaption className="text-xs text-foreground/75">Sales rose 40% in April.</figcaption> : null}
        </figure>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alt-text">Alt text</Label>
            <Input id="alt-text" value={alt} disabled={!hasAlt} onChange={(e) => setAlt(e.target.value)} />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={!hasAlt} onChange={(e) => setHasAlt(!e.target.checked)} className="size-4 accent-primary" />
              Leave out the alt attribute entirely
            </label>
          </div>
          <ReaderBox>{line}</ReaderBox>
          <ul aria-live="polite" className="flex flex-col gap-1.5 text-sm">
            {feedback(use, alt, hasAlt).map((note) => (
              <li key={note.text} className="flex gap-2">
                <Verdict pass={note.pass}>{note.pass ? "OK" : "Fix"}</Verdict>
                <span className="text-foreground/85">{note.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function readSample(root: HTMLElement) {
  const target = root.querySelector("[data-link]") ?? root.querySelector("[data-target]");
  if (!target) return "";
  if (target.tagName === "IMG" && !target.hasAttribute("alt")) return "image, (file name read aloud)";
  return announce(target);
}
