"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Choice } from "@/handbook/jwt/token-view";
import { cn } from "@/lib/utils";

import { PRODUCTS, STAGES } from "./framework";

const PRODUCT_OPTIONS = PRODUCTS.map((p) => ({ value: p.id, label: p.name }));

export function FrameworkDemo() {
  const [productId, setProductId] = useState(PRODUCTS[0].id);
  const [step, setStep] = useState(0);

  const product = PRODUCTS.find((p) => p.id === productId)!;
  const stage = STAGES[step];

  return (
    <div className="flex flex-col gap-4">
      <Choice legend="Work the method on" value={productId} options={PRODUCT_OPTIONS} onChange={setProductId} />

      <ol className="flex flex-wrap gap-1.5" aria-label="Stages">
        {STAGES.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                i === step ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <span className="font-mono tabular-nums">{i + 1}</span>
              <span className="hidden sm:inline">{s.name}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-base font-semibold">
            <span className="font-mono text-sm text-muted-foreground tabular-nums">{String(step + 1).padStart(2, "0")} · </span>
            {stage.name}
          </h4>
          <span className="text-xs text-muted-foreground">{stage.minutes} of your time</span>
        </div>
        <p className="text-sm text-foreground/85">{stage.summary}</p>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-medium text-foreground/75">
            Example: {stage.name.toLowerCase()} for a {product.name.toLowerCase()}
          </p>
          <p className="mt-1 text-sm">{product.stageNotes[stage.id]}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-foreground/75">What to produce</p>
            <ul className="flex flex-col gap-1 pl-4 text-sm text-foreground/85">
              {stage.produce.map((item) => (
                <li key={item} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-foreground/75">Common mistakes</p>
            <ul className="flex flex-col gap-1 pl-4 text-sm text-foreground/85">
              {stage.mistakes.map((item) => (
                <li key={item} className="list-disc">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          <ChevronLeft aria-hidden className="size-4" /> Previous
        </Button>
        <span aria-live="polite" className="text-xs text-muted-foreground">
          Stage {step + 1} of {STAGES.length}
        </span>
        <Button variant="outline" size="sm" onClick={() => setStep((s) => Math.min(STAGES.length - 1, s + 1))} disabled={step === STAGES.length - 1}>
          Next <ChevronRight aria-hidden className="size-4" />
        </Button>
      </div>

      <p className="text-xs text-foreground/75">
        This is one worked example. Another team might render a {product.name.toLowerCase()} entirely on the client, or rank it differently; the method stays the same while the answers vary.
      </p>
    </div>
  );
}
