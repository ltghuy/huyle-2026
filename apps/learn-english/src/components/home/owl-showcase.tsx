"use client";

import { useEffect, useRef, useState } from "react";
import { Owl } from "@/components/mascot/owl";
import { cn } from "@/lib/utils";

const LABEL = "Cú tốt nghiệp ôm cuốn sách ENGLISH A·B·C, kéo để xoay";

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Runs `task` when the browser is idle after the first render, so the 3D never competes with the page. */
function whenIdle(task: () => void): () => void {
  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(task, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }
  const id = setTimeout(task, 300);
  return () => clearTimeout(id);
}

/**
 * The home hero's owl (feature 021): the SVG owl at once, then the owner's 3D model in its place once
 * three.js and the model have loaded (AC-003). Without WebGL, or if loading fails, the SVG stays (AC-004).
 */
export function OwlShowcase({ className }: { className?: string }) {
  const stage = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const container = stage.current;
    if (!container || !hasWebGL()) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const cancelIdle = whenIdle(() => {
      const sway = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      import("./owl-scene")
        .then(({ mountOwlScene }) => mountOwlScene(container, { sway }))
        .then((scene) => {
          if (cancelled) scene.dispose();
          else {
            dispose = scene.dispose;
            setReady(true);
          }
        })
        .catch(() => {
          // Keep the SVG owl: no 3D on this device or network.
        });
    });
    return () => {
      cancelled = true;
      cancelIdle();
      dispose?.();
    };
  }, []);

  return (
    <div role="img" aria-label={LABEL} className={cn("relative mx-auto h-48 w-40 md:h-56 md:w-48 lg:h-[25rem] lg:w-[22rem]", className)}>
      {/* A disc and a floor shadow so the owl stands somewhere (from lg). */}
      <div aria-hidden className="absolute inset-x-2 top-6 bottom-10 hidden rounded-full bg-linear-to-b from-primary/25 to-primary/0 lg:block" />
      <div aria-hidden className="absolute bottom-3 left-1/2 h-4 w-1/2 -translate-x-1/2 rounded-[100%] bg-foreground/15 blur-md" />
      <p aria-hidden className="absolute top-16 -left-24 z-10 hidden rounded-2xl rounded-br-sm border bg-card px-3 py-2 text-sm font-medium shadow-sm lg:block">
        <span lang="en">Hello!</span> Cùng học nhé
      </p>
      <div className={cn("absolute inset-0 flex items-end justify-center transition-opacity duration-500", ready && "opacity-0")} aria-hidden>
        <Owl size={136} className="mb-2 md:hidden" />
        <Owl size={160} className="mb-2 max-md:hidden lg:hidden" />
        <Owl size={288} className="mb-4 max-lg:hidden" />
      </div>
      <div ref={stage} className={cn("absolute inset-0 opacity-0 transition-opacity duration-500", ready && "opacity-100")} />
    </div>
  );
}
