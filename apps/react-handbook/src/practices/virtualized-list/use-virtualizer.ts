// Binds a Virtualizer to a scroll box. After every commit the rendered rows
// are measured and the scroll position corrected, all inside a layout
// effect: the store notification that follows re-renders synchronously, so
// the first painted frame is already the corrected one.

import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { listStats, markUpdate } from "./list-stats";
import type { ListLayout, SharedAnchor } from "./list-navigation";
import { Virtualizer, type RevealAlign } from "./virtualizer";

type Options = {
  keys: Int32Array;
  positions: Int32Array;
  count: number;
  estimate: number;
  overscan: number;
  /** Row that must stay rendered: the list's tab stop. */
  pinnedKey: number | null;
  /** Rows to keep in place when the keys change, most important first. */
  keepKeys: (number | null)[];
  anchorRef: React.RefObject<SharedAnchor | null>;
};

function writeAnchor(v: Virtualizer, count: number, anchorRef: Options["anchorRef"]) {
  const anchor = v.currentAnchor;
  anchorRef.current = anchor ? { count, ...anchor } : null;
}

/** Measure → correct → notify. Repeats via React until nothing changes. */
function sync(v: Virtualizer, box: HTMLElement, spacer: HTMLElement) {
  for (const row of spacer.children) {
    const key = (row as HTMLElement).dataset.key;
    if (key !== undefined) v.measure(Number(key), row.getBoundingClientRect().height);
  }
  const desired = v.desiredScrollTop();
  if (Math.abs(desired - box.scrollTop) >= 0.5) {
    // Grow the spacer first, or the browser clamps the new position.
    spacer.style.height = `${v.total}px`;
    box.scrollTop = desired;
    v.commitScroll(box.scrollTop);
  }
  return v.update();
}

export function useVirtualizer({
  keys, positions, count, estimate, overscan, pinnedKey, keepKeys, anchorRef,
}: Options) {
  const boxRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const [v] = useState(() => new Virtualizer());
  const snapshot = useSyncExternalStore(v.subscribe, v.getSnapshot, v.getSnapshot);
  const applied = useRef(false);

  // Settings first: the sync effect below reads them in the same commit.
  useLayoutEffect(() => v.setEstimate(estimate), [v, estimate]);
  useLayoutEffect(() => v.setOverscan(overscan), [v, overscan]);
  useLayoutEffect(() => v.setPinned(pinnedKey), [v, pinnedKey]);

  const applyKeys = useEffectEvent(() => {
    const box = boxRef.current!;
    if (!applied.current) {
      applied.current = true;
      v.setKeys(keys, positions);
      v.setViewport(box.clientHeight);
      const start = anchorRef.current;
      if (start && start.count === count && v.indexOfKey(start.key) !== -1) {
        v.reveal(start.key, { offset: -start.delta });
      } else v.resetToTop();
      return;
    }
    // Remember where the rows to keep were, relative to the viewport top.
    const distances = keepKeys.map((key) => {
      const index = key === null ? -1 : v.indexOfKey(key);
      return index === -1 ? null : v.offsetOf(index) - box.scrollTop;
    });
    v.setKeys(keys, positions);
    for (let i = 0; i < keepKeys.length; i++) {
      const key = keepKeys[i];
      const distance = distances[i];
      const index = key === null ? -1 : v.indexOfKey(key);
      if (key === null || distance === null || index === -1) continue;
      // Keep it at the same distance, but inside the viewport.
      const room = Math.max(0, v.viewportHeight - v.sizeOf(index));
      v.reveal(key, { offset: Math.min(Math.max(distance, 0), room) });
      return;
    }
    v.resetToTop();
  });

  useLayoutEffect(() => applyKeys(), [keys, positions]);

  // After every commit: measure what was rendered and correct the scroll.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const spacer = spacerRef.current;
    if (!box || !spacer) return;
    if (sync(v, box, spacer)) return;
    // Converged: nothing else will render before paint.
    const s = v.getSnapshot();
    listStats.set({
      onPage: s.rows.length,
      inList: v.count,
      visibleStart: s.visibleStart === -1 ? null : s.visibleStart,
      visibleEnd: s.visibleEnd === -1 ? null : s.visibleEnd,
      measured: s.measured,
    });
    listStats.finishUpdate();
    writeAnchor(v, count, anchorRef);
  });

  useEffect(() => {
    const box = boxRef.current!;
    const spacer = spacerRef.current!;
    let width = box.clientWidth;

    function handleScroll() {
      v.handleScroll(box.scrollTop);
      if (v.update()) markUpdate("scroll");
      writeAnchor(v, count, anchorRef);
    }

    // Width changes re-wrap every row: forget sizes, keep the anchor.
    const resize = new ResizeObserver(() => {
      if (box.clientWidth !== width) {
        width = box.clientWidth;
        v.clearSizes();
      }
      v.setViewport(box.clientHeight);
      sync(v, box, spacer);
    });
    function handleFonts() {
      sync(v, box, spacer);
    }

    box.addEventListener("scroll", handleScroll, { passive: true });
    resize.observe(box);
    document.fonts?.addEventListener("loadingdone", handleFonts);
    return () => {
      box.removeEventListener("scroll", handleScroll);
      resize.disconnect();
      document.fonts?.removeEventListener("loadingdone", handleFonts);
    };
  }, [v, count, anchorRef]);

  const layout = useMemo<ListLayout>(
    () => ({
      keyAt: (index) => v.keyAt(index),
      indexOfKey: (key) => v.indexOfKey(key),
      count: () => v.count,
      offsetOf: (index) => v.offsetOf(index),
      indexAt: (offset) => v.indexAt(offset),
      viewport: () => v.viewportHeight,
      reveal(key: number, align: RevealAlign) {
        const box = boxRef.current;
        if (!box) return;
        v.reveal(key, align);
        v.setPinned(key);
        box.scrollTop = v.desiredScrollTop();
        v.commitScroll(box.scrollTop);
        v.update();
      },
    }),
    [v],
  );

  return { boxRef, spacerRef, snapshot, layout };
}
