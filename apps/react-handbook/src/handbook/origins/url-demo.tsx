"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { dissect } from "./url-parts";

const EXAMPLES = ["https://shop.example.com:8443/cart?item=42&size=m#reviews", "http://localhost:3000/api/users", "https://ada@docs.example.co.uk/guide"];

export function UrlDemo() {
  const [value, setValue] = useState(EXAMPLES[0]);
  const result = dissect(value);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="url-input">URL</Label>
        <Input id="url-input" value={value} spellCheck={false} onChange={(e) => setValue(e.target.value)} className="font-mono text-xs" />
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-foreground/75">
          Try:
          {EXAMPLES.map((example) => (
            <button key={example} type="button" onClick={() => setValue(example)} className="rounded-sm font-mono underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              {example}
            </button>
          ))}
        </p>
      </div>

      <div aria-live="polite">
        {result.ok ? (
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              {result.parts.map((part) => (
                <div key={part.label} className="contents">
                  <dt className="text-muted-foreground">{part.label}</dt>
                  <dd className="min-w-0">
                    <span className="font-mono text-xs break-all">{part.value}</span>
                    {part.note ? <span className="ml-2 text-xs text-foreground/75">{part.note}</span> : null}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                <p className="text-xs text-muted-foreground">Origin = scheme + host + port</p>
                <p className="font-mono text-sm font-semibold break-all">{result.origin}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Site = scheme + registrable domain (simplified)</p>
                <p className="font-mono text-sm font-semibold break-all">{result.site ?? "none (opaque origin)"}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{result.reason}</p>
        )}
      </div>
    </div>
  );
}
