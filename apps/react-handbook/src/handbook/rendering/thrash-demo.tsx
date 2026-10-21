"use client";

import { Play } from "lucide-react";
import { useRef, useState } from "react";

import { Code } from "@/components/playground/code";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const COUNTS = [100, 500, 2000] as const;
type Count = (typeof COUNTS)[number];

type Result = { count: number; interleaved: number; batched: number };

const INTERLEAVED_CODE = `for (const el of boxes) {
  const w = el.offsetWidth;        // read: forces layout
  el.style.width = w + 1 + "px";   // write: layout is dirty again
}`;

const BATCHED_CODE = `const widths = boxes.map((el) => el.offsetWidth); // reads: one layout
boxes.forEach((el, i) => {
  el.style.width = widths[i] + 1 + "px";           // writes only
});`;

function reset(boxes: HTMLElement[], container: HTMLElement) {
  for (const el of boxes) el.style.width = "";
  void container.offsetHeight; // start each mode from a clean layout
}

function interleaved(boxes: HTMLElement[]) {
  const start = performance.now();
  for (const el of boxes) {
    const w = el.offsetWidth;
    el.style.width = `${w + 1}px`;
  }
  void boxes[0].offsetWidth; // include the final layout, as the next frame would
  return performance.now() - start;
}

function batched(boxes: HTMLElement[]) {
  const start = performance.now();
  const widths = boxes.map((el) => el.offsetWidth);
  boxes.forEach((el, i) => {
    el.style.width = `${widths[i] + 1}px`;
  });
  void boxes[0].offsetWidth;
  return performance.now() - start;
}

export function ThrashDemo() {
  const [count, setCount] = useState<Count>(500);
  const [result, setResult] = useState<Result | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleCountChange(value: unknown) {
    setCount(Number(value) as Count);
    setResult(null);
  }

  function handleRun() {
    const container = containerRef.current!;
    const boxes = [...container.children] as HTMLElement[];
    reset(boxes, container);
    const slow = interleaved(boxes);
    reset(boxes, container);
    const fast = batched(boxes);
    setResult({ count: boxes.length, interleaved: slow, batched: fast });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
        <div className="flex flex-col gap-2">
          <span id="thrash-count" className="text-sm font-medium">
            Elements to resize
          </span>
          <RadioGroup value={String(count)} onValueChange={handleCountChange} aria-labelledby="thrash-count" className="flex gap-x-5">
            {COUNTS.map((n) => (
              <Label key={n} className="cursor-pointer font-normal tabular-nums">
                <RadioGroupItem value={String(n)} />
                {n.toLocaleString("en-US")}
              </Label>
            ))}
          </RadioGroup>
        </div>
        <Button onClick={handleRun}>
          <Play aria-hidden />
          Run both ways
        </Button>
      </div>

      <div ref={containerRef} aria-hidden className="h-16 overflow-hidden rounded-lg border bg-muted/40 p-1">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="h-px bg-primary/60" style={{ maxWidth: "100%", marginRight: `${(i * 37) % 60}%` }} />
        ))}
      </div>

      <div aria-live="polite" className="grid gap-3 md:grid-cols-2">
        {[
          { title: "Interleaved: read, write, read, write…", code: INTERLEAVED_CODE, ms: result?.interleaved, layouts: result?.count },
          { title: "Batched: all reads, then all writes", code: BATCHED_CODE, ms: result?.batched, layouts: result ? 1 : undefined },
        ].map((mode) => (
          <div key={mode.title} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
            <h4 className="text-sm font-medium">{mode.title}</h4>
            <pre tabIndex={0} aria-label={`Code: ${mode.title}`} className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-[0.6875rem] leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Code code={mode.code} />
            </pre>
            <p className="font-mono text-xs">
              {mode.ms === undefined
                ? "Not run yet"
                : `${mode.ms.toFixed(1)} ms measured · ${mode.layouts!.toLocaleString("en-US")} forced ${mode.layouts === 1 ? "layout" : "layouts"} (counted from the pattern)`}
            </p>
          </div>
        ))}
      </div>
      {result ? (
        <p className="text-sm text-foreground/85">
          Batching was {result.batched > 0 ? `${(result.interleaved / result.batched).toFixed(1)}×` : "much"} faster for {result.count.toLocaleString("en-US")} elements: the
          interleaved loop made the browser lay out the page again on every read.
        </p>
      ) : null}
    </div>
  );
}
