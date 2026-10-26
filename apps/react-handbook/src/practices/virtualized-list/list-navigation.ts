// Keyboard, focus and selection shared by the virtual and naive lists
// (WAI-ARIA list box, single select, roving tabindex). Each list provides a
// `ListLayout`; the handlers only talk to that.

import { useCallback, useLayoutEffect, useRef } from "react";

import type { RevealAlign } from "./virtualizer";

export type ListLayout = {
  keyAt(index: number): number;
  indexOfKey(key: number): number;
  count(): number;
  /** Top of row `index` in px from the top of the list. */
  offsetOf(index: number): number;
  /** Row containing pixel `offset`. */
  indexAt(offset: number): number;
  viewport(): number;
  /** Scrolls so row `key` is placed per `align` (instantly). */
  reveal(key: number, align: RevealAlign): void;
};

/** What the browser can ask of the mounted list (e.g. "jump to row"). */
export type ListApi = {
  reveal(key: number, align: RevealAlign): void;
  focusKey(key: number): void;
};

/** First visible row, handed from one list to the next on a mode switch. */
export type SharedAnchor = { count: number; key: number; delta: number };

export type ListProps = {
  /** Ticket keys in display order and the display index of each key. */
  keys: Int32Array;
  positions: Int32Array;
  /** Tickets generated: the anchor of a different list size is ignored. */
  count: number;
  activeKey: number | null;
  selectedKey: number | null;
  onActiveChange: (key: number) => void;
  onSelect: (key: number) => void;
  debug: boolean;
  anchorRef: React.RefObject<SharedAnchor | null>;
  apiRef: React.RefObject<ListApi | null>;
};

export const LIST_BOX_CLASS =
  "relative h-112 overflow-y-auto overscroll-contain rounded-lg border bg-background outline-none [overflow-anchor:none] sm:h-128";

/** Display index of `key`, or -1 when it isn't in the list. */
export function indexIn(positions: Int32Array, key: number | null) {
  return key === null || key < 0 || key >= positions.length ? -1 : positions[key];
}

/** The tab stop: the active row, or the first row when it isn't in the list. */
export function tabStop(keys: Int32Array, positions: Int32Array, activeKey: number | null) {
  if (indexIn(positions, activeKey) !== -1) return activeKey;
  return keys.length > 0 ? keys[0] : null;
}

/** The ticket key of the row an event came from, or null. */
function rowKey(target: EventTarget) {
  const row = (target as HTMLElement).closest<HTMLElement>("[data-key]");
  return row ? Number(row.dataset.key) : null;
}

function nextIndex(key: string, current: number, layout: ListLayout): number | null {
  const last = layout.count() - 1;
  if (last < 0) return null;
  if (current === -1) return 0;
  switch (key) {
    case "ArrowDown":
      return Math.min(current + 1, last);
    case "ArrowUp":
      return Math.max(current - 1, 0);
    case "Home":
      return 0;
    case "End":
      return last;
    case "PageDown": {
      const below = layout.indexAt(layout.offsetOf(current) + layout.viewport());
      return Math.min(Math.max(below, current + 1), last);
    }
    case "PageUp": {
      const above = layout.indexAt(Math.max(layout.offsetOf(current) - layout.viewport(), 0));
      return Math.max(Math.min(above, current - 1), 0);
    }
    default:
      return null;
  }
}

/**
 * Moves focus to a row once it exists: immediately when it's already on
 * the page, otherwise right after the commit that renders it.
 */
export function useFocusRow(boxRef: React.RefObject<HTMLElement | null>) {
  const wanted = useRef<number | null>(null);

  const tryFocus = useCallback(() => {
    if (wanted.current === null) return;
    const row = boxRef.current?.querySelector<HTMLElement>(`[data-key="${wanted.current}"]`);
    if (!row) return;
    wanted.current = null;
    row.focus({ preventScroll: true });
  }, [boxRef]);

  useLayoutEffect(tryFocus);

  return useCallback(
    (key: number) => {
      wanted.current = key;
      tryFocus();
    },
    [tryFocus],
  );
}

export function useListNavigation(
  layout: ListLayout,
  { onActiveChange, onSelect, focusKey }: {
    onActiveChange: (key: number) => void;
    onSelect: (key: number) => void;
    focusKey: (key: number) => void;
  },
) {
  function handleKeyDown(event: React.KeyboardEvent) {
    const key = rowKey(event.target);
    if (key === null) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(key);
      return;
    }
    // Start from the focused row, not the rendered active key: with
    // auto-repeat, keys can arrive before React re-renders.
    const next = nextIndex(event.key, layout.indexOfKey(key), layout);
    if (next === null) return;
    event.preventDefault();
    const nextKey = layout.keyAt(next);
    layout.reveal(nextKey, "nearest");
    onActiveChange(nextKey);
    focusKey(nextKey);
  }

  function handleFocus(event: React.FocusEvent) {
    const key = rowKey(event.target);
    if (key === null) return;
    onActiveChange(key);
    // Keyboard focus (Tab) brings the row fully into view; a mouse press
    // must not scroll, or the click would land on a different row.
    if ((event.target as HTMLElement).matches(":focus-visible")) layout.reveal(key, "nearest");
  }

  function handleClick(event: React.MouseEvent) {
    const key = rowKey(event.target);
    if (key !== null) onSelect(key);
  }

  return { handleKeyDown, handleFocus, handleClick };
}
