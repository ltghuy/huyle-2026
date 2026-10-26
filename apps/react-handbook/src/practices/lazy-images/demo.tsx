"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Fragment, useCallback, useEffect, useId, useRef, useState } from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery } from "@/practices/data-fetching-hook/use-query";
import { toast } from "@/practices/toast-notifications/toast-store";
import { PHOTO_COUNTS, type PhotoCount } from "@/server/practices/lazy-images/photos.schema";

import { Gallery, GallerySkeleton } from "./gallery";
import { fetchPhotos, photosKey, saveRunSettings } from "./photos-api";
import { ResultsTable } from "./results-table";
import {
  createRun,
  DEFAULT_SETTINGS,
  endRun,
  STRATEGIES,
  type GallerySettings,
  type PlaceholderKind,
  type ResultRow,
  type Run,
  type Strategy,
} from "./run";
import { RunCounters } from "./run-counters";

const PLACEHOLDERS: { value: PlaceholderKind; label: string }[] = [
  { value: "blur", label: "Blur-up preview" },
  { value: "color", label: "Dominant color" },
  { value: "skeleton", label: "Skeleton" },
  { value: "none", label: "None" },
];
const PRELOADS = [0, 200, 600];
const DELAYS = [0, 150, 400];
const PRIORITIES = [0, 3, 6];
const SETTINGS_DEBOUNCE_MS = 200;

type Network = { latencyMs: number; failRate: number };

export function Demo() {
  const [settings, setSettings] = useState<GallerySettings>(DEFAULT_SETTINGS);
  const [network, setNetwork] = useState<Network>({ latencyMs: 600, failRate: 0 });
  const [resetToken, setResetToken] = useState(0);
  const [ready, setReady] = useState<{ run: Run; token: number } | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [results, setResults] = useState<Partial<Record<Strategy, ResultRow>>>({});
  const networkRef = useRef(network);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { count } = settings;
  const fetcher = useCallback(({ signal }: { signal: AbortSignal }) => fetchPhotos(count, signal), [count]);
  const photos = useQuery(photosKey(count), fetcher);
  const photoList = photos.data;

  // A run per (photo list, settings, reset): created after the list arrives,
  // registered on the server, ended (downloads cancelled, final numbers kept)
  // when anything changes or the demo unmounts.
  useEffect(() => {
    if (!photoList) return;
    const next = createRun(settings, photoList);
    let active = true;
    registerRun(next, networkRef.current).then(
      () => {
        if (!active) return;
        setRunError(null);
        setReady({ run: next, token: resetToken });
      },
      (error: unknown) => {
        if (active) setRunError(error instanceof Error ? error.message : String(error));
      },
    );
    return () => {
      active = false;
      void endRun(next).then((metrics) => {
        if (!next.metrics.started) return;
        setResults((prev) => ({
          ...prev,
          [next.settings.strategy]: { strategy: next.settings.strategy, run: next.id, settings: next.settings, metrics },
        }));
      });
    };
  }, [photoList, settings, resetToken]);

  // The registered run, unless a newer one is being set up.
  const live =
    ready && ready.run.settings === settings && ready.token === resetToken && ready.run.metrics.total === photoList?.length
      ? ready.run
      : null;

  function handleReset() {
    setResetToken((n) => n + 1);
  }

  function update<K extends keyof GallerySettings>(key: K, value: GallerySettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function updateNetwork(patch: Partial<Network>) {
    const next = { ...networkRef.current, ...patch };
    networkRef.current = next;
    setNetwork(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const runId = live?.id;
    if (!runId) return;
    saveTimer.current = setTimeout(() => void pushNetwork(runId, next), SETTINGS_DEBOUNCE_MS);
  }

  return (
    <>
      <DemoControls>
        <StrategyPicker value={settings.strategy} onChange={(value) => update("strategy", value)} />
        <Select
          label="Placeholder"
          value={settings.placeholder}
          options={PLACEHOLDERS}
          onChange={(value) => update("placeholder", value as PlaceholderKind)}
        />
        <Select
          label="Preload distance"
          value={String(settings.preloadPx)}
          options={PRELOADS.map((n) => ({ value: String(n), label: n ? `${n} px` : "None" }))}
          onChange={(value) => update("preloadPx", Number(value))}
          disabled={settings.strategy !== "hand-built"}
        />
        <Select
          label="Start delay"
          value={String(settings.delayMs)}
          options={DELAYS.map((n) => ({ value: String(n), label: n ? `${n} ms` : "Off" }))}
          onChange={(value) => update("delayMs", Number(value))}
          disabled={settings.strategy !== "hand-built"}
        />
        <Select
          label="Priority images"
          value={String(settings.priority)}
          options={PRIORITIES.map((n) => ({ value: String(n), label: n ? `First ${n}` : "None" }))}
          onChange={(value) => update("priority", Number(value))}
        />
        <Select
          label="Photos"
          value={String(settings.count)}
          options={PHOTO_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(value) => update("count", Number(value) as PhotoCount)}
        />
        <Checkbox label="Reserve space" checked={settings.reserve} onChange={(value) => update("reserve", value)} />
        <Range
          label="Latency"
          unit="ms"
          value={network.latencyMs}
          min={0}
          max={3000}
          step={100}
          onChange={(value) => updateNetwork({ latencyMs: value })}
        />
        <Range
          label="Failure rate"
          unit="%"
          value={Math.round(network.failRate * 100)}
          min={0}
          max={100}
          step={10}
          onChange={(value) => updateNetwork({ failRate: value / 100 })}
        />
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw aria-hidden /> Reset run
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          Changing strategy, placeholder, distance, delay, priority, photos or reserve starts a new run
          (fresh image addresses, counters at zero). Latency and failure apply to the next requests.
          Preload distance and start delay apply to the hand-built loader only.
        </p>
      </DemoControls>

      <DemoStage className="flex flex-col gap-3">
        {photos.error && !photoList ? (
          <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-destructive">
              <TriangleAlert aria-hidden className="size-4" /> Couldn&apos;t load the photo list
            </p>
            <p className="text-xs text-muted-foreground">{photos.error.message}</p>
            <Button size="sm" variant="outline" onClick={photos.refetch}>
              <RotateCcw aria-hidden /> Retry
            </Button>
          </div>
        ) : runError ? (
          <div role="alert" className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 p-4">
            <p className="text-sm font-medium text-destructive">Couldn&apos;t start the run: {runError}</p>
            <Button size="sm" variant="outline" onClick={handleReset}>
              <RotateCcw aria-hidden /> Retry
            </Button>
          </div>
        ) : live && photoList ? (
          <Fragment key={live.id}>
            <RunCounters metrics={live.metrics} showSkipped={live.settings.strategy === "hand-built"} />
            <Gallery photos={photoList} run={live} />
            <ResultsTable run={live} results={results} />
          </Fragment>
        ) : (
          <>
            <p role="status" className="text-xs text-muted-foreground">Loading photos…</p>
            <GallerySkeleton count={count} />
          </>
        )}
      </DemoStage>
    </>
  );
}

async function registerRun(run: Run, network: Network) {
  await saveRunSettings({ run: run.id, ...network });
  // Stats stream before the gallery mounts: once images hold the browser's
  // connections, a new request would queue behind them.
  await run.metrics.connect();
}

async function pushNetwork(run: string, network: Network) {
  try {
    await saveRunSettings({ run, ...network });
  } catch (error) {
    toast.error("Couldn't update latency and failure rate", {
      description: error instanceof Error ? error.message : String(error),
    });
  }
}

function StrategyPicker({ value, onChange }: { value: Strategy; onChange: (value: Strategy) => void }) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-xs font-medium text-muted-foreground">Strategy</legend>
      <div className="flex flex-wrap gap-1 rounded-lg border p-1">
        {STRATEGIES.map((s) => (
          <label
            key={s.value}
            title={s.hint}
            className={cn(
              "flex min-h-8 cursor-pointer items-center rounded-md px-2.5 text-sm has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
              value === s.value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            <input
              type="radio"
              name={name}
              value={s.value}
              checked={value === s.value}
              onChange={() => onChange(s.value)}
              className="sr-only"
            />
            {s.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Select({
  label, value, options, onChange, disabled,
}: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border bg-background px-2 text-sm text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex h-8 items-center gap-2 self-end">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-primary"
      />
      <label htmlFor={id} className="text-sm text-foreground">
        {label}
      </label>
    </div>
  );
}

function Range({
  label, unit, value, min, max, step, onChange,
}: {
  label: string; unit: string; value: number; min: number; max: number; step: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}: {value}
        {unit}
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-32 accent-primary"
      />
    </div>
  );
}
