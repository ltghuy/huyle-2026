"use client";

import { Check, Star, X } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { objectsIn, SAMPLES, validate, type Validation } from "./rules";

type Parsed = { ok: true; items: { obj: Record<string, unknown>; v: Validation }[] } | { ok: false; message: string };

function parse(text: string): Parsed {
  try {
    const items = objectsIn(JSON.parse(text)).map((obj) => ({ obj, v: validate(obj) }));
    return { ok: true, items };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

function get(obj: Record<string, unknown>, key: string) {
  const v = obj[key];
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function ResultPreview({ obj, v }: { obj: Record<string, unknown>; v: Validation }) {
  const failed = v.checks.some((c) => !c.ok && !c.text.includes("recommended"));
  if (v.preview === "none" || failed) {
    return (
      <p className="text-sm text-foreground/80">
        {failed ? "Fix the required properties first; until then no rich result is possible." : "No rich result preview for this type."}
      </p>
    );
  }
  let line: React.ReactNode = "learn.huyle.work › seo › how-search-works";
  let extra: React.ReactNode = null;
  if (v.preview === "breadcrumb" && Array.isArray(obj.itemListElement)) {
    line = ["learn.huyle.work", ...obj.itemListElement.slice(1).map((i) => String((i as Record<string, unknown>).name ?? ""))].join(" › ");
  }
  if (v.preview === "product") {
    const rating = get(obj, "aggregateRating");
    const offer = Array.isArray(obj.offers) ? (obj.offers[0] as Record<string, unknown>) : get(obj, "offers");
    extra = (
      <p className="flex flex-wrap items-center gap-1.5 text-xs text-[#4d5156] dark:text-[#bdc1c6]">
        {rating.ratingValue ? (
          <>
            <Star aria-hidden className="size-3.5 fill-current text-[#fbbc04]" />
            Rating: {String(rating.ratingValue)} ({String(rating.reviewCount ?? "?")})
          </>
        ) : null}
        {offer.price ? <span>· {String(offer.priceCurrency ?? "")} {String(offer.price)}</span> : null}
        {typeof offer.availability === "string" ? <span>· {offer.availability.replace(/^https?:\/\/schema.org\//, "").replace(/([a-z])([A-Z])/g, "$1 $2")}</span> : null}
      </p>
    );
  }
  if (v.preview === "article" && typeof obj.datePublished === "string") {
    extra = <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6]">{obj.datePublished.slice(0, 10)}: date shown with the result, and the image can appear in article features.</p>;
  }
  return (
    <div className="rounded-lg border bg-white p-3 text-[#202124] dark:bg-[#202124] dark:text-[#bdc1c6]" style={{ fontFamily: "Arial, sans-serif" }}>
      <p className="truncate text-xs">{line}</p>
      <p className="mt-0.5 text-lg text-[#1a0dab] dark:text-[#99c3ff]">{String(obj.headline ?? obj.name ?? "How search works")}</p>
      {extra}
    </div>
  );
}

export function EditorDemo() {
  const [text, setText] = useState(SAMPLES.Product);
  const id = useId();
  const parsed = parse(text);

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {Object.keys(SAMPLES).map((name) => (
          <Button key={name} size="sm" variant="outline" onClick={() => setText(SAMPLES[name])}>
            {name}
          </Button>
        ))}
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={id}>JSON-LD</Label>
          <Textarea id={id} value={text} onChange={(e) => setText(e.target.value)} rows={16} spellCheck={false} className="font-mono text-xs leading-relaxed" />
        </div>
        <div aria-live="polite" className="flex min-w-0 flex-col gap-3">
          {!parsed.ok ? (
            <p className="rounded-lg border border-destructive/40 p-3 text-sm">
              <span className="font-medium text-destructive">Not valid JSON.</span> {parsed.message}
            </p>
          ) : parsed.items.length === 0 ? (
            <p className="rounded-lg border p-3 text-sm">No object found. JSON-LD needs an object with an @type.</p>
          ) : (
            parsed.items.map(({ obj, v }, i) => (
              <div key={i} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
                <p className="text-sm font-medium">{v.type}</p>
                <ul className="flex flex-col gap-1 text-sm">
                  {v.checks.map((c, j) => (
                    <li key={j} className="inline-flex items-start gap-1.5">
                      {c.ok ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />}
                      <span className="min-w-0 wrap-break-word">{c.text}</span>
                    </li>
                  ))}
                </ul>
                {v.note ? <p className="rounded-md bg-muted/40 p-2 text-sm">{v.note}</p> : null}
                <ResultPreview obj={obj} v={v} />
              </div>
            ))
          )}
        </div>
      </div>
      <p className="text-xs text-foreground/75">
        A checker for a handful of types, from Google&apos;s documented properties. Google&apos;s Rich Results Test is the source of truth, and a valid
        block still isn&apos;t a promise of a rich result.
      </p>
    </div>
  );
}
