"use client";

import { ArrowUpToLine, FastForward, RotateCcw } from "lucide-react";
import { useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Photo } from "@/server/practices/lazy-images/photos.schema";
import { toast } from "@/practices/toast-notifications/toast-store";

import { PhotoTile } from "./photo-tile";
import type { Run } from "./run";

const FLY_MS = 2000;
const VIEWPORT = "relative h-[min(70vh,640px)] overflow-y-auto rounded-lg border bg-background p-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-3";
const GRID = "grid grid-cols-2 gap-3 sm:grid-cols-3";

/** Keys of tiles intersecting the scroller right now. */
function visibleKeys(root: HTMLElement): string[] {
  const view = root.getBoundingClientRect();
  const keys: string[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("[data-photo-id]")) {
    const rect = el.getBoundingClientRect();
    if (rect.bottom > view.top && rect.top < view.bottom) keys.push(el.dataset.photoId!);
  }
  return keys;
}

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Scrolls from the top to the end in FLY_MS (instantly under reduced motion). */
function flyThrough(box: HTMLElement) {
  const end = box.scrollHeight - box.clientHeight;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    box.scrollTop = end;
    return;
  }
  box.scrollTop = 0;
  const startedAt = performance.now();
  function step(now: number) {
    if (!box.isConnected) return;
    const t = Math.min(1, (now - startedAt) / FLY_MS);
    box.scrollTop = end * easeInOut(t);
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function Gallery({ photos, run }: { photos: Photo[]; run: Run }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const { settings, loader, metrics } = run;
  const failed = useSyncExternalStore(metrics.subscribe, () => metrics.getSnapshot().failed, () => 0);

  // Tiles registered in their own (earlier) layout effects; now observe.
  useLayoutEffect(() => {
    const root = boxRef.current!;
    loader.attach(root);
    metrics.start(root, visibleKeys(root));
    return () => {
      loader.detach();
      metrics.pause();
    };
  }, [loader, metrics]);

  function handleFly() {
    flyThrough(boxRef.current!);
  }

  function handleTop() {
    boxRef.current!.scrollTop = 0;
  }

  function handleRetryFailed() {
    const count = loader.retryFailed();
    toast.info(count === 1 ? "Retrying 1 image" : `Retrying ${count} images`);
  }

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleFly}>
          <FastForward aria-hidden /> Fly through
        </Button>
        <Button size="sm" variant="ghost" onClick={handleTop}>
          <ArrowUpToLine aria-hidden /> Back to top
        </Button>
        <Button size="sm" variant="ghost" onClick={handleRetryFailed} disabled={failed === 0}>
          <RotateCcw aria-hidden /> Retry failed{failed > 0 ? ` (${failed})` : ""}
        </Button>
        {loader.fallback ? (
          <p className="text-xs text-muted-foreground">
            No IntersectionObserver in this browser: loading every image.
          </p>
        ) : null}
      </div>
      <div ref={boxRef} tabIndex={0} role="region" aria-label="Photo gallery (scrollable)" className={VIEWPORT}>
        <ul className={GRID}>
          {photos.map((photo, index) => (
            <PhotoTile
              key={photo.id}
              photo={photo}
              loader={loader}
              runId={run.id}
              strategy={settings.strategy}
              placeholder={settings.placeholder}
              reserve={settings.reserve}
              priority={index < settings.priority}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

/** Photo list still loading: same viewport and grid, so nothing jumps. */
export function GallerySkeleton({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-7" />
      <div aria-hidden className={VIEWPORT}>
        <div className={GRID}>
          {Array.from({ length: Math.min(count, 12) }, (_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="aspect-4/3 w-full motion-reduce:animate-none" />
              <Skeleton className="h-3 w-2/3 motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
