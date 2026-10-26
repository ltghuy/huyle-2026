"use client";

import { Check, ImageOff, X } from "lucide-react";
import { useEffect, useState } from "react";

import { FetchError } from "../crawling/fetch-error";
import { FieldSelect } from "../field-select";
import { fetchDocument, onThisOrigin, PAGE_OPTIONS } from "./pages";

type Tags = Record<string, string>;

type Load = { state: "loading" } | { state: "error"; message: string } | { state: "done"; tags: Tags; canonical: string | null };

type ImageState = { state: "loading" } | { state: "ok"; width: number; height: number } | { state: "error" };

function readTags(doc: Document): Tags {
  const tags: Tags = {};
  doc.querySelectorAll<HTMLMetaElement>('meta[property^="og:"], meta[name^="twitter:"]').forEach((m) => {
    const key = m.getAttribute("property") ?? m.getAttribute("name")!;
    if (!(key in tags)) tags[key] = m.content;
  });
  return tags;
}

function CardImage({ src, image, className }: { src: string; image: ImageState; className: string }) {
  if (image.state === "error") {
    return (
      <div className={`${className} flex items-center justify-center bg-muted text-foreground/70`}>
        <ImageOff aria-hidden className="size-6" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- previews show the card image exactly as fetched
  return <img src={src} alt="" className={`${className} object-cover`} />;
}

export function SocialDemo() {
  const [path, setPath] = useState(PAGE_OPTIONS[0].value);
  const [attempt, setAttempt] = useState(0);
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [image, setImage] = useState<ImageState>({ state: "loading" });

  useEffect(() => {
    let live = true;
    fetchDocument(path)
      .then(({ doc }) => {
        if (!live) return;
        setLoad({ state: "done", tags: readTags(doc), canonical: doc.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null });
      })
      .catch((e: unknown) => live && setLoad({ state: "error", message: e instanceof Error ? e.message : String(e) }));
    return () => {
      live = false;
    };
  }, [path, attempt]);

  const tags = load.state === "done" ? load.tags : {};
  const imageUrl = tags["og:image"] ?? "";
  const src = onThisOrigin(imageUrl);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.onload = () => setImage({ state: "ok", width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => setImage({ state: "error" });
    img.src = src;
  }, [src]);

  function handlePath(next: string) {
    setLoad({ state: "loading" });
    setImage({ state: "loading" });
    setPath(next);
  }

  function handleRetry() {
    setLoad({ state: "loading" });
    setAttempt((n) => n + 1);
  }

  const title = tags["og:title"] ?? "";
  const description = tags["og:description"] ?? "";
  const site = tags["og:site_name"] ?? "";
  const host = "learn.huyle.work";
  const canonical = load.state === "done" ? load.canonical : null;

  const checks = [
    { ok: Boolean(title), text: `og:title ${title ? "set" : "missing"}` },
    { ok: Boolean(description), text: `og:description ${description ? "set" : "missing"}` },
    { ok: /^https?:\/\//.test(imageUrl), text: imageUrl ? `og:image is ${/^https?:\/\//.test(imageUrl) ? "an absolute URL" : "relative, which preview bots can't load"}` : "og:image missing" },
    {
      ok: image.state === "ok" && image.width === 1200 && image.height === 630,
      text: image.state === "ok" ? `The image loads at ${image.width} × ${image.height}${image.width === 1200 && image.height === 630 ? "" : " (1200 × 630 recommended)"}` : image.state === "error" ? "The image doesn't load" : "Loading the image…",
    },
    { ok: Boolean(tags["og:url"]) && tags["og:url"] === canonical, text: `og:url ${tags["og:url"] ? (tags["og:url"] === canonical ? "matches the canonical URL" : `is ${tags["og:url"]}, the canonical is ${canonical}`) : "missing"}` },
    { ok: tags["twitter:card"] === "summary_large_image", text: `twitter:card ${tags["twitter:card"] ?? "missing"}` },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="max-w-md">
        <FieldSelect label="Page of this site" value={path} options={PAGE_OPTIONS} onChange={handlePath} />
      </div>
      {load.state === "error" ? <FetchError what={path} message={load.message} onRetry={handleRetry} /> : null}
      {load.state === "loading" ? <p className="rounded-lg border border-dashed p-3 text-sm text-foreground/75">Fetching {path}…</p> : null}
      {load.state === "done" ? (
        <div aria-live="polite" className="grid min-w-0 gap-4 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <figure className="flex min-w-0 flex-col gap-1.5">
              <figcaption className="text-xs font-medium text-foreground/75">X, large image card</figcaption>
              <div className="relative overflow-hidden rounded-2xl border">
                <CardImage src={src} image={image} className="aspect-[1200/630] w-full" />
                <span className="absolute bottom-2 left-2 max-w-[85%] truncate rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">{title}</span>
              </div>
              <span className="text-xs text-foreground/75">From {host}</span>
            </figure>
            <figure className="flex min-w-0 flex-col gap-1.5">
              <figcaption className="text-xs font-medium text-foreground/75">Slack unfurl</figcaption>
              <div className="flex min-w-0 flex-col gap-1 border-l-4 border-muted-foreground/40 pl-3 text-sm">
                <span className="font-semibold">{site}</span>
                <span className="font-semibold text-[#1264a3] dark:text-[#1d9bd1]">{title}</span>
                <span className="line-clamp-3 text-foreground/85">{description}</span>
                <CardImage src={src} image={image} className="mt-1 aspect-[1200/630] w-64 max-w-full rounded" />
              </div>
            </figure>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <figure className="flex min-w-0 flex-col gap-1.5">
              <figcaption className="text-xs font-medium text-foreground/75">Facebook or LinkedIn post</figcaption>
              <div className="overflow-hidden rounded-lg border">
                <CardImage src={src} image={image} className="aspect-[1200/630] w-full" />
                <div className="flex flex-col gap-0.5 bg-muted/50 p-3 text-sm">
                  <span className="text-xs text-foreground/75 uppercase">{host}</span>
                  <span className="font-semibold">{title}</span>
                  <span className="line-clamp-1 text-foreground/80">{description}</span>
                </div>
              </div>
            </figure>
            <ul className="flex flex-col gap-1.5 rounded-lg border p-3 text-sm">
              {checks.map((c) => (
                <li key={c.text} className="inline-flex items-start gap-1.5">
                  {c.ok ? <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> : <X aria-hidden className="mt-0.5 size-4 shrink-0 text-destructive" />}
                  <span className="min-w-0 wrap-break-word">{c.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
      <p className="text-xs text-foreground/75">
        The previews are drawn from the page&apos;s live tags in the shape each platform uses; each platform crops and caches in its own way.
      </p>
    </div>
  );
}
