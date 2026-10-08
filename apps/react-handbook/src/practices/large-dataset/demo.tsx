"use client";

import { Pause, Play, TriangleAlert } from "lucide-react";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { DemoControls } from "@/components/playground/demo-controls";
import { DemoStage } from "@/components/playground/demo-stage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DATASET_SIZES,
  DEFAULT_SIZE,
  type DatasetSize,
  type Instrument,
} from "@/server/practices/large-dataset/instruments.schema";

import { BENCHMARK_FEED, benchmarkResults, runBenchmark, type BenchmarkApi, type Optimizations } from "./benchmark";
import { BenchmarkPanel, type BenchmarkState } from "./benchmark-panel";
import { Board, ROW_HEIGHT } from "./board";
import { loadDataset } from "./dataset";
import { derive, matchesQuery, type Sort, type SortColumn } from "./derive";
import { DetailsPanel } from "./details-panel";
import { applyUpdates, buildIndex, createRng, nextUpdates, type IdIndex } from "./feed";
import { formatCount, formatMs } from "./format";
import {
  markInput,
  onSlowRender,
  renderTimer,
  resetMetrics,
  SLOW_RENDER_MS,
  startMonitoring,
  timeDerive,
  timeUpdate,
} from "./metrics";
import { MetricsPanel } from "./metrics-panel";
import { ALL_ON, HEAVY_ROWS, heavyWarning, OptimizationPanel } from "./optimization-panel";

const SIZES = DATASET_SIZES.map((n) => ({ value: String(n), label: `${formatCount(n)} instruments` }));
const RATES = [1, 2, 4, 10].map((n) => ({ value: String(n), label: `${n} per second` }));
const BATCHES = [50, 200, 500, 2000].map((n) => ({ value: String(n), label: `${formatCount(n)} rows` }));

type Board = { size: DatasetSize; rows: Instrument[]; index: IdIndex };
type Load = { size: DatasetSize; error: string | null };

function subscribeVisibility(callback: () => void) {
  document.addEventListener("visibilitychange", callback);
  return () => document.removeEventListener("visibilitychange", callback);
}
const isHidden = () => document.hidden;
const neverHidden = () => false;

export function Demo() {
  const ids = { size: useId(), rate: useId(), batch: useId(), filter: useId() };
  const [size, setSize] = useState<DatasetSize>(DEFAULT_SIZE);
  const [board, setBoard] = useState<Board | null>(null);
  const [load, setLoad] = useState<Load>({ size: DEFAULT_SIZE, error: null });
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [flags, setFlags] = useState<Optimizations>(ALL_ON);
  const [feed, setFeed] = useState({ perSecond: 2, batch: 200, paused: false });
  const [safetyNotice, setSafetyNotice] = useState<string | null>(null);
  const [bench, setBench] = useState<BenchmarkState>({ running: false, step: 0, label: "" });
  const [benchFeed, setBenchFeed] = useState(false);
  const hidden = useSyncExternalStore(subscribeVisibility, isHidden, neverHidden);
  const scrollRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<Instrument[] | null>(null);
  const visibleRef = useRef<Instrument[]>([]);
  const benchAbort = useRef<AbortController | null>(null);

  // --- dataset ---------------------------------------------------------------
  useEffect(() => {
    let current = true;
    loadDataset(size).then(
      (rows) => {
        if (current) setBoard({ size, rows, index: buildIndex(rows) });
      },
      (error: unknown) => {
        if (current) setLoad({ size, error: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      current = false;
    };
  }, [size, retry]);

  const ready = board?.size === size ? board : null;
  const rows = ready?.rows ?? null;

  // --- filter and sort ---------------------------------------------------------
  const deferredQuery = useDeferredValue(query);
  const activeQuery = flags.deferredFilter ? deferredQuery : query;
  // Hooks can't be conditional: the memo always exists, but only does work
  // when "cached filter and sort" is on.
  const cached = useMemo(
    () => (flags.cachedDerive && rows ? timeDerive(() => derive(rows, activeQuery, sort)) : null),
    [flags.cachedDerive, rows, activeQuery, sort],
  );
  const visible = flags.cachedDerive ? cached : rows ? timeDerive(() => derive(rows, activeQuery, sort)) : null;

  const selected = ready && selectedId !== null ? ready.rows[ready.index.get(selectedId) ?? -1] ?? null : null;

  useLayoutEffect(() => {
    rowsRef.current = rows;
    visibleRef.current = visible ?? [];
    // Renders that skipped the board end here.
    renderTimer.end();
  });

  // --- measurement and safety ------------------------------------------------------
  useEffect(() => startMonitoring(), []);

  const feedRunning = !!ready && !hidden && (bench.running ? benchFeed : !feed.paused && !safetyNotice);

  const handleSlowRender = useEffectEvent((ms: number) => {
    // The benchmark keeps going so runs stay comparable; it stops on its own.
    if (!feedRunning || bench.running) return;
    setSafetyNotice(`An update took ${formatMs(ms)} (over ${formatMs(SLOW_RENDER_MS)}), so the feed was paused to keep the tab usable.`);
  });
  useEffect(() => onSlowRender(handleSlowRender), []);

  // --- live feed ------------------------------------------------------------------
  const perSecond = bench.running ? BENCHMARK_FEED.perSecond : feed.perSecond;
  const batch = bench.running ? BENCHMARK_FEED.batch : feed.batch;

  const tick = useEffectEvent((random: () => number) => {
    const current = rowsRef.current;
    if (!current || !ready) return;
    const updates = nextUpdates(current, batch, random, Date.now());
    const next = timeUpdate(() => applyUpdates(current, updates, flags.indexedUpdates ? ready.index : null));
    renderTimer.start();
    setBoard((b) => (b && b.rows === current ? { ...b, rows: next } : b));
  });

  useEffect(() => {
    if (!feedRunning) return;
    // Seeded per start: the benchmark replays the same updates every run.
    const random = createRng(bench.running ? BENCHMARK_FEED.seed : Date.now());
    const timer = setInterval(() => tick(random), 1000 / perSecond);
    return () => clearInterval(timer);
  }, [feedRunning, perSecond, bench.running]);

  // --- handlers ---------------------------------------------------------------------
  const handleSelect = useCallback((id: number) => {
    renderTimer.start();
    setSelectedId(id);
  }, []);

  function handleQueryChange(text: string) {
    renderTimer.start();
    setQuery(text);
  }

  // Everything passed to the memoized board must be stable: one new function
  // per render and memo never skips (every keystroke re-rendered all rows).
  const handleSort = useCallback((column: SortColumn) => {
    renderTimer.start();
    setSort((s) => (s?.column === column && s.dir === "asc" ? { column, dir: "desc" } : { column, dir: "asc" }));
  }, []);

  const handleClearFilter = useCallback(() => {
    renderTimer.start();
    setQuery("");
  }, []);

  function handleFlagsChange(next: Optimizations) {
    renderTimer.start();
    setFlags(next);
  }

  async function handleSizeChange(next: DatasetSize) {
    if (!flags.windowing && next > HEAVY_ROWS && !(await heavyWarning(next))) return;
    resetMetrics();
    setSize(next);
  }

  function handleRetry() {
    setLoad({ size, error: null });
    setRetry((n) => n + 1);
  }

  function handleResume() {
    setSafetyNotice(null);
    setFeed((f) => ({ ...f, paused: false }));
  }

  // The benchmark drives the same handlers as the user.
  const api: BenchmarkApi = {
    setQuery: handleQueryChange,
    sortBy: handleSort,
    selectRow: (n) => {
      const row = visibleRef.current[n];
      if (row) handleSelect(row.id);
    },
    scrollTo: (fraction) => {
      const box = scrollRef.current;
      if (box) box.scrollTop = fraction * (box.scrollHeight - box.clientHeight);
    },
    setBenchmarkFeed: setBenchFeed,
  };

  async function handleRunBenchmark() {
    const abort = new AbortController();
    benchAbort.current = abort;
    setQuery("");
    setSort(null);
    setSelectedId(null);
    setSafetyNotice(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    resetMetrics();
    setBench({ running: true, step: 0, label: "Starting" });
    const config = flags;
    const datasetRows = size;
    try {
      const summary = await runBenchmark(api, abort.signal, (step, label) => setBench({ running: true, step, label }));
      if (summary) benchmarkResults.add({ ...summary, config, rows: datasetRows });
    } finally {
      benchAbort.current = null;
      setBench({ running: false, step: 0, label: "" });
    }
  }

  function handleStopBenchmark() {
    benchAbort.current?.abort();
  }

  useEffect(() => () => benchAbort.current?.abort(), []);

  const loading = !ready;
  const loadError = load.size === size ? load.error : null;
  const stale = query !== activeQuery;

  return (
    <>
      <DemoControls>
        <Select id={ids.size} label="Dataset" value={String(size)} options={SIZES} disabled={bench.running} onChange={(v) => handleSizeChange(Number(v) as DatasetSize)} />
        <Select id={ids.rate} label="Updates" value={String(feed.perSecond)} options={RATES} disabled={bench.running} onChange={(v) => setFeed((f) => ({ ...f, perSecond: Number(v) }))} />
        <Select id={ids.batch} label="Rows per update" value={String(feed.batch)} options={BATCHES} disabled={bench.running} onChange={(v) => setFeed((f) => ({ ...f, batch: Number(v) }))} />
        <Button variant="outline" disabled={bench.running} aria-pressed={feed.paused} onClick={() => setFeed((f) => ({ ...f, paused: !f.paused }))}>
          {feed.paused ? <Play aria-hidden /> : <Pause aria-hidden />}
          {feed.paused ? "Resume feed" : "Pause feed"}
        </Button>
      </DemoControls>

      <DemoStage>
        <div className="flex flex-col gap-4">
          <OptimizationPanel flags={flags} rows={size} disabled={bench.running} onChange={handleFlagsChange} />

          {safetyNotice ? (
            <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
              <TriangleAlert aria-hidden className="size-4 text-warning" />
              <span className="flex-1">{safetyNotice}</span>
              <Button variant="outline" size="sm" onClick={handleResume}>Resume feed</Button>
            </div>
          ) : null}

          <MetricsPanel />

          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
              <div className="flex min-w-0 flex-1 basis-60 flex-col gap-1">
                <label htmlFor={ids.filter} className="text-xs font-medium text-muted-foreground">Filter by symbol, name or sector</label>
                <Input
                  id={ids.filter}
                  type="search"
                  value={query}
                  autoComplete="off"
                  placeholder="e.g. tech, bank, solar"
                  onKeyDown={markInput}
                  onChange={(e) => handleQueryChange(e.target.value)}
                />
              </div>
              <p className="pb-1.5 text-sm text-foreground/75 tabular-nums" aria-live="polite">
                {visible ? `${formatCount(visible.length)} of ${formatCount(size)} instruments` : ""}
                {stale ? " · updating…" : ""}
              </p>
            </div>
            {loading ? (
              <BoardPlaceholder size={size} error={loadError} onRetry={handleRetry} />
            ) : (
              // Dimmed here, not via a Board prop: a prop change would make
              // the urgent keystroke render re-render the whole board.
              <div aria-busy={stale || undefined} className={cn("motion-safe:transition-opacity", stale && "opacity-60")}>
                <Board
                  key={flags.windowing ? "windowed" : "full"}
                  rows={visible ?? []}
                  selectedId={selectedId}
                  onSelect={handleSelect}
                  sort={sort}
                  onSort={handleSort}
                  windowing={flags.windowing}
                  memoRows={flags.memoRows}
                  onClearFilter={handleClearFilter}
                  scrollRef={scrollRef}
                />
              </div>
            )}
            <p className="text-xs text-foreground/75">
              {hidden
                ? "Feed paused while the tab is hidden."
                : feedRunning
                  ? `Live: ${formatCount(batch)} rows × ${perSecond} per second.`
                  : "Feed paused."}
            </p>
          </div>

          <DetailsPanel instrument={selected} hiddenByFilter={!!selected && !matchesQuery(selected, activeQuery)} />

          <BenchmarkPanel state={bench} disabled={loading} onRun={handleRunBenchmark} onStop={handleStopBenchmark} />
        </div>
      </DemoStage>
    </>
  );
}

function BoardPlaceholder({ size, error, onRetry }: { size: number; error: string | null; onRetry: () => void }) {
  return (
    <div className="flex h-[30rem] flex-col items-center justify-center gap-3 rounded-lg border text-sm" style={{ minHeight: ROW_HEIGHT * 4 }}>
      {error ? (
        <div role="alert" className="flex flex-col items-center gap-2">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
        </div>
      ) : (
        <p className="text-foreground/75" role="status">Loading {formatCount(size)} instruments…</p>
      )}
    </div>
  );
}

type Option = { value: string; label: string };

function Select({ id, label, value, options, disabled, onChange }: {
  id: string; label: string; value: string; options: Option[]; disabled?: boolean; onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="h-8 rounded-md border bg-background px-2 text-sm disabled:opacity-50">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
