"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

import { Toggle, Verdict } from "./ui";

const QUERY = "(prefers-reduced-motion: reduce)";
const ITEMS = ["Fresh croissants every morning", "Rye with caraway on Fridays", "Order cakes two days ahead", "Free coffee with any loaf"];
const PAUSE_NEEDED_AFTER = 5000;

function subscribeMotion(onChange: () => void) {
  const media = matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** The system's reduced-motion setting (assumed "reduce" on the server, so nothing moves before hydration). */
function useSystemReducedMotion() {
  return useSyncExternalStore(subscribeMotion, () => matchMedia(QUERY).matches, () => true);
}

export function MotionDemo() {
  const system = useSystemReducedMotion();
  const [simulate, setSimulate] = useState(false);
  const reduced = system || simulate;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5 rounded-lg border p-3 text-sm">
          <span className="font-medium">Your system setting</span>
          <span className="text-xs text-foreground/75">
            prefers-reduced-motion: <span className="font-mono">{system ? "reduce" : "no-preference"}</span>
          </span>
        </div>
        <Toggle checked={simulate} onCheckedChange={setSimulate} title="Simulate reduced motion" detail="As if the system setting were on" />
      </div>
      {reduced ? <StillBanner /> : <MovingBanner />}
    </div>
  );
}

function StillBanner() {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-2 rounded-lg border p-3 text-sm">
        {ITEMS.map((item) => (
          <li key={item} className="rounded-md bg-muted px-2 py-1 text-foreground">
            {item}
          </li>
        ))}
      </ul>
      <p className="text-sm text-foreground/85">Reduced motion: the same items, standing still.</p>
    </div>
  );
}

function MovingBanner() {
  const [paused, setPaused] = useState(false);
  const [moved, setMoved] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  // The banner moves with the Web Animations API, so pausing and the timer use the animation's own clock.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const animation = track.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }], { duration: 16000, iterations: Infinity });
    animationRef.current = animation;
    const timer = setInterval(() => setMoved(Number(animation.currentTime ?? 0)), 250);
    return () => {
      clearInterval(timer);
      animation.cancel();
      animationRef.current = null;
    };
  }, []);

  function handlePause() {
    const animation = animationRef.current;
    if (!animation) return;
    if (paused) animation.play();
    else animation.pause();
    setPaused(!paused);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border py-3">
        <div ref={trackRef} className="flex w-max gap-8 pl-4 text-sm font-medium">
          {[...ITEMS, ...ITEMS].map((item, i) => (
            <span key={i} aria-hidden={i >= ITEMS.length || undefined}>
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Button variant="outline" size="sm" onClick={handlePause}>
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          {paused ? "Play banner" : "Pause banner"}
        </Button>
        <span className="tabular-nums">Moving for {(moved / 1000).toFixed(1)} s</span>
        {moved > PAUSE_NEEDED_AFTER ? <Verdict pass>Over 5 s, so it needs a pause control (it has one)</Verdict> : null}
      </div>
    </div>
  );
}
