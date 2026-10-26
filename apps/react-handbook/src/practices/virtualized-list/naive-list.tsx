"use client";

import { memo, useEffect, useEffectEvent, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react";

import {
  indexIn,
  LIST_BOX_CLASS,
  tabStop,
  useFocusRow,
  useListNavigation,
  type ListLayout,
  type ListProps,
} from "./list-navigation";
import { listStats } from "./list-stats";
import { TicketRow } from "./ticket-row";
import { ticketStore } from "./tickets";
import type { RevealAlign } from "./virtualizer";

/** The row containing pixel `offset`, by binary search over the DOM. */
function indexAtOffset(rows: HTMLCollection, offset: number) {
  let lo = 0;
  let hi = rows.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((rows[mid] as HTMLElement).offsetTop <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Renders every row, in normal flow: the cost virtualization avoids. */
export const NaiveList = memo(function NaiveList({
  keys, positions, count, activeKey, selectedKey, onActiveChange, onSelect, anchorRef, apiRef,
}: ListProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /** Distance from the viewport top of each row to keep, as of the last frame. */
  const place = useRef(new Map<number, number>());
  const applied = useRef(false);

  const tabKey = tabStop(keys, positions, activeKey);

  const layout = useMemo<ListLayout>(() => {
    const row = (index: number) => listRef.current!.children[index] as HTMLElement;
    return {
      keyAt: (index) => keys[index],
      indexOfKey: (key) => indexIn(positions, key),
      count: () => keys.length,
      offsetOf: (index) => row(index).offsetTop,
      indexAt: (offset) => indexAtOffset(listRef.current!.children, offset),
      viewport: () => boxRef.current!.clientHeight,
      reveal(key: number, align: RevealAlign) {
        const box = boxRef.current!;
        const index = indexIn(positions, key);
        if (index === -1) return;
        const el = row(index);
        const start = el.offsetTop;
        const end = start + el.offsetHeight;
        if (align === "start") box.scrollTop = start;
        else if (align === "nearest") {
          if (start < box.scrollTop || end - start > box.clientHeight) box.scrollTop = start;
          else if (end > box.scrollTop + box.clientHeight) box.scrollTop = end - box.clientHeight;
        } else box.scrollTop = start - align.offset;
      },
    };
  }, [keys, positions]);

  const focusKey = useFocusRow(boxRef);
  const { handleKeyDown, handleFocus, handleClick } = useListNavigation(layout, {
    onActiveChange,
    onSelect,
    focusKey,
  });
  useImperativeHandle(apiRef, () => ({ reveal: layout.reveal, focusKey }), [layout, focusKey]);

  /** Records the first visible row, the visible range and rows to keep. */
  const capture = useEffectEvent(() => {
    const box = boxRef.current;
    const rows = listRef.current?.children;
    if (!box || !rows || rows.length === 0) {
      listStats.set({ visibleStart: null, visibleEnd: null });
      return;
    }
    const start = indexAtOffset(rows, box.scrollTop);
    const end = indexAtOffset(rows, box.scrollTop + box.clientHeight - 1);
    const first = rows[start] as HTMLElement;
    anchorRef.current = { count, key: keys[start], delta: box.scrollTop - first.offsetTop };
    listStats.set({ visibleStart: start, visibleEnd: end });
    place.current.clear();
    for (const key of [selectedKey, activeKey]) {
      const index = indexIn(positions, key);
      if (key !== null && index !== -1) {
        place.current.set(key, (rows[index] as HTMLElement).offsetTop - box.scrollTop);
      }
    }
  });

  const applyKeys = useEffectEvent(() => {
    const box = boxRef.current!;
    const rows = listRef.current!.children;
    if (!applied.current) {
      applied.current = true;
      const start = anchorRef.current;
      const index = start?.count === count ? indexIn(positions, start.key) : -1;
      if (start && index !== -1) box.scrollTop = (rows[index] as HTMLElement).offsetTop + start.delta;
      return;
    }
    for (const key of [selectedKey, activeKey]) {
      const distance = key === null ? undefined : place.current.get(key);
      const index = indexIn(positions, key);
      if (key === null || distance === undefined || index === -1) continue;
      const el = rows[index] as HTMLElement;
      const room = Math.max(0, box.clientHeight - el.offsetHeight);
      box.scrollTop = el.offsetTop - Math.min(Math.max(distance, 0), room);
      return;
    }
    box.scrollTop = 0;
  });

  useLayoutEffect(() => applyKeys(), [keys, positions]);

  // After every commit: force layout (that's part of the cost), report it.
  useLayoutEffect(() => {
    boxRef.current?.getBoundingClientRect();
    listStats.set({ onPage: keys.length, inList: keys.length, measured: null });
    listStats.finishUpdate();
    capture();
  });

  useEffect(() => {
    const box = boxRef.current!;
    let frame = 0;
    function handleScroll() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        capture();
      });
    }
    box.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      box.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={boxRef}
      role="listbox"
      aria-label="Tickets"
      className={LIST_BOX_CLASS}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onClick={handleClick}
    >
      <div ref={listRef} role="presentation">
        {Array.from(keys, (key, index) => (
          <TicketRow
            key={key}
            ticket={ticketStore.get(key)}
            position={index + 1}
            setSize={keys.length}
            tabbable={key === tabKey}
            selected={key === selectedKey}
          />
        ))}
      </div>
    </div>
  );
});
