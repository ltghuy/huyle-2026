"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Verdict } from "@/handbook/ui";

import { compareOrigins } from "./url-parts";

const PAIRS: [string, string][] = [
  ["https://app.example.com", "https://api.example.com/users"],
  ["https://example.com/a", "https://example.com/b?x=1"],
  ["https://example.com", "http://example.com"],
  ["http://localhost:3000", "http://localhost:4000"],
  ["https://ada.github.io", "https://grace.github.io"],
];

export function OriginDemo() {
  const [first, setFirst] = useState(PAIRS[0][0]);
  const [second, setSecond] = useState(PAIRS[0][1]);
  const result = compareOrigins(first, second);

  function handlePair(pair: [string, string]) {
    setFirst(pair[0]);
    setSecond(pair[1]);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="origin-a">Page</Label>
          <Input id="origin-a" value={first} spellCheck={false} onChange={(e) => setFirst(e.target.value)} className="font-mono text-xs" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="origin-b">Request or other window</Label>
          <Input id="origin-b" value={second} spellCheck={false} onChange={(e) => setSecond(e.target.value)} className="font-mono text-xs" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {PAIRS.map((pair) => (
          <Button key={pair.join()} variant="outline" size="sm" className="h-auto py-1 font-mono text-[0.6875rem]" aria-pressed={pair[0] === first && pair[1] === second} onClick={() => handlePair(pair)}>
            {pair[0].replace(/^https?:\/\//, "")} ↔ {pair[1].replace(/^https?:\/\//, "")}
          </Button>
        ))}
      </div>

      <div aria-live="polite">
        {result.ok ? (
          <div className="flex flex-col gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                <Verdict pass={result.sameOrigin}>{result.sameOrigin ? "Same origin" : "Cross-origin"}</Verdict>
                <span className="text-xs text-foreground/85">
                  {result.sameOrigin
                    ? "Scheme, host and port all match; the path doesn't matter."
                    : `Different ${result.differs.join(" and ")}: ${result.a.origin} vs ${result.b.origin}.`}
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
                <Verdict pass={result.sameSite}>{result.sameSite ? "Same site" : "Cross-site"}</Verdict>
                <span className="text-xs text-foreground/85">
                  {result.sameSite ? "Same scheme and registrable domain (subdomains and ports can differ)." : "A different registrable domain or scheme."}
                </span>
              </div>
            </div>
            <ul className="flex flex-col gap-1.5 text-sm">
              <li className="flex flex-wrap items-center gap-2">
                <Verdict pass={result.sameOrigin}>{result.sameOrigin ? "Can" : "Can't"}</Verdict>
                read a fetch response{result.sameOrigin ? "" : " unless the server allows it with CORS"}
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <Verdict pass={result.sameOrigin}>{result.sameOrigin ? "Can" : "Can't"}</Verdict>
                reach into the other window&apos;s DOM or storage (iframes, popups){result.sameOrigin ? "" : "; use postMessage"}
              </li>
              <li className="flex flex-wrap items-center gap-2">
                <Verdict pass={result.sameSite}>{result.sameSite ? "Sends" : "Doesn't send"}</Verdict>
                SameSite=Lax/Strict cookies on requests between them{result.sameSite ? "" : " (Lax ones only on top-level navigation)"}
              </li>
            </ul>
          </div>
        ) : (
          <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{result.reason}</p>
        )}
      </div>
    </div>
  );
}
