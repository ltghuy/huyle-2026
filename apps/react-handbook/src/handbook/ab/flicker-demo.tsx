"use client";

import { RotateCcw } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Two copies of a product page in sandboxed frames. One decides the variant in
// the browser after a flag request, so it paints the default first; the other
// gets the variant in its HTML, the way this page's server does it.

function page({ assignInBrowser, delay }: { assignInBrowser: boolean; delay: number }) {
  const button = assignInBrowser ? "Add to cart" : "Buy now";
  const style = assignInBrowser ? "background:#fff;color:#111;border:1px solid #888" : "background:#111;color:#fff;border:1px solid #111";
  const script = assignInBrowser
    ? `<script>
        const start = performance.now();
        // The flag service answers after a network round trip.
        setTimeout(() => {
          const b = document.querySelector("button");
          b.textContent = "Buy now";
          b.style.cssText = "background:#111;color:#fff;border:1px solid #111";
          document.querySelector("#note").textContent = "Switched to B after " + Math.round(performance.now() - start) + " ms: the first paint showed A.";
        }, ${delay});
      </script>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Product page</title>
<style>body{font:14px system-ui,sans-serif;margin:0;padding:16px;background:#fafafa;color:#111}button{font:inherit;padding:8px 14px;border-radius:8px}p{margin:0 0 8px}#note{margin-top:12px;font-size:12px;color:#444}</style>
</head><body><p><strong>Walnut desk lamp</strong></p><p>$89.00</p><button type="button" style="${style}">${button}</button>
<p id="note">${assignInBrowser ? "Waiting for the flag…" : "B was in the HTML: nothing to switch."}</p>${script}</body></html>`;
}

export function FlickerDemo() {
  const [delay, setDelay] = useState(600);
  const [run, setRun] = useState(0);
  const delayId = useId();

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-48 flex-col gap-1.5">
          <Label htmlFor={delayId}>Flag request takes {delay} ms</Label>
          <input id={delayId} type="range" min={100} max={2000} step={100} value={delay} onChange={(e) => setDelay(Number(e.target.value))} className="accent-primary" />
        </div>
        <Button variant="outline" onClick={() => setRun((n) => n + 1)}>
          <RotateCcw aria-hidden /> Load both again
        </Button>
      </div>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <figure className="flex min-w-0 flex-col gap-1.5">
          <figcaption className="text-sm font-medium">Assigned in the browser</figcaption>
          <iframe key={`client-${run}-${delay}`} title="Variant assigned in the browser" sandbox="allow-scripts" srcDoc={page({ assignInBrowser: true, delay })} className="h-44 w-full rounded-lg border" />
        </figure>
        <figure className="flex min-w-0 flex-col gap-1.5">
          <figcaption className="text-sm font-medium">Assigned on the server (this page&apos;s way)</figcaption>
          <iframe key={`server-${run}`} title="Variant assigned on the server" sandbox="allow-scripts" srcDoc={page({ assignInBrowser: false, delay })} className="h-44 w-full rounded-lg border" />
        </figure>
      </div>
      <p className="text-xs text-foreground/75">
        The left page paints &quot;Add to cart&quot; and swaps it when the flag arrives: visitors in B see A first, and the swap itself can change what they do. The
        right page already has B in its HTML. An edge function can do the same work closer to the visitor; hiding the page until the flag arrives (an
        &quot;anti-flicker&quot; snippet) trades the flash for a blank wait.
      </p>
    </div>
  );
}
