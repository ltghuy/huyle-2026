"use client";

import { FileWarning, History } from "lucide-react";
import { useId, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import { Button } from "@/components/ui/button";
import type { CheckoutFail } from "@/server/practices/context-reducer/shop.schema";

import { ActionLog } from "./action-log";
import { CartPanel } from "./cart-panel";
import { SAMPLE_CORRUPT, SAMPLE_V1 } from "./cart-storage";
import { ProductGrid } from "./product-grid";
import type { Strategy } from "./render-counter";
import { RenderReports } from "./render-reports";
import { Scoreboard } from "./scoreboard";
import { network } from "./shop-api";
import { ShopHeader } from "./shop-header";
import { loadRawSave, ShopRoot, useCatalog } from "./shop-root";
import { UndoBar } from "./undo-bar";

const FAILURES: { value: CheckoutFail; label: string }[] = [
  { value: "none", label: "None" },
  { value: "network", label: "Server error" },
  { value: "conflict", label: "Stock conflict" },
];

export function Demo() {
  const [strategy, setStrategy] = useState<Strategy>("single");
  const [latency, setLatency] = useState(network.checkoutLatencyMs);
  const [fail, setFail] = useState<CheckoutFail>(network.checkoutFail);
  const ids = { latency: useId(), fail: useId() };

  function handleLatency(value: number) {
    network.checkoutLatencyMs = value;
    setLatency(value);
  }

  function handleFail(value: CheckoutFail) {
    network.checkoutFail = value;
    setFail(value);
  }

  return (
    <ShopRoot strategy={strategy}>
      <DemoControls>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.latency} className="text-xs font-medium text-muted-foreground">
            Checkout latency: {latency} ms
          </label>
          <input id={ids.latency} type="range" min={0} max={3000} step={100} value={latency} onChange={(e) => handleLatency(Number(e.target.value))} className="h-8 w-32 accent-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={ids.fail} className="text-xs font-medium text-muted-foreground">
            Checkout failure
          </label>
          <select id={ids.fail} value={fail} onChange={(e) => handleFail(e.target.value as CheckoutFail)} className="h-8 rounded-md border bg-background px-2 text-sm">
            {FAILURES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
        <SaveButtons />
      </DemoControls>

      <DemoStage>
        <div className="flex flex-col gap-4">
          <Scoreboard strategy={strategy} onStrategyChange={setStrategy} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <ShopHeader />
            </div>
            <UndoBar />
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <ProductGrid />
            <CartPanel />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ActionLog />
            <RenderReports />
          </div>
        </div>
      </DemoStage>
    </ShopRoot>
  );
}

function SaveButtons() {
  const { byId } = useCatalog();

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => loadRawSave(SAMPLE_V1, byId)}>
        <History aria-hidden /> Load a v1 save
      </Button>
      <Button variant="outline" size="sm" onClick={() => loadRawSave(SAMPLE_CORRUPT, byId)}>
        <FileWarning aria-hidden /> Load a corrupted save
      </Button>
    </div>
  );
}
