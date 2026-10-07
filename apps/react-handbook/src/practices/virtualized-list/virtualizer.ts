// The windowing algorithm, free of React and the DOM.
//
// Rows have estimated sizes until they are measured. Sizes are stored by
// row key (not position), so they survive filtering and sorting; a Fenwick
// tree over the sizes, in display order, answers "where does row i start?"
// and "which row is at pixel y?" in O(log n).
//
// The view is held in place by an anchor: the first visible row plus how
// far into it the viewport starts. Whenever sizes change, the scroll
// position is recomputed from the anchor, so content never moves under the
// reader. A reveal target (jump to a row, keep the active row visible) is
// re-applied after every correction until the user scrolls.

import { Fenwick } from "./fenwick";

/** "offset" places the row's top that many px below the viewport top. */
export type RevealAlign = "start" | "nearest" | { offset: number };

export type VirtualRow = {
  index: number;
  key: number;
  /** Top of the row, in px from the top of the list. */
  offset: number;
  size: number;
  measured: boolean;
  /** Rendered but outside the visible range. */
  overscan: boolean;
};

export type VirtualSnapshot = {
  rows: VirtualRow[];
  /** Height of the whole list in px. */
  total: number;
  /** First and last rows intersecting the viewport; -1 when empty. */
  visibleStart: number;
  visibleEnd: number;
  /** Keys with a measured size. */
  measured: number;
};

const EMPTY: VirtualSnapshot = { rows: [], total: 0, visibleStart: -1, visibleEnd: -1, measured: 0 };
/** Programmatic scroll events land within this many px of what we set. */
const SCROLL_TOLERANCE = 1;

export class Virtualizer {
  private keys: ArrayLike<number> = [];
  /** Display index of each key, -1 when not in the list. */
  private positions: ArrayLike<number> = [];
  private readonly sizes = new Map<number, number>();
  private tree = new Fenwick([]);
  private estimate = 96;
  private overscan = 5;
  private viewport = 0;
  private scrollTop = 0;
  private pinnedKey: number | null = null;
  private anchor: { key: number; delta: number } | null = null;
  /** The viewport was at the very end: stay there when sizes change. */
  private atEnd = false;
  private target: { key: number; align: RevealAlign } | null = null;
  private expectedScrollTop: number | null = null;
  /** Bumped whenever offsets may have changed. */
  private version = 0;
  private snapshotId = "";
  private snapshot = EMPTY;
  private readonly listeners = new Set<() => void>();

  // -- inputs ---------------------------------------------------------------

  setKeys(keys: ArrayLike<number>, positions: ArrayLike<number>) {
    this.keys = keys;
    this.positions = positions;
    this.rebuild();
  }

  setEstimate(estimate: number) {
    if (estimate === this.estimate) return;
    this.estimate = estimate;
    this.rebuild();
  }

  setOverscan(overscan: number) {
    this.overscan = overscan;
  }

  setViewport(height: number) {
    this.viewport = height;
  }

  /** The row that must stay rendered (the focusable active row). */
  setPinned(key: number | null) {
    this.pinnedKey = key;
  }

  /** Forget every measurement (row widths changed, so heights did too). */
  clearSizes() {
    this.sizes.clear();
    this.rebuild();
  }

  /**
   * Records the real size of a rendered row. Returns true when anything
   * changed (a new measurement or a different size).
   */
  measure(key: number, size: number) {
    const previous = this.sizes.get(key);
    if (previous !== undefined && Math.abs(previous - size) < 0.5) return false;
    this.sizes.set(key, size);
    const index = this.indexOfKey(key);
    if (index !== -1) this.tree.add(index, size - (previous ?? this.estimate));
    this.version++;
    return true;
  }

  /** Called for every scroll event of the box. */
  handleScroll(top: number) {
    const ours =
      this.expectedScrollTop !== null && Math.abs(top - this.expectedScrollTop) <= SCROLL_TOLERANCE;
    if (!ours) {
      // The user scrolled: their position wins over any reveal target.
      this.target = null;
      this.expectedScrollTop = null;
    }
    this.scrollTop = top;
    this.captureAnchor();
  }

  /** Records a scroll position we set ourselves. */
  commitScroll(top: number) {
    this.scrollTop = top;
    this.expectedScrollTop = top;
    this.captureAnchor();
  }

  reveal(key: number, align: RevealAlign) {
    this.target = { key, align };
  }

  /** Forget the reveal target and anchor to the top of the list. */
  resetToTop() {
    this.target = null;
    this.atEnd = false;
    this.anchor = this.keys.length > 0 ? { key: this.keys[0], delta: 0 } : null;
  }

  // -- geometry -------------------------------------------------------------

  get count() {
    return this.keys.length;
  }

  get total() {
    return this.tree.total;
  }

  get viewportHeight() {
    return this.viewport;
  }

  get currentAnchor() {
    return this.anchor;
  }

  keyAt(index: number) {
    return this.keys[index];
  }

  indexOfKey(key: number) {
    return key >= 0 && key < this.positions.length ? this.positions[key] : -1;
  }

  offsetOf(index: number) {
    return this.tree.prefix(index);
  }

  sizeOf(index: number) {
    return this.sizes.get(this.keys[index]) ?? this.estimate;
  }

  indexAt(offset: number) {
    return this.tree.indexAt(offset);
  }

  /** Where the box should be scrolled: anchor first, then the reveal target. */
  desiredScrollTop() {
    let top = this.scrollTop;
    const anchorIndex = this.anchor ? this.indexOfKey(this.anchor.key) : -1;
    if (this.atEnd) top = this.total - this.viewport;
    else if (anchorIndex !== -1) top = this.offsetOf(anchorIndex) + this.anchor!.delta;

    const targetIndex = this.target ? this.indexOfKey(this.target.key) : -1;
    if (targetIndex !== -1) {
      const align = this.target!.align;
      const start = this.offsetOf(targetIndex);
      const end = start + this.sizeOf(targetIndex);
      if (align === "start") top = start;
      else if (align === "nearest") {
        if (start < top || end - start > this.viewport) top = start;
        else if (end > top + this.viewport) top = end - this.viewport;
      } else top = start - align.offset;
    }
    return Math.max(0, Math.min(top, this.total - this.viewport));
  }

  // -- snapshot -------------------------------------------------------------

  /** Recomputes the window; notifies subscribers when it changed. */
  update() {
    const next = this.computeId();
    if (next === this.snapshotId) return false;
    this.snapshotId = next;
    this.snapshot = this.computeSnapshot();
    for (const listener of this.listeners) listener();
    return true;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  // -- internals ------------------------------------------------------------

  private rebuild() {
    const sizes = new Float64Array(this.keys.length);
    for (let i = 0; i < sizes.length; i++) sizes[i] = this.sizes.get(this.keys[i]) ?? this.estimate;
    this.tree = new Fenwick(sizes);
    this.version++;
  }

  private captureAnchor() {
    if (this.keys.length === 0) {
      this.anchor = null;
      this.atEnd = false;
      return;
    }
    const index = this.indexAt(this.scrollTop);
    this.anchor = { key: this.keys[index], delta: this.scrollTop - this.offsetOf(index) };
    this.atEnd = this.scrollTop > 0 && this.scrollTop + this.viewport >= this.total - SCROLL_TOLERANCE;
  }

  private visibleRange() {
    if (this.keys.length === 0) return [-1, -1] as const;
    const start = this.indexAt(this.scrollTop);
    const end = this.indexAt(this.scrollTop + Math.max(this.viewport - 1, 0));
    return [start, end] as const;
  }

  private computeId() {
    const [start, end] = this.visibleRange();
    const pinned = this.pinnedKey === null ? -1 : this.indexOfKey(this.pinnedKey);
    return `${start}:${end}:${this.overscan}:${pinned}:${this.version}:${this.keys.length}`;
  }

  private computeSnapshot(): VirtualSnapshot {
    const [visibleStart, visibleEnd] = this.visibleRange();
    if (visibleStart === -1) return { ...EMPTY, measured: this.sizes.size };
    const first = Math.max(0, visibleStart - this.overscan);
    const last = Math.min(this.keys.length - 1, visibleEnd + this.overscan);
    const rows: VirtualRow[] = [];
    const pinned = this.pinnedKey === null ? -1 : this.indexOfKey(this.pinnedKey);
    if (pinned !== -1 && pinned < first) rows.push(this.row(pinned, visibleStart, visibleEnd));
    for (let i = first; i <= last; i++) rows.push(this.row(i, visibleStart, visibleEnd));
    if (pinned > last) rows.push(this.row(pinned, visibleStart, visibleEnd));
    return { rows, total: this.total, visibleStart, visibleEnd, measured: this.sizes.size };
  }

  private row(index: number, visibleStart: number, visibleEnd: number): VirtualRow {
    const key = this.keys[index];
    return {
      index,
      key,
      offset: this.offsetOf(index),
      size: this.sizeOf(index),
      measured: this.sizes.has(key),
      overscan: index < visibleStart || index > visibleEnd,
    };
  }
}
