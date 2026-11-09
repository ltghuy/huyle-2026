"use client";

import { useEffect, useRef } from "react";

// Drag the expanded sidebar's right edge to widen it (quick 064). The width is
// written straight to `--sidebar-width` on the sidebar wrapper, so a drag
// re-renders nothing. It is a device preference in localStorage.
const MIN_WIDTH = 256; // the CLI default, 16rem
const MAX_WIDTH = 300;
const KEY_STEP = 8;
const WIDTH_KEY = "learn-english:sidebar-width";

function clamp(px: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(px)));
}

function readWidth(): number | null {
  try {
    const stored = Number(localStorage.getItem(WIDTH_KEY));
    return stored > 0 ? clamp(stored) : null;
  } catch {
    return null;
  }
}

function saveWidth(px: number | null) {
  try {
    if (px === null) localStorage.removeItem(WIDTH_KEY);
    else localStorage.setItem(WIDTH_KEY, String(px));
  } catch {
    // Storage blocked: the width just lasts for this visit.
  }
}

function wrapperOf(handle: HTMLElement) {
  return handle.closest<HTMLElement>('[data-slot="sidebar-wrapper"]');
}

// `null` resets to the CLI default.
function applyWidth(handle: HTMLElement, px: number | null) {
  const wrapper = wrapperOf(handle);
  if (!wrapper) return;
  if (px === null) wrapper.style.removeProperty("--sidebar-width");
  else wrapper.style.setProperty("--sidebar-width", `${px}px`);
  handle.setAttribute("aria-valuenow", String(px ?? MIN_WIDTH));
}

function currentWidth(handle: HTMLElement) {
  return Number(handle.getAttribute("aria-valuenow")) || MIN_WIDTH;
}

// The handle sits in the fixed sidebar container, which starts at the panel's left edge.
function widthAt(handle: HTMLElement, clientX: number) {
  const left = handle.offsetParent?.getBoundingClientRect().left ?? 0;
  return clamp(clientX - left);
}

const KEY_TARGETS: Record<string, (width: number) => number> = {
  ArrowLeft: (width) => width - KEY_STEP,
  ArrowRight: (width) => width + KEY_STEP,
  Home: () => MIN_WIDTH,
  End: () => MAX_WIDTH,
};

export function SidebarResizeHandle() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = readWidth();
    if (stored !== null && ref.current) applyWidth(ref.current, stored);
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    handle.dataset.dragging = "";
    // Turns off the width transitions and text selection while dragging (globals.css).
    wrapperOf(handle)?.setAttribute("data-sidebar-resizing", "");
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const handle = event.currentTarget;
    if (!handle.hasPointerCapture(event.pointerId)) return;
    applyWidth(handle, widthAt(handle, event.clientX));
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    const handle = event.currentTarget;
    if (!("dragging" in handle.dataset)) return;
    delete handle.dataset.dragging;
    wrapperOf(handle)?.removeAttribute("data-sidebar-resizing");
    saveWidth(currentWidth(handle));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const target = KEY_TARGETS[event.key];
    if (!target) return;
    event.preventDefault();
    const width = clamp(target(currentWidth(event.currentTarget)));
    applyWidth(event.currentTarget, width);
    saveWidth(width);
  }

  function handleDoubleClick(event: React.MouseEvent<HTMLDivElement>) {
    applyWidth(event.currentTarget, null);
    saveWidth(null);
  }

  return (
    <div
      ref={ref}
      role="separator"
      aria-orientation="vertical"
      aria-label="Kéo để đổi độ rộng thanh bên"
      title="Kéo để đổi độ rộng, nhấp đúp để về mặc định"
      aria-valuemin={MIN_WIDTH}
      aria-valuemax={MAX_WIDTH}
      aria-valuenow={MIN_WIDTH}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onKeyDown={handleKeyDown}
      onDoubleClick={handleDoubleClick}
      // Spans the container's p-2 gap right of the panel; the line shows on hover, focus and drag.
      className="absolute inset-y-6 right-0 z-20 w-2 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:rounded-full after:transition-colors hover:after:bg-sidebar-border focus-visible:after:bg-sidebar-ring data-dragging:after:bg-sidebar-ring group-data-[collapsible=icon]:hidden"
    />
  );
}
