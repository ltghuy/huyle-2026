"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { blurAll, blurInBands, checksum, makePhoto, PHOTO_HEIGHT, PHOTO_WIDTH } from "./blur";
import { useSupportsEntryType, useSupportsWorkers } from "./use-supports";

type Mode = "block" | "chunks" | "worker";

type Result = { mode: Mode; total: number; longestTask: number | null; dropped: number; checksum: string };

const MODES: { mode: Mode; title: string; text: string }[] = [
  { mode: "block", title: "One long task", text: "All the work in one go on the main thread." },
  { mode: "chunks", title: "Chunks that yield", text: "Work in ~8 ms slices, each followed by a new task so the browser can paint and handle input." },
  { mode: "worker", title: "Web worker", text: "The pixels move to another thread and back; the main thread stays free." },
];

const TITLE: Record<Mode, string> = { block: "One long task", chunks: "Chunks that yield", worker: "Web worker" };
const SLICE_MS = 8;

/**
 * Give the browser a turn by continuing in a new task. A MessageChannel
 * message isn't clamped to 4 ms like nested setTimeouts. scheduler.yield()
 * would resume sooner (ahead of other tasks), which is better for input but
 * can let a long loop starve rendering, and this demo is about painting.
 */
function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });
}

async function blurInChunks(pixels: Uint8ClampedArray) {
  const bands = blurInBands(pixels);
  let done = false;
  while (!done) {
    const sliceEnd = performance.now() + SLICE_MS;
    while (!done && performance.now() < sliceEnd) done = Boolean(bands.next().done);
    await yieldToMain();
  }
  return pixels;
}

/** Runs the work in the given mode and times it. */
async function timeWork(mode: Mode, input: Uint8ClampedArray, inWorker: (pixels: Uint8ClampedArray) => Promise<Uint8ClampedArray>) {
  const start = performance.now();
  const pixels = mode === "block" ? blurAll(input) : mode === "chunks" ? await blurInChunks(input) : await inWorker(input);
  const end = performance.now();
  return { pixels, start, end, total: end - start };
}

/** Frames that should have been painted between start and end but weren't, from the painted frames' times. */
function droppedFrames(stamps: number[], start: number, end: number, interval: number) {
  let dropped = 0;
  for (let i = 1; i < stamps.length; i++) {
    if (stamps[i] <= start || stamps[i - 1] >= end) continue;
    dropped += Math.max(0, Math.round((stamps[i] - stamps[i - 1]) / interval) - 1);
  }
  return dropped;
}

/** Waits a frame so the "running" state paints before the work starts. */
function nextFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}

export function LongTaskDemo() {
  const [running, setRunning] = useState<Mode | null>(null);
  const [results, setResults] = useState<Partial<Record<Mode, Result>>>({});
  const [error, setError] = useState<string | null>(null);
  const longTasks = useSupportsEntryType("longtask");
  const workerSupported = useSupportsWorkers();

  const dotRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const frames = useRef({ stamps: [] as number[], interval: 1000 / 60 });
  const workerRef = useRef<Worker | null>(null);
  const photoRef = useRef<Uint8ClampedArray | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [shown, setShown] = useState<Mode | null>(null);

  // The indicator is moved by requestAnimationFrame on the main thread (a CSS
  // animation would run on the compositor and keep moving during a long task).
  useEffect(() => {
    let raf = 0;
    let frame = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    function tick() {
      // The callback's timestamp can be the frame's scheduled time, which hides how late it ran.
      const now = performance.now();
      const f = frames.current;
      const gap = f.stamps.length > 0 ? now - f.stamps[f.stamps.length - 1] : f.interval;
      if (gap > 4 && gap < 40) f.interval = f.interval * 0.9 + gap * 0.1;
      f.stamps.push(now);
      if (f.stamps.length > 600) f.stamps.splice(0, f.stamps.length - 600);
      frame++;
      const track = trackRef.current;
      if (dotRef.current && track && !reduceMotion.matches) {
        const width = track.clientWidth - 16;
        const t = (now / 1500) % 2;
        dotRef.current.style.transform = `translateX(${(t < 1 ? t : 2 - t) * width}px)`;
      }
      if (counterRef.current) counterRef.current.textContent = String(frame);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function getWorker() {
    workerRef.current ??= new Worker(new URL("./blur.worker.ts", import.meta.url));
    return workerRef.current;
  }

  /** Sends a request to the worker and resolves with the pixels it transfers back. */
  function askWorker(request: { type: "make" } | { type: "blur"; buffer: ArrayBuffer }) {
    const worker = getWorker();
    return new Promise<Uint8ClampedArray>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<{ buffer: ArrayBuffer }>) => resolve(new Uint8ClampedArray(event.data.buffer));
      worker.onerror = (event) => reject(new Error(event.message || "The worker failed"));
      worker.postMessage(request, request.type === "blur" ? [request.buffer] : []);
    });
  }

  function blurInWorker(pixels: Uint8ClampedArray) {
    return askWorker({ type: "blur", buffer: pixels.buffer as ArrayBuffer });
  }

  function draw(pixels: Uint8ClampedArray) {
    canvasRef.current?.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(pixels), PHOTO_WIDTH, PHOTO_HEIGHT), 0, 0);
  }

  // Make the photo off the main thread (it takes ~80 ms), so the page doesn't get a long task on load.
  useEffect(() => {
    let cancelled = false;
    const made = typeof Worker === "undefined" ? Promise.resolve(makePhoto()) : askWorker({ type: "make" });
    made.then((pixels) => {
      if (cancelled) return;
      photoRef.current = pixels;
      draw(pixels);
      setPhotoReady(true);
    }, () => {
      if (cancelled) return;
      photoRef.current = makePhoto();
      draw(photoRef.current);
      setPhotoReady(true);
    });
    return () => {
      cancelled = true;
      workerRef.current?.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once; askWorker and draw only touch refs
  }, []);

  async function handleRun(mode: Mode) {
    setRunning(mode);
    setError(null);
    await nextFrame();

    let longest = 0;
    const observer = longTasks
      ? new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) longest = Math.max(longest, entry.duration);
        })
      : null;
    observer?.observe({ type: "longtask" });
    let run: Awaited<ReturnType<typeof timeWork>>;
    try {
      // Work on a copy so every run starts from the same photo.
      run = await timeWork(mode, new Uint8ClampedArray(photoRef.current!), blurInWorker);
    } catch (failure) {
      observer?.disconnect();
      setError(failure instanceof Error ? failure.message : String(failure));
      setRunning(null);
      return;
    }
    // The first frame after the work closes the last gap, and long task entries
    // arrive after the task ends: wait one more frame before reading both.
    await nextFrame();
    observer?.disconnect();
    const { stamps, interval } = frames.current;
    const result: Result = { mode, checksum: checksum(run.pixels), total: run.total, longestTask: longTasks ? longest : null, dropped: droppedFrames(stamps, run.start, run.end, interval) };
    draw(run.pixels);
    setShown(mode);

    setResults((r) => ({ ...r, [mode]: result }));
    setRunning(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-3">
        {MODES.map(({ mode, title, text }) => (
          <div key={mode} className="flex flex-col gap-2 rounded-lg border p-3">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-foreground/75">{text}</p>
            <Button
              size="sm"
              variant={mode === "block" ? "outline" : "default"}
              className="mt-auto self-start"
              disabled={!photoReady || running !== null || (mode === "worker" && !workerSupported)}
              onClick={() => handleRun(mode)}
            >
              {running === mode ? "Running…" : "Run"}
            </Button>
          </div>
        ))}
      </div>

      <figure className="flex flex-col gap-1">
        <canvas
          ref={canvasRef}
          width={PHOTO_WIDTH}
          height={PHOTO_HEIGHT}
          role="img"
          aria-label={shown ? `The photo after blurring (${TITLE[shown]})` : "A photo of mountains under a morning sky"}
          className="aspect-[1200/750] h-auto w-full max-w-md rounded-md bg-muted"
        />
        <figcaption className="text-xs text-muted-foreground">
          {!photoReady ? "Preparing the photo in a worker…" : shown ? `Blurred (${TITLE[shown]})` : "Original photo"}
        </figcaption>
      </figure>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Main-thread animation: freezes whenever the main thread is busy</p>
          <div ref={trackRef} className="relative h-4 rounded-full bg-muted motion-reduce:hidden">
            <span ref={dotRef} aria-hidden className="absolute top-0 left-0 size-4 rounded-full bg-primary" />
          </div>
          <p className="text-xs text-muted-foreground">
            Frames painted: <span ref={counterRef} className="font-mono text-foreground tabular-nums" />
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <Label htmlFor="long-task-input" className="text-xs font-normal text-muted-foreground">
            Type here during a run
          </Label>
          <Input id="long-task-input" autoComplete="off" placeholder="Letters should appear as you type" />
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          The run failed: {error}
        </p>
      ) : null}
      <div className="relative overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[32rem] text-sm">
          <caption className="sr-only">Last run of each mode</caption>
          <thead className="bg-muted/50 text-left text-xs text-foreground/75">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Mode</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Total time</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Longest task</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Frames dropped</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Image checksum</th>
            </tr>
          </thead>
          <tbody aria-live="polite">
            {MODES.map(({ mode }) => {
              const r = results[mode];
              return (
                <tr key={mode} className="border-t">
                  <th scope="row" className="px-3 py-2 text-left font-medium">{TITLE[mode]}</th>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{r ? `${Math.round(r.total)} ms` : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {!r ? "—" : r.longestTask === null ? "n/a" : r.longestTask === 0 ? "none" : `${Math.round(r.longestTask)} ms`}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{r ? r.dropped : "—"}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{r ? r.checksum : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Each run blurs a {PHOTO_WIDTH}×{PHOTO_HEIGHT} photo ({((PHOTO_WIDTH * PHOTO_HEIGHT * 4) / 1e6).toFixed(1)} MB of pixels); all three
        modes must produce the same image (same checksum). The worker receives and returns the pixels as a transferable buffer, so
        nothing is copied between threads.
        {longTasks ? " Long tasks are tasks over 50 ms, reported by the browser." : " This browser doesn't report long tasks, so that column shows n/a."}
        {workerSupported ? "" : " Web workers aren't available here."}
      </p>
    </div>
  );
}
