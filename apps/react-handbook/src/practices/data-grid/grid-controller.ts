import { filterKey, matchingIds, queryEmployees } from "@/server/practices/data-grid/grid.query";
import {
  MAX_SORT_KEYS,
  type ColumnId,
  type DatasetSize,
  type Employee,
  type Filters,
  type GridView,
  type PageSize,
  type QueryBody,
  type QueryResult,
  type SortKey,
} from "@/server/practices/data-grid/grid.schema";

import type { DatasetFetcher, QueryFetcher } from "./grid-api";
import {
  EMPTY_SELECTION,
  isSelected,
  pruneToSize,
  selectAllMatching,
  selectedCount,
  setRange,
  setSelected,
  toExplicit,
  toRequest,
  type Selection,
} from "./selection";

// Framework-free owner of the whole grid: what the admin asked to see (view),
// the selection, where the query runs (browser or server), and which result is
// on screen. React subscribes with useSyncExternalStore and forwards events.
//
// One rule for both modes: the last applied result stays on screen, and a
// change marks it `pending` (shown dimmed) until the result for the current
// view replaces it. In server mode only the latest request may do that: every
// send increments a run id, aborts the previous request, and a response whose
// run id is no longer current is dropped.

export type Mode = "browser" | "server";
export type Network = { latencyMs: number; failRate: number };

export type Stats = {
  where: Mode;
  /** Compute time (browser) or round trip (server) of the last applied view. */
  ms: number;
  matched: number;
  /** Bytes downloaded for that view; 0 when it came from the downloaded dataset. */
  bytes: number;
};

export type DatasetInfo = { size: DatasetSize; bytes: number; ms: number };

export type GridSnapshot = {
  view: GridView;
  mode: Mode;
  size: DatasetSize;
  network: Network;
  selection: Selection;
  selected: number;
  /** Selected rows the current search/filters hide. */
  hiddenSelected: number;
  onlySelected: boolean;
  /** The rows on screen; may belong to an earlier view while `pending`. */
  result: QueryResult;
  pending: boolean;
  /** Browser mode is still downloading the dataset. */
  datasetLoading: boolean;
  error: string | null;
  stats: Stats | null;
  dataset: DatasetInfo | null;
  requests: number;
  /** One-off message about the selection (e.g. why it was cleared). */
  notice: string | null;
};

export const SEARCH_DEBOUNCE_MS = 300;

type DatasetEntry = {
  promise: Promise<void>;
  rows?: Employee[];
  bytes: number;
  ms: number;
  error?: string;
  abort: AbortController;
  /** Its bytes were reported in the stats of the view that waited for it. */
  counted?: boolean;
};

/** Module-level: the downloaded datasets outlive the demo (navigate away and back). */
const datasets = new Map<DatasetSize, DatasetEntry>();

type Options = {
  initialView: GridView;
  initialResult: QueryResult;
  initialSize: DatasetSize;
  fetchDataset: DatasetFetcher;
  fetchQuery: QueryFetcher;
};

export class GridController {
  private snapshot: GridSnapshot;
  private listeners = new Set<() => void>();
  private fetchers: Pick<Options, "fetchDataset" | "fetchQuery">;
  private anchorId: string | null = null;
  private runId = 0;
  private inFlight: AbortController | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  /** Explicit ids the last applied response (or browser query) says match. */
  private matchedSelected = new Set<string>();
  private stopped = false;

  constructor({ initialView, initialResult, initialSize, ...fetchers }: Options) {
    this.fetchers = fetchers;
    this.snapshot = {
      view: { ...initialView, page: initialResult.page },
      mode: "browser",
      size: initialSize,
      network: { latencyMs: 400, failRate: 0 },
      selection: EMPTY_SELECTION,
      selected: 0,
      hiddenSelected: 0,
      onlySelected: false,
      result: initialResult,
      pending: false,
      datasetLoading: false,
      error: null,
      stats: null,
      dataset: null,
      requests: 0,
      notice: null,
    };
  }

  // --- store ------------------------------------------------------------------

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  private set(changes: Partial<GridSnapshot>) {
    const next = { ...this.snapshot, ...changes };
    next.selected = selectedCount(next.selection);
    next.hiddenSelected = this.hiddenCount(next);
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }

  /** Called on mount: browser mode starts downloading the dataset in the background. */
  start() {
    this.stopped = false;
    if (this.snapshot.mode === "browser") this.ensureDataset(this.snapshot.size, false);
  }

  /** Called on unmount: nothing may update a demo that's gone. */
  stop() {
    this.stopped = true;
    this.clearDebounce();
    this.inFlight?.abort();
    this.inFlight = null;
    this.runId++;
    for (const [size, entry] of datasets) {
      if (!entry.rows) {
        entry.abort.abort();
        datasets.delete(size);
      }
    }
  }

  // --- view -------------------------------------------------------------------

  /** Click: asc → desc → none, replacing other keys. Shift: add/cycle this key, keep others. */
  toggleSort(column: ColumnId, additive: boolean) {
    const { sort } = this.snapshot.view;
    const current = sort.find((k) => k.column === column);
    const nextDir = !current ? "asc" : current.dir === "asc" ? "desc" : null;
    let next: SortKey[];
    if (!additive) {
      next = nextDir ? [{ column, dir: nextDir }] : [];
    } else if (current) {
      next = nextDir ? sort.map((k) => (k.column === column ? { column, dir: nextDir } : k)) : sort.filter((k) => k.column !== column);
    } else {
      // A 4th key replaces the lowest-priority one.
      next = [...sort.slice(0, MAX_SORT_KEYS - 1), { column, dir: "asc" }];
    }
    this.changeView({ sort: next, page: 1 });
  }

  setSearch(search: string) {
    this.changeView({ search, page: 1 }, { typing: true });
  }

  /** `typing`: the value comes from a text field, so server mode waits for a pause. */
  setFilter<K extends keyof Filters>(key: K, value: Filters[K] | undefined, typing = false) {
    const filters = { ...this.snapshot.view.filters };
    if (value === undefined || value === "") delete filters[key];
    else filters[key] = value;
    this.changeView({ filters, page: 1 }, { typing });
  }

  clearFilters() {
    this.changeView({ search: "", filters: {}, page: 1 });
  }

  setPage(page: number) {
    const target = Math.min(Math.max(1, Math.round(page) || 1), this.snapshot.result.pageCount);
    if (target === this.snapshot.view.page && !this.snapshot.pending) return;
    this.changeView({ page: target });
  }

  /** Keeps the first visible row on the new page. */
  setPageSize(pageSize: PageSize) {
    const { page, pageSize: old } = this.snapshot.view;
    this.changeView({ pageSize, page: Math.floor(((page - 1) * old) / pageSize) + 1 });
  }

  private changeView(changes: Partial<GridView>, { typing = false } = {}) {
    const prev = this.snapshot.view;
    const view = { ...prev, ...changes };
    const filterChanged = filterKey(prev) !== filterKey(view);
    let { selection, notice } = this.snapshot;
    if (filterChanged && selection.kind === "all") {
      ({ selection, notice } = this.releaseAllRule(selection, prev));
    }
    this.set({ view, selection, notice });
    this.refresh({ debounce: typing });
  }

  /**
   * The filters changed under an "all matching" rule. The browser knows every
   * row, so it keeps exactly the rows the rule covered; the server's matching
   * set has changed, so server mode clears it and says so.
   */
  private releaseAllRule(selection: Selection & { kind: "all" }, prevView: GridView) {
    const rows = this.snapshot.mode === "browser" ? datasets.get(this.snapshot.size)?.rows : undefined;
    if (rows) return { selection: toExplicit(selection, matchingIds(rows, prevView)), notice: null };
    return {
      selection: EMPTY_SELECTION,
      notice: `Selection of all ${selectedCount(selection).toLocaleString("en-US")} matching employees was cleared because the filters changed.`,
    };
  }

  // --- selection --------------------------------------------------------------

  /** Click or Space on a row; with Shift, the range from the last toggled row. */
  toggleRow(id: string, extend: boolean) {
    const { selection, result } = this.snapshot;
    const selected = !isSelected(selection, id);
    const pageIds = result.rows.map((r) => r.id);
    const next = extend
      ? setRange(selection, pageIds, this.anchorId, id, selected)
      : setSelected(selection, [id], selected);
    this.anchorId = id;
    this.changeSelection(next);
  }

  /** Header checkbox: the current page. */
  setPageSelected(selected: boolean) {
    const ids = this.snapshot.result.rows.map((r) => r.id);
    this.changeSelection(setSelected(this.snapshot.selection, ids, selected));
  }

  selectAllMatching() {
    const { view, result } = this.snapshot;
    this.changeSelection(selectAllMatching(filterKey(view), result.total));
  }

  clearSelection() {
    this.anchorId = null;
    this.changeSelection(EMPTY_SELECTION);
  }

  setOnlySelected(onlySelected: boolean) {
    this.set({ onlySelected, view: { ...this.snapshot.view, page: 1 } });
    this.refresh();
  }

  dismissNotice() {
    this.set({ notice: null });
  }

  private changeSelection(selection: Selection) {
    this.set({ selection, notice: null });
    const { mode, onlySelected } = this.snapshot;
    // Selection changes which rows show only in "show selected only"; in
    // browser mode re-running the query is cheap and keeps counts exact.
    if (mode === "browser" || onlySelected) this.refresh();
  }

  /**
   * Browser: exact. Server: selected ids that the last response didn't report
   * as matching and that aren't on screen (visible rows match by definition).
   */
  private hiddenCount(s: GridSnapshot) {
    if (s.selection.kind === "all") return 0;
    const onPage = new Set(s.result.rows.map((r) => r.id));
    let hidden = 0;
    for (const id of s.selection.ids) {
      if (!this.matchedSelected.has(id) && !onPage.has(id)) hidden++;
    }
    return hidden;
  }

  // --- demo settings ----------------------------------------------------------

  setMode(mode: Mode) {
    if (mode === this.snapshot.mode) return;
    this.clearDebounce();
    this.cancelRequest();
    this.set({ mode, error: null });
    this.refresh();
  }

  setSize(size: DatasetSize) {
    if (size === this.snapshot.size) return;
    const { selection } = this.snapshot;
    const cleared = selection.kind === "all";
    this.anchorId = null;
    this.cancelRequest();
    this.set({
      size,
      selection: cleared ? EMPTY_SELECTION : pruneToSize(selection, size),
      notice: cleared ? "Selection of all matching employees was cleared because the dataset changed." : null,
      error: null,
    });
    this.refresh();
  }

  setNetwork(changes: Partial<Network>) {
    this.set({ network: { ...this.snapshot.network, ...changes } });
  }

  retry() {
    if (this.snapshot.mode === "browser") datasets.delete(this.snapshot.size);
    this.set({ error: null });
    this.refresh();
  }

  // --- running the query --------------------------------------------------------

  private refresh({ debounce = false } = {}) {
    if (this.snapshot.mode === "browser") {
      this.clearDebounce();
      this.cancelRequest();
      const entry = datasets.get(this.snapshot.size);
      if (entry?.rows) this.applyBrowser(entry, 0);
      else this.ensureDataset(this.snapshot.size, true);
      return;
    }
    this.set({ pending: true });
    this.clearDebounce();
    if (debounce) this.debounceTimer = setTimeout(() => this.send(), SEARCH_DEBOUNCE_MS);
    else this.send();
  }

  private applyBrowser(entry: DatasetEntry, bytes: number) {
    const { view, selection, onlySelected, size } = this.snapshot;
    const started = performance.now();
    const result = queryEmployees(entry.rows!, view, toRequest(selection), onlySelected);
    const ms = performance.now() - started;
    this.matchedSelected = new Set(result.matchedSelectedIds);
    this.set({
      result,
      view: { ...view, page: result.page },
      pending: false,
      datasetLoading: false,
      error: null,
      stats: { where: "browser", ms, matched: result.total, bytes },
      dataset: { size, bytes: entry.bytes, ms: entry.ms },
    });
  }

  /**
   * Starts (or joins) the download for `size`. `showLoading`: the current view
   * needs it, so mark the rows pending until it lands.
   */
  private ensureDataset(size: DatasetSize, showLoading: boolean) {
    let entry = datasets.get(size);
    if (entry?.error) {
      this.set({ pending: true, datasetLoading: false, error: datasetError(entry.error) });
      return;
    }
    if (!entry) {
      const abort = new AbortController();
      const created: DatasetEntry = { abort, bytes: 0, ms: 0, promise: Promise.resolve() };
      created.promise = this.fetchers
        .fetchDataset(size, this.snapshot.network.latencyMs, abort.signal)
        .then(({ data, bytes, ms }) => {
          Object.assign(created, { rows: data, bytes, ms });
        })
        .catch((error: unknown) => {
          if (abort.signal.aborted) return;
          created.error = error instanceof Error ? error.message : String(error);
        });
      datasets.set(size, created);
      entry = created;
      this.set({ requests: this.snapshot.requests + 1 });
    }
    if (showLoading) this.set({ pending: true, datasetLoading: true, error: null });
    const thisEntry = entry;
    void entry.promise.then(() => this.onDataset(size, thisEntry));
  }

  private onDataset(size: DatasetSize, entry: DatasetEntry) {
    // Stale: the demo left browser mode or switched size meanwhile.
    if (this.stopped || this.snapshot.mode !== "browser" || this.snapshot.size !== size) return;
    if (datasets.get(size) !== entry) return;
    if (entry.error) {
      this.set({ datasetLoading: false, error: datasetError(entry.error) });
      return;
    }
    if (!entry.rows) return;
    // Several callers may wait on one download; the first one applies it.
    if (entry.counted && !this.snapshot.pending) return;
    const bytes = entry.counted ? 0 : entry.bytes;
    entry.counted = true;
    this.applyBrowser(entry, bytes);
  }

  private send() {
    this.debounceTimer = null;
    const { view, size, network, selection, onlySelected } = this.snapshot;
    const runId = ++this.runId;
    this.inFlight?.abort();
    const abort = new AbortController();
    this.inFlight = abort;
    const body: QueryBody = { size, view, selection: toRequest(selection), onlySelected, ...network };
    this.set({ pending: true, error: null, requests: this.snapshot.requests + 1 });

    this.fetchers.fetchQuery(body, abort.signal).then(
      ({ data, bytes, ms }) => {
        if (runId !== this.runId) return; // stale: a newer view was requested
        this.inFlight = null;
        this.matchedSelected = new Set(data.matchedSelectedIds);
        this.set({
          result: data,
          view: { ...this.snapshot.view, page: data.page },
          pending: false,
          error: null,
          stats: { where: "server", ms, matched: data.total, bytes },
        });
      },
      (error: unknown) => {
        if (abort.signal.aborted || runId !== this.runId) return;
        this.inFlight = null;
        this.set({ error: error instanceof Error ? error.message : String(error) });
      },
    );
  }

  private cancelRequest() {
    if (!this.inFlight) return;
    this.runId++;
    this.inFlight.abort();
    this.inFlight = null;
  }

  private clearDebounce() {
    if (this.debounceTimer === null) return;
    clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
  }
}

function datasetError(message: string) {
  return `Couldn't download the dataset. ${message}`;
}

/** For tests: forget downloaded datasets. */
export function resetDatasets() {
  for (const entry of datasets.values()) entry.abort.abort();
  datasets.clear();
}
