"use client";

/* eslint-disable @next/next/no-img-element -- this practice hand-builds image
   loading (and compares native lazy loading); next/image would hide exactly
   what the demo measures. */

import { ImageOff, RotateCcw } from "lucide-react";
import { memo, useCallback, useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Photo } from "@/server/practices/lazy-images/photos.schema";

import type { LazyLoader, TileState, TileStatus } from "./lazy-loader";
import { STATIC_SIZES, srcSetFor } from "./photos-api";
import type { PlaceholderKind, Strategy } from "./run";

type TileProps = {
  photo: Photo;
  loader: LazyLoader;
  runId: string;
  strategy: Strategy;
  placeholder: PlaceholderKind;
  reserve: boolean;
  priority: boolean;
};

const SERVER_STATE: TileState = { status: "idle", src: null, width: null, bytes: null, attempt: 0 };

function useTileState(loader: LazyLoader, key: string): TileState {
  const subscribe = useCallback((listener: () => void) => loader.subscribe(key, listener), [loader, key]);
  const getSnapshot = useCallback(() => loader.getState(key), [loader, key]);
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}

function statusText(state: TileState, strategy: Strategy): string {
  const labels: Record<TileStatus, string> = {
    idle: strategy === "hand-built" ? "Not requested" : "Not shown yet",
    waiting: "In range…",
    loading: "Loading…",
    shown: "",
    error: "Failed",
  };
  if (state.status !== "shown") return labels[state.status];
  const kb = state.bytes === null ? null : `${(state.bytes / 1024).toFixed(0)} KB`;
  return [state.width ? `${state.width}w` : null, kb].filter(Boolean).join(" · ");
}

/** One gallery tile. Re-renders only when its own state changes. */
export const PhotoTile = memo(function PhotoTile({
  photo, loader, runId, strategy, placeholder, reserve, priority,
}: TileProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const state = useTileState(loader, photo.id);

  useLayoutEffect(
    () => loader.register(photo.id, boxRef.current!, priority),
    [loader, photo.id, priority],
  );

  const shown = state.status === "shown";
  const failed = state.status === "error";
  const ratio = { aspectRatio: `${photo.width} / ${photo.height}` };

  function handleRetry() {
    loader.retry(photo.id);
  }

  function handleLoad(event: React.SyntheticEvent<HTMLImageElement>) {
    loader.reportLoad(photo.id, event.currentTarget);
  }

  return (
    <li className="min-w-0">
      <figure aria-busy={!shown && !failed} className="flex min-w-0 flex-col gap-1.5">
        <div
          ref={boxRef}
          data-photo-id={photo.id}
          className={cn("relative overflow-hidden rounded-lg", !reserve && !shown && "h-40")}
          style={reserve ? ratio : undefined}
        >
          {!shown ? <Placeholder kind={placeholder} photo={photo} reserve={reserve} /> : null}

          {strategy === "hand-built" ? (
            shown && state.src ? (
              <img
                src={state.src}
                alt={photo.alt}
                width={reserve ? photo.width : undefined}
                height={reserve ? photo.height : undefined}
                className={cn(
                  "block w-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
                  reserve ? "absolute inset-0 h-full object-cover" : "h-auto",
                )}
              />
            ) : null
          ) : failed ? null : (
            <img
              key={state.attempt}
              loading={strategy === "eager" || priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              decoding="async"
              sizes={STATIC_SIZES}
              srcSet={srcSetFor(photo.id, runId, state.attempt)}
              alt={photo.alt}
              width={reserve ? photo.width : undefined}
              height={reserve ? photo.height : undefined}
              onLoad={handleLoad}
              onError={() => loader.reportError(photo.id)}
              className={cn(
                "block w-full transition-opacity duration-300 motion-reduce:transition-none",
                reserve ? "absolute inset-0 h-full object-cover" : "h-auto",
                shown ? "opacity-100" : "opacity-0",
              )}
            />
          )}

          {failed ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/80 p-2 text-center">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <ImageOff aria-hidden className="size-4 text-destructive" />
                Couldn&apos;t load
              </p>
              <Button size="sm" variant="outline" onClick={handleRetry} aria-label={`Retry ${photo.title}`}>
                <RotateCcw aria-hidden /> Retry
              </Button>
            </div>
          ) : null}
        </div>
        {/* Status on its own left-aligned line: text changes never move other boxes (no layout shift). */}
        <figcaption className="flex min-w-0 flex-col text-xs">
          <span className="truncate font-medium text-foreground">{photo.title}</span>
          <span className="truncate font-mono text-muted-foreground tabular-nums">
            {statusText(state, strategy)}
          </span>
        </figcaption>
      </figure>
    </li>
  );
});

function Placeholder({ kind, photo, reserve }: { kind: PlaceholderKind; photo: Photo; reserve: boolean }) {
  const fill = reserve ? "absolute inset-0 size-full" : "h-40 w-full";
  switch (kind) {
    case "blur":
      return (
        <div aria-hidden className={cn("overflow-hidden", fill)} style={{ backgroundColor: photo.color }}>
          {/* The tiny preview is inline in the photo list: no request. */}
          <img src={photo.preview} alt="" className="size-full scale-110 object-cover blur-lg" />
        </div>
      );
    case "color":
      return <div aria-hidden className={fill} style={{ backgroundColor: photo.color }} />;
    case "skeleton":
      return <Skeleton aria-hidden className={cn("rounded-none motion-reduce:animate-none", fill)} />;
    case "none":
      return <div aria-hidden className={fill} />;
    default: {
      const unhandled: never = kind;
      throw new Error(`Unknown placeholder ${String(unhandled)}`);
    }
  }
}
