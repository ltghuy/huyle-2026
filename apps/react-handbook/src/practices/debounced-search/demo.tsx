"use client";

import { PackageSearch } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import type { LatencyMode, Product } from "@/server/practices/debounced-search/search.schema";

import { CacheInspector } from "./cache-inspector";
import { RequestTimeline } from "./request-timeline";
import { network } from "./search-api";
import { type CacheSettings, searchCache } from "./search-cache";
import { PRICE, SearchBox } from "./search-box";
import type { EngineOptions } from "./search-engine";
import { TechniquePanel, type RobotState } from "./technique-panel";
import { typePhrase } from "./typing-robot";
import { useSearchEngine } from "./use-search";

const MIN_LENGTHS = [1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }));
const MODES: { value: LatencyMode; label: string }[] = [
  { value: "random", label: "Random" },
  { value: "shorter-slower", label: "Shorter queries slower" },
];
const FRESH_TIMES = [
  { value: "5000", label: "5 s" },
  { value: "30000", label: "30 s" },
  { value: "120000", label: "2 min" },
];
const CACHE_SIZES = [5, 20, 50].map((n) => ({ value: String(n), label: `${n} entries` }));

export function Demo({ initialQuery }: { initialQuery: string }) {
  const { engine, snapshot } = useSearchEngine(initialQuery);
  const [net, setNet] = useState(() => ({ ...network }));
  const [cacheSettings, setCacheSettings] = useState<CacheSettings>(() => searchCache.getSettings());
  const [picked, setPicked] = useState<{ product: Product; query: string } | null>(null);
  const [robot, setRobot] = useState<RobotState>({ phrase: "desk lamp", speed: 50, running: false });
  const stopRobotRef = useRef<(() => void) | null>(null);
  const ids = {
    delay: useId(), minLength: useId(), latency: useId(), jitter: useId(),
    mode: useId(), fail: useId(), fresh: useId(), size: useId(),
  };

  useEffect(() => () => stopRobotRef.current?.(), []);

  function updateOptions(changes: Partial<EngineOptions>) {
    engine.setOptions(changes);
  }

  function updateNetwork(changes: Partial<typeof network>) {
    Object.assign(network, changes);
    setNet({ ...network });
  }

  function updateCache(changes: Partial<CacheSettings>) {
    searchCache.configure(changes);
    setCacheSettings(searchCache.getSettings());
  }

  function handleRobotDone() {
    stopRobotRef.current = null;
    setRobot((r) => ({ ...r, running: false }));
  }

  function handleRobotStart() {
    stopRobotRef.current?.();
    setRobot((r) => ({ ...r, running: true }));
    stopRobotRef.current = typePhrase(robot.phrase, robot.speed, (text) => engine.setInput(text), handleRobotDone);
  }

  function handleRobotStop() {
    if (!stopRobotRef.current) return;
    stopRobotRef.current();
    handleRobotDone();
  }

  function handlePick(product: Product) {
    setPicked({ product, query: snapshot.key });
  }

  const { options } = snapshot;

  return (
    <>
      <DemoControls>
        <Range id={ids.delay} label={`Debounce delay: ${options.debounceMs} ms`} min={0} max={1000} step={50} value={options.debounceMs} onChange={(v) => updateOptions({ debounceMs: v })} />
        <Select id={ids.minLength} label="Minimum length" value={String(options.minLength)} options={MIN_LENGTHS} onChange={(v) => updateOptions({ minLength: Number(v) })} />
        <Range id={ids.latency} label={`Server latency: ${net.latencyMs} ms`} min={0} max={2000} step={100} value={net.latencyMs} onChange={(v) => updateNetwork({ latencyMs: v })} />
        <Range id={ids.jitter} label={`Random extra: 0–${net.jitterMs} ms`} min={0} max={1500} step={100} value={net.jitterMs} onChange={(v) => updateNetwork({ jitterMs: v })} />
        <Select id={ids.mode} label="Latency mode" value={net.mode} options={MODES} onChange={(v) => updateNetwork({ mode: v as LatencyMode })} />
        <Range id={ids.fail} label={`Failure rate: ${Math.round(net.failRate * 100)}%`} min={0} max={100} step={10} value={Math.round(net.failRate * 100)} onChange={(v) => updateNetwork({ failRate: v / 100 })} />
        <Select id={ids.fresh} label="Cache fresh for" value={String(cacheSettings.freshMs)} options={FRESH_TIMES} onChange={(v) => updateCache({ freshMs: Number(v) })} />
        <Select id={ids.size} label="Cache size" value={String(cacheSettings.maxEntries)} options={CACHE_SIZES} onChange={(v) => updateCache({ maxEntries: Number(v) })} />
      </DemoControls>

      <DemoStage>
        <div className="flex flex-col gap-4">
          <TechniquePanel
            techniques={options}
            onTechniquesChange={updateOptions}
            robot={robot}
            onRobotChange={(changes) => setRobot((r) => ({ ...r, ...changes }))}
            onRobotStart={handleRobotStart}
            onRobotStop={handleRobotStop}
          />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <SearchBox
              engine={engine}
              snapshot={snapshot}
              pickedId={picked?.product.id ?? null}
              onPick={handlePick}
              onUserInput={handleRobotStop}
            />
            <PickedProduct picked={picked} />
          </div>
          <RequestTimeline timeline={snapshot.timeline} counters={snapshot.counters} onClear={() => engine.clearTimeline()} />
          <CacheInspector />
        </div>
      </DemoStage>
    </>
  );
}

function PickedProduct({ picked }: { picked: { product: Product; query: string } | null }) {
  return (
    <section aria-labelledby="picked-heading" className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
      <h3 id="picked-heading" className="flex items-center gap-2 font-semibold">
        <PackageSearch aria-hidden className="size-4 text-muted-foreground" /> Picked product
      </h3>
      {picked ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
          <dt className="text-foreground/75">Name</dt>
          <dd className="font-medium">{picked.product.name}</dd>
          <dt className="text-foreground/75">Category</dt>
          <dd>{picked.product.category}</dd>
          <dt className="text-foreground/75">Price</dt>
          <dd className="tabular-nums">{PRICE.format(picked.product.price / 100)}</dd>
          <dt className="text-foreground/75">Id</dt>
          <dd className="font-mono">{picked.product.id}</dd>
          <dt className="text-foreground/75">Found by</dt>
          <dd className="truncate">“{picked.query}”</dd>
        </dl>
      ) : (
        <p className="text-muted-foreground">Pick a result with Enter or a click.</p>
      )}
    </section>
  );
}

type Option = { value: string; label: string };

function Select({ id, label, value, options, onChange }: {
  id: string; label: string; value: string; options: Option[]; onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-sm">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function Range({ id, label, min, max, step, value, onChange }: {
  id: string; label: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-8 w-32 accent-primary" />
    </div>
  );
}
