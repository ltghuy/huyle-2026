"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toggle } from "@/handbook/ui";
import { cn } from "@/lib/utils";

import { ANIMATION, busyWait, type PropertyId, PROPERTIES, STAGES } from "./stages";

const BUSY_MS = 150;
const BUSY_EVERY_MS = 200;
const AUTO_STOP_MS = 30_000;

type Meter = { fps: number; longest: number };

function cssColor(el: Element, token: string) {
  return getComputedStyle(el).getPropertyValue(token).trim();
}

export function PipelineDemo() {
  const [property, setProperty] = useState<PropertyId>("left");
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [meter, setMeter] = useState<Meter | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const refRef = useRef<HTMLDivElement>(null);
  const chosen = PROPERTIES.find((p) => p.id === property)!;

  useEffect(() => {
    setReducedMotion(matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // Both boxes are animated with the Web Animations API; the browser runs
  // transform and opacity on the compositor, the others on the main thread.
  useEffect(() => {
    const track = trackRef.current;
    const box = boxRef.current;
    const reference = refRef.current;
    if (!playing || !track || !box || !reference) return;
    const distance = track.clientWidth - box.offsetWidth - 16;
    const ctx = { distance, from: cssColor(track, "--primary"), to: cssColor(track, "--destructive") };
    const animations = [box.animate(chosen.keyframes(ctx), ANIMATION), reference.animate([{ transform: "translateX(0)" }, { transform: `translateX(${distance}px)` }], ANIMATION)];

    // Main-thread frames: requestAnimationFrame stamps, summarized 4 times a second.
    const stamps: number[] = [];
    let raf = requestAnimationFrame(function tick() {
      stamps.push(performance.now());
      raf = requestAnimationFrame(tick);
    });
    const summary = setInterval(() => {
      const now = performance.now();
      while (stamps.length && stamps[0] < now - 2000) stamps.shift();
      const lastSecond = stamps.filter((t) => t >= now - 1000).length;
      let longest = 0;
      for (let i = 1; i < stamps.length; i++) longest = Math.max(longest, stamps[i] - stamps[i - 1]);
      setMeter({ fps: lastSecond, longest: Math.round(longest) });
    }, 250);
    const stop = setTimeout(() => setPlaying(false), AUTO_STOP_MS);
    return () => {
      animations.forEach((a) => a.cancel());
      cancelAnimationFrame(raf);
      clearInterval(summary);
      clearTimeout(stop);
    };
  }, [playing, chosen]);

  useEffect(() => {
    if (!playing || !busy) return;
    const timer = setInterval(() => busyWait(BUSY_MS), BUSY_EVERY_MS);
    return () => clearInterval(timer);
  }, [playing, busy]);

  function handlePropertyChange(value: unknown) {
    setProperty(value as PropertyId);
  }

  function handlePlayToggle() {
    setPlaying((current) => !current);
    setMeter(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span id="pipeline-property" className="text-sm font-medium">
          Animate the box with
        </span>
        <RadioGroup value={property} onValueChange={handlePropertyChange} aria-labelledby="pipeline-property" className="flex flex-wrap gap-x-5 gap-y-2">
          {PROPERTIES.map((p) => (
            <Label key={p.id} className="cursor-pointer font-mono font-normal">
              <RadioGroupItem value={p.id} />
              {p.label}
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={`Stages ${chosen.label} runs (simplified)`}>
          {STAGES.map((stage) => {
            const runs = chosen.stages.includes(stage.id);
            return (
              <li key={stage.id} className={cn("flex flex-col gap-0.5 rounded-lg border p-2 text-xs", runs ? "border-primary/50 bg-primary/10" : "border-dashed text-muted-foreground")}>
                <span className="font-medium">
                  {stage.title}: {runs ? "runs" : "skipped"}
                </span>
                <span>{stage.detail}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-1 text-xs text-muted-foreground">Simplified: what engines do for each property on every frame of the animation.</p>
      </div>

      <div className="flex flex-wrap items-start gap-3">
        <Button onClick={handlePlayToggle}>
          {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
          {playing ? "Pause" : "Play"}
        </Button>
        <Toggle checked={busy} onCheckedChange={setBusy} title="Busy main thread" detail={`Blocks it for ${BUSY_MS} ms of every ${BUSY_EVERY_MS} ms while playing`} />
      </div>
      {reducedMotion ? <p className="text-xs text-foreground/75">You prefer reduced motion, so nothing moves until you press Play, and it stops by itself after 30 seconds.</p> : null}

      <div ref={trackRef} className="flex flex-col gap-3 overflow-hidden rounded-lg border bg-muted/40 p-2">
        <div className="relative h-12">
          <div ref={boxRef} className="absolute top-0 left-0 flex size-12 items-center justify-center rounded-md bg-primary text-[0.5625rem] font-medium text-primary-foreground">
            {chosen.short}
          </div>
        </div>
        <div className="relative h-12">
          <div ref={refRef} className="absolute top-0 left-0 flex size-12 items-center justify-center rounded-md border-2 border-primary text-[0.5625rem] font-medium">
            transform
          </div>
        </div>
      </div>

      <div aria-live="polite" className="flex flex-col gap-1 text-sm">
        <p className="font-mono text-xs">
          Main-thread frames: {meter ? `${meter.fps} fps · longest frame ${meter.longest} ms` : "press Play"}
        </p>
        <p className="text-xs text-foreground/75">
          This meter counts frames on the main thread, so with the busy main thread on it drops for every property. The second box is a{" "}
          <code className="font-mono">transform</code> animation drawn by the compositor: watch it keep moving while a <code className="font-mono">left</code> or{" "}
          <code className="font-mono">width</code> box freezes. A page can&apos;t measure compositor frames itself; to see them, open the developer tools&apos; Rendering
          panel and turn on frame rendering stats and paint flashing.
        </p>
      </div>
    </div>
  );
}
