"use client";

import { useEffect, useId, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardLayout } from "@/lib/card-layout";
import { cardPath, CARDS } from "@/lib/cards";

import { FetchError } from "../crawling/fetch-error";
import { FieldSelect } from "../field-select";

const OPTIONS = CARDS.map((c) => ({ value: cardPath(c), label: `${c.kind === "site" ? "Home" : c.eyebrow.replace(/ · \d+$/, "")}: ${c.title}` }));

type Info = { type: string | null; bytes: number; width: number; height: number } | { error: string };

/** The width of an element, kept up to date as it resizes. */
function useWidth() {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [el]);
  return [setEl, width] as const;
}

export function CardDemo() {
  const [path, setPath] = useState(cardPath(CARDS.find((c) => c.slug === "metadata-structured-data")!));
  const card = CARDS.find((c) => cardPath(c) === path)!;
  const [title, setTitle] = useState(card.title);
  const [attempt, setAttempt] = useState(0);
  const [info, setInfo] = useState<Info | null>(null);
  const titleId = useId();
  const [previewRef, previewWidth] = useWidth();

  useEffect(() => {
    let live = true;
    const img = new Image();
    // The body's size, since the response may be compressed or chunked without a content-length.
    const response = fetch(path, { cache: "no-store" }).then(async (res) => ({ type: res.headers.get("content-type"), bytes: (await res.blob()).size }));
    Promise.all([response, new Promise<HTMLImageElement>((resolve, reject) => {
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("The image didn't load."));
      img.src = path;
    })])
      .then(([res, loaded]) => {
        if (!live) return;
        setInfo({ ...res, width: loaded.naturalWidth, height: loaded.naturalHeight });
      })
      .catch((e: unknown) => live && setInfo({ error: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
  }, [path, attempt]);

  function handleCard(next: string) {
    setInfo(null);
    setPath(next);
    setTitle(CARDS.find((c) => cardPath(c) === next)!.title);
  }

  function handleRetry() {
    setInfo(null);
    setAttempt((n) => n + 1);
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="max-w-md">
        <FieldSelect label="Card" value={path} options={OPTIONS} onChange={handleCard} />
      </div>
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        <figure className="flex min-w-0 flex-col gap-1.5">
          <figcaption className="text-xs font-medium text-foreground/75">The real image, built at build time</figcaption>
          {/* eslint-disable-next-line @next/next/no-img-element -- shows the generated PNG as served */}
          <img src={path} alt={`Card image for ${card.title}`} width={1200} height={630} className="h-auto w-full rounded-lg border" />
          <p aria-live="polite" className="text-xs text-foreground/80">
            <code className="font-mono">{path}</code>
            {info === null ? " · loading…" : "error" in info ? " · didn't load" : ` · ${info.type ?? "unknown type"} · ${Math.round(info.bytes / 1024)} KB · ${info.width} × ${info.height}`}
          </p>
          {info !== null && "error" in info ? <FetchError what={path} message={info.error} onRetry={handleRetry} /> : null}
        </figure>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={titleId} className="text-xs">
            Try another title in the same layout
          </Label>
          <Input id={titleId} value={title} onChange={(e) => setTitle(e.target.value)} />
          <div ref={previewRef} className="relative aspect-[1200/630] w-full overflow-hidden rounded-lg border">
            {previewWidth > 0 ? <CardLayout card={{ ...card, title }} scale={previewWidth / 1200} /> : null}
          </div>
          <p className="text-xs text-foreground/75">The same JSX drawn by your browser; the real image uses Satori&apos;s own font, so wrapping can differ slightly.</p>
        </div>
      </div>
    </div>
  );
}
