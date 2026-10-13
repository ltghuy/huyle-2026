"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";

// Loads a small page in a sandboxed frame, with its CSS either in the head
// (as an extracted stylesheet is) or inserted by script once a pretend
// bundle has "downloaded". The frame reports its own paint timing.

type Mode = "extracted" | "injected";

const BUNDLE_DELAY_MS = 900;

const MODES = [
  { value: "extracted", label: "Extracted: a stylesheet in <head> (production)" },
  { value: "injected", label: "Injected by JavaScript after the bundle loads (dev servers, runtime CSS-in-JS)" },
] as const satisfies readonly { value: Mode; label: string }[];

const CSS = `body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#f6f4fb;color:#1d1b26}
.hero{padding:20px 24px;background:#4b2a99;color:#fff}.hero h1{margin:0;font-size:22px}.hero p{margin:4px 0 0;opacity:.85}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;list-style:none;margin:0;padding:16px 24px}
.card{background:#fff;border-radius:10px;padding:12px;box-shadow:0 1px 3px #0002}.card b{display:block}`;

function page(mode: Mode) {
  const style = `<style>${CSS}</style>`;
  const cards = ["Lamp", "Chair", "Mug"].map((n, i) => `<li class="card"><b>${n}</b>$${(i + 1) * 12}.00</li>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sample shop</title>${mode === "extracted" ? style : ""}</head>
<body><header class="hero"><h1>Sample shop</h1><p>New arrivals this week</p></header><ul class="grid">${cards}</ul>
<script>
const report = { fcp: null, styled: ${mode === "extracted" ? 0 : "null"} };
const send = () => parent.postMessage({ kind: "css-delivery", ...report }, "*");
new PerformanceObserver((list) => {
  for (const e of list.getEntries()) if (e.name === "first-contentful-paint") { report.fcp = e.startTime; send(); }
}).observe({ type: "paint", buffered: true });
${
  mode === "injected"
    ? `setTimeout(() => {
  const s = document.createElement("style");
  s.textContent = ${JSON.stringify(CSS)};
  document.head.appendChild(s);
  report.styled = performance.now();
  send();
}, ${BUNDLE_DELAY_MS});`
    : "send();"
}
</script></body></html>`;
}

type Report = { fcp: number | null; styled: number | null };

export function DeliveryDemo() {
  const [mode, setMode] = useState<Mode>("injected");
  const [run, setRun] = useState(0);
  const [report, setReport] = useState<Report | null>(null);
  const [stalled, setStalled] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.data?.kind !== "css-delivery") return;
      setReport({ fcp: event.data.fcp, styled: event.data.styled });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function handlePlay() {
    setReport(null);
    setRun((r) => r + 1);
  }

  function handleModeChange(value: Mode) {
    setMode(value);
    setReport(null);
    setRun((r) => r + 1);
  }

  // A frame that is off screen isn't painted, so bring it into view as it loads,
  // and say so if no paint is reported (a background tab never paints).
  useEffect(() => {
    if (!run) return;
    frame.current?.scrollIntoView({ block: "nearest" });
    const timer = setTimeout(() => setStalled(true), BUNDLE_DELAY_MS + 1500);
    return () => {
      clearTimeout(timer);
      setStalled(false);
    };
  }, [run]);

  const done = report?.fcp != null && report.styled != null;
  const flash = done && report.styled! > report.fcp!;
  // Injected styles can only beat the first paint if the browser wasn't painting the frame at all.
  const notPainting = done && mode === "injected" && !flash;

  return (
    <div className="flex flex-col gap-4">
      <Choice legend="How the CSS arrives" value={mode} options={MODES} onChange={handleModeChange} />
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handlePlay}>
          <Play aria-hidden />
          {run ? "Load it again" : "Load the page"}
        </Button>
        <p aria-live="polite" className="text-sm">
          {!run
            ? "Watch the frame as it loads."
            : !done
              ? stalled && report?.fcp == null
                ? "No paint reported yet: browsers don't paint a tab in the background or a frame off screen. Bring the frame into view and load it again."
                : "Loading…"
              : notPainting
                ? `The frame first painted at ${Math.round(report.fcp!)} ms, after the styles arrived at ${Math.round(report.styled!)} ms, because the browser wasn't painting it (background tab or off screen). Load it again with the frame in view.`
                : flash
                ? `First paint at ${Math.round(report.fcp!)} ms was unstyled; the styles arrived at ${Math.round(report.styled!)} ms. That gap is the flash of unstyled content.`
                : `First paint at ${Math.round(report.fcp!)} ms was already styled: the CSS was in the page before anything was drawn.`}
        </p>
      </div>
      {run ? (
        <iframe
          key={`${mode}-${run}`}
          ref={frame}
          title="Sample page loading"
          // Same-origin so the browser paints it in this page's process; its content is fixed page markup, never reader input.
          sandbox="allow-scripts allow-same-origin"
          srcDoc={page(mode)}
          className={cn("h-56 w-full rounded-lg border bg-white", flash && "ring-2 ring-destructive/50")}
        />
      ) : (
        <div className="flex h-56 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">The sample page loads here.</div>
      )}
      <p className="text-xs text-muted-foreground">
        Paint times come from the frame&apos;s own Paint Timing (browsers don&apos;t paint a frame that is off screen, so it scrolls into view). The {BUNDLE_DELAY_MS} ms before injected styles stands in for downloading and running the
        JavaScript bundle; an extracted stylesheet blocks rendering until it has loaded, so the browser never paints without it.
      </p>
    </div>
  );
}
