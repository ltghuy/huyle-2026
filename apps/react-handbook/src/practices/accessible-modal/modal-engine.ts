// The modal engine, free of React. It owns the stack of open dialogs and
// everything that must be true while one is open:
//
// - everything behind the top dialog is `inert` (not focusable, clickable
//   or visible to assistive tech), except regions marked `data-modal-keep`
//   (the toaster), so toasts stay readable and usable;
// - the page can't scroll, and doesn't shift when its scrollbar goes away;
// - Tab wraps inside the top dialog, and focus that escapes is brought back;
// - Escape and backdrop presses ask the top dialog's owner to close it;
// - when a dialog closes, focus returns to its opener, or a fallback.

export type CloseReason = "escape" | "backdrop" | "close-button" | "action" | "navigation";

export type ModalEvent = {
  type: "open" | "close" | "blocked";
  title: string;
  detail: string;
};

export type LayerOptions = {
  title: string;
  /** Element holding the backdrop and the dialog. */
  root: HTMLElement;
  dialog: HTMLElement;
  /** Where focus starts; defaults to [data-autofocus], first tabbable, dialog. */
  initialFocus?: () => HTMLElement | null;
  /** Used when the opener is gone or can't take focus. */
  returnFocus?: () => HTMLElement | null;
  backdropDismiss: () => boolean;
  onRequestClose: (reason: CloseReason) => void;
};

export type Layer = LayerOptions & {
  id: number;
  opener: HTMLElement | null;
  lastFocused: HTMLElement | null;
  /** Why the owner was last asked to close; "action" when it closed by itself. */
  pendingReason: CloseReason | null;
  /** Keys pressed while this layer is on top (auto-repeat of others is ignored). */
  freshKeys: Set<string>;
};

const TABBABLE = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "summary",
  "[contenteditable=true]",
  "[tabindex]",
].join(",");

const stack: Layer[] = [];
let nextId = 1;
/** Elements we made inert, so we only ever undo our own changes. */
let inerted: HTMLElement[] = [];
let savedScroll: { overflow: string; gutter: string } | null = null;
/** Popped layers waiting for focus to be returned at the next frame. */
let pendingReturns: { layer: Layer; index: number }[] = [];
let returnFrame = 0;
const listeners = new Set<(event: ModalEvent) => void>();

// -- helpers ----------------------------------------------------------------

function isVisible(el: HTMLElement) {
  return typeof el.checkVisibility === "function" ? el.checkVisibility() : el.getClientRects().length > 0;
}

function canFocus(el: HTMLElement | null | undefined): el is HTMLElement {
  return Boolean(
    el &&
      el.isConnected &&
      !el.closest("[inert]") &&
      !(el as HTMLButtonElement).disabled &&
      isVisible(el),
  );
}

/** Focusable elements in Tab order (positive tabindex isn't used here). */
export function tabbables(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>(TABBABLE)].filter(
    (el) => el.tabIndex >= 0 && canFocus(el),
  );
}

/** A short human label for the event log. */
export function describe(el: Element | null) {
  if (!el || el === document.body) return "page body";
  const label = el.getAttribute("aria-label") ?? el.textContent?.trim().replace(/\s+/g, " ");
  return label ? label.slice(0, 40) : el.tagName.toLowerCase();
}

function isKept(node: Node | null) {
  return node instanceof Element && node.closest("[data-modal-keep]") !== null;
}

export function onModalEvent(listener: (event: ModalEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitModalEvent(event: ModalEvent) {
  for (const listener of listeners) listener(event);
}

// -- background -------------------------------------------------------------

function applyInert() {
  for (const el of inerted) el.inert = false;
  inerted = [];
  const top = stack.at(-1);
  if (!top) return;
  const keep = [top.root, ...document.querySelectorAll<HTMLElement>("[data-modal-keep]")];
  const walk = (parent: Element) => {
    for (const child of parent.children) {
      if (!(child instanceof HTMLElement) || keep.includes(child)) continue;
      if (keep.some((k) => child.contains(k))) walk(child);
      else if (!child.inert && child.tagName !== "SCRIPT" && child.tagName !== "STYLE") {
        child.inert = true;
        inerted.push(child);
      }
    }
  };
  walk(document.body);
}

function lockScroll() {
  const html = document.documentElement;
  savedScroll = { overflow: html.style.overflow, gutter: html.style.scrollbarGutter };
  // A classic scrollbar takes space: keep its gutter so nothing shifts.
  if (window.innerWidth > html.clientWidth) html.style.scrollbarGutter = "stable";
  html.style.overflow = "hidden";
}

function unlockScroll() {
  if (!savedScroll) return;
  const html = document.documentElement;
  html.style.overflow = savedScroll.overflow;
  html.style.scrollbarGutter = savedScroll.gutter;
  savedScroll = null;
}

/** Lets the phone sheet stay above the on-screen keyboard. */
function updateViewport() {
  const vv = window.visualViewport;
  const root = document.getElementById("modal-root");
  if (!vv || !root) return;
  root.style.setProperty("--modal-vh", `${vv.height}px`);
  root.style.setProperty("--modal-kb", `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`);
}

// -- document listeners -------------------------------------------------------

export function requestClose(layer: Layer, reason: CloseReason) {
  if (reason === "backdrop" && !layer.backdropDismiss()) {
    emitModalEvent({ type: "blocked", title: layer.title, detail: "backdrop click ignored" });
    return;
  }
  layer.pendingReason = reason;
  layer.onRequestClose(reason);
}

function handleKeyDown(event: KeyboardEvent) {
  const top = stack.at(-1);
  if (!top) return;
  const target = event.target as Node;
  const inTop = top.root.contains(target);
  if (!event.repeat) top.freshKeys.add(event.key);
  else if (!top.freshKeys.has(event.key) && inTop) {
    // Auto-repeat of a key held while the dialog opened (e.g. Enter on the
    // opener) must not press the dialog's buttons.
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (event.key === "Escape") {
    if (event.isComposing || (!inTop && target !== document.body)) return;
    event.preventDefault();
    requestClose(top, "escape");
    return;
  }

  if (event.key !== "Tab" || !inTop) return;
  const items = tabbables(top.dialog);
  if (items.length === 0) {
    event.preventDefault();
    top.dialog.focus();
    return;
  }
  const active = document.activeElement;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && (active === first || active === top.dialog || !top.dialog.contains(active))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (active === last || !top.dialog.contains(active))) {
    event.preventDefault();
    first.focus();
  }
}

function initialTarget(layer: Layer) {
  const designated = layer.initialFocus?.() ?? layer.dialog.querySelector<HTMLElement>("[data-autofocus]");
  if (canFocus(designated)) return designated;
  // The × button comes first in the DOM but is the least useful start.
  const items = tabbables(layer.dialog);
  return items.find((el) => !el.hasAttribute("data-modal-close")) ?? items[0] ?? layer.dialog;
}

function handleFocusIn(event: FocusEvent) {
  const top = stack.at(-1);
  if (!top) return;
  const target = event.target as Node;
  if (top.dialog.contains(target)) {
    top.lastFocused = target as HTMLElement;
    return;
  }
  // Toasts (F8) may take focus; anything else is sent back into the dialog.
  if (isKept(target)) return;
  const back = canFocus(top.lastFocused) ? top.lastFocused : initialTarget(top);
  back.focus({ preventScroll: true });
}

function install() {
  document.addEventListener("keydown", handleKeyDown, true);
  document.addEventListener("focusin", handleFocusIn);
  window.visualViewport?.addEventListener("resize", updateViewport);
  window.visualViewport?.addEventListener("scroll", updateViewport);
  updateViewport();
}

function uninstall() {
  document.removeEventListener("keydown", handleKeyDown, true);
  document.removeEventListener("focusin", handleFocusIn);
  window.visualViewport?.removeEventListener("resize", updateViewport);
  window.visualViewport?.removeEventListener("scroll", updateViewport);
}

// -- focus return -------------------------------------------------------------

function fallbackHeading() {
  const heading = document.querySelector<HTMLElement>("main h1");
  if (heading && heading.tabIndex < 0 && !heading.hasAttribute("tabindex")) heading.tabIndex = -1;
  return heading;
}

function returnTarget(layer: Layer) {
  if (canFocus(layer.opener)) return { el: layer.opener, scroll: false };
  const fallback = layer.returnFocus?.();
  if (canFocus(fallback)) return { el: fallback, scroll: true };
  const heading = fallbackHeading();
  return canFocus(heading) ? { el: heading, scroll: true } : null;
}

const REASONS: Record<CloseReason, string> = {
  escape: "Escape",
  backdrop: "backdrop",
  "close-button": "Close button",
  action: "dialog button",
  navigation: "navigation",
};

/**
 * Runs one frame after closing starts, so the owner can remove the opener
 * first (a deleted row). Several layers closing together (Discard closes the
 * guard and the form) return focus once, to the lowest one's opener.
 */
function settleFocus() {
  returnFrame = 0;
  const popped = pendingReturns.sort((a, b) => a.index - b.index);
  pendingReturns = [];
  const lowest = popped[0];
  if (!lowest) return;
  let target = returnTarget(lowest.layer);
  const top = stack.at(-1);
  if (top && (!target || !top.dialog.contains(target.el))) {
    target = { el: canFocus(top.lastFocused) ? top.lastFocused : initialTarget(top), scroll: false };
  }
  target?.el.focus({ preventScroll: !target.scroll });
  for (const { layer } of popped.reverse()) {
    emitModalEvent({
      type: "close",
      title: layer.title,
      detail: `${REASONS[layer.pendingReason ?? "action"]} · focus → ${describe(document.activeElement)}`,
    });
  }
}

// -- public API ---------------------------------------------------------------

export function pushLayer(options: LayerOptions): Layer {
  const active = document.activeElement;
  const layer: Layer = {
    ...options,
    id: nextId++,
    opener: active instanceof HTMLElement && active !== document.body ? active : null,
    lastFocused: null,
    pendingReason: null,
    freshKeys: new Set(),
  };
  stack.push(layer);
  if (stack.length === 1) {
    lockScroll();
    install();
  }
  applyInert();
  const target = initialTarget(layer);
  target.focus({ preventScroll: true });
  layer.lastFocused = target;
  emitModalEvent({ type: "open", title: layer.title, detail: `focus → ${describe(target)}` });
  return layer;
}

/**
 * Removes a layer. With `returnFocus`, focus goes back one frame later;
 * without (unmounted by navigation), focus is left to the new page.
 */
export function popLayer(layer: Layer, { returnFocus }: { returnFocus: boolean }) {
  const index = stack.indexOf(layer);
  if (index === -1) return;
  stack.splice(index, 1);
  applyInert();
  if (stack.length === 0) {
    unlockScroll();
    uninstall();
  }
  if (!returnFocus) {
    emitModalEvent({ type: "close", title: layer.title, detail: REASONS.navigation });
    return;
  }
  pendingReturns.push({ layer, index });
  returnFrame ||= requestAnimationFrame(settleFocus);
}

export function getModalRoot() {
  let root = document.getElementById("modal-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "modal-root";
    document.body.appendChild(root);
  }
  return root;
}
