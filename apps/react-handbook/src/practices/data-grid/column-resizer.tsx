"use client";

import { useRef } from "react";

import { MAX_COLUMN_WIDTH, MIN_COLUMN_WIDTH } from "@/server/practices/data-grid/grid.schema";

export function clampWidth(width: number) {
  return Math.min(MAX_COLUMN_WIDTH, Math.max(MIN_COLUMN_WIDTH, Math.round(width)));
}

/**
 * The drag handle on a header's right edge. Pointer capture keeps the move
 * events coming when the pointer leaves the handle (or the window), and
 * `lostpointercapture` fires on release *and* on cancel, so it is the one
 * place a drag ends. Keyboard resizing lives on the header (Alt+arrows), so
 * the handle isn't a tab stop of its own.
 */
export function ColumnResizer({
  width,
  onResize,
  onReset,
}: {
  width: number;
  onResize: (width: number) => void;
  onReset: () => void;
}) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault(); // no text selection while dragging
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, startWidth: width };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    onResize(clampWidth(drag.current.startWidth + e.clientX - drag.current.startX));
  }

  function handleLostCapture() {
    drag.current = null;
  }

  // Clicks on the handle must not sort the column.
  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  function handleDoubleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onReset();
  }

  return (
    <div
      aria-hidden
      data-resizer
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onLostPointerCapture={handleLostCapture}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className="group/resizer absolute inset-y-0 -right-2 z-10 flex w-4 cursor-col-resize touch-none justify-center"
    >
      <span className="h-full w-0.5 bg-border transition-colors group-hover/resizer:bg-primary group-active/resizer:bg-primary" />
    </div>
  );
}
