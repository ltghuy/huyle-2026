// App-wide toast service. A module-level store (no provider) so any code —
// event handlers, promise callbacks, other practices — can raise toasts.
// Mutations only happen on the client; the server snapshot is always empty.

import { useSyncExternalStore } from "react";

export type ToastType = "success" | "error" | "info" | "warning" | "loading";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ToastAction = {
  label: string;
  onAction: () => void | Promise<void>;
};

export type ToastOptions = {
  description?: string;
  action?: ToastAction;
  /** Override the default duration (ms) for this toast. */
  duration?: number;
};

export type Toast = {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  action?: ToastAction;
  /** Merged duplicates. */
  count: number;
  /** Full display time in ms, or null when sticky. */
  duration: number | null;
  /** Time left in ms while visible, or null when sticky. */
  remaining: number | null;
  phase: "queued" | "visible" | "exiting";
  createdAt: number;
  /** Bumps on in-place update or merge. */
  version: number;
};

export type ToasterSettings = {
  position: ToastPosition;
  maxVisible: number;
  duration: number;
};

export type ToastState = {
  /** Visible and exiting toasts, oldest first. */
  toasts: readonly Toast[];
  queuedCount: number;
  paused: boolean;
  settings: ToasterSettings;
};

export type PauseReason = "hover" | "focus" | "hidden";

const EXIT_MS = 200;
const PROMISE_TIMEOUT_MS = 30_000;

const DEFAULT_SETTINGS: ToasterSettings = {
  position: "bottom-right",
  maxVisible: 3,
  duration: 5000,
};

let toasts: Toast[] = [];
let settings = DEFAULT_SETTINGS;
let nextId = 1;
const pauseReasons = new Set<PauseReason>();
const timers = new Map<string, { handle: number; startedAt: number }>();
const actionsRun = new Set<string>();
const listeners = new Set<() => void>();

const SERVER_SNAPSHOT: ToastState = {
  toasts: [],
  queuedCount: 0,
  paused: false,
  settings: DEFAULT_SETTINGS,
};
let snapshot: ToastState = SERVER_SNAPSHOT;

function emit() {
  snapshot = {
    toasts: toasts.filter((t) => t.phase !== "queued"),
    queuedCount: toasts.filter((t) => t.phase === "queued").length,
    paused: pauseReasons.size > 0,
    settings,
  };
  for (const listener of listeners) listener();
}

function patch(id: string, changes: Partial<Toast>) {
  toasts = toasts.map((t) => (t.id === id ? { ...t, ...changes } : t));
}

function find(id: string) {
  return toasts.find((t) => t.id === id);
}

function isSticky(type: ToastType, action?: ToastAction) {
  return type === "error" || type === "loading" || Boolean(action);
}

// Toasts with an action or a pending operation never merge: each one carries
// its own callback or settles independently.
function mergeKey(t: Pick<Toast, "type" | "title" | "description" | "action">) {
  if (t.action || t.type === "loading") return null;
  return `${t.type}\u0000${t.title}\u0000${t.description ?? ""}`;
}

// --- timers ---------------------------------------------------------------

function startTimer(id: string) {
  const t = find(id);
  if (!t || t.phase !== "visible" || t.remaining === null) return;
  if (pauseReasons.size > 0 || timers.has(id)) return;
  const handle = window.setTimeout(() => {
    timers.delete(id);
    dismiss(id);
  }, t.remaining);
  timers.set(id, { handle, startedAt: performance.now() });
}

/** Stops a running timer and stores the time left. */
function stopTimer(id: string) {
  const timer = timers.get(id);
  if (!timer) return;
  window.clearTimeout(timer.handle);
  timers.delete(id);
  const t = find(id);
  if (t?.remaining != null) {
    const elapsed = performance.now() - timer.startedAt;
    patch(id, { remaining: Math.max(0, t.remaining - elapsed) });
  }
}

// --- queue ----------------------------------------------------------------

/** Fills free slots FIFO from the queue; demotes the newest extras. */
function rebalance() {
  const byAge = () => [...toasts].sort((a, b) => a.createdAt - b.createdAt);

  let visible = byAge().filter((t) => t.phase === "visible");
  while (visible.length > settings.maxVisible) {
    const newest = visible[visible.length - 1];
    stopTimer(newest.id);
    patch(newest.id, { phase: "queued" });
    visible = visible.slice(0, -1);
  }

  const queued = byAge().filter((t) => t.phase === "queued");
  for (const t of queued) {
    if (visible.length >= settings.maxVisible) break;
    patch(t.id, { phase: "visible" });
    visible.push(t);
    startTimer(t.id);
  }
}

// --- public operations ------------------------------------------------------

function add(type: ToastType, title: string, options: ToastOptions = {}) {
  if (!title?.trim()) {
    console.error("[toast] A toast needs a non-empty title; nothing was shown.");
    return undefined;
  }

  const key = mergeKey({ type, title, ...options });
  const existing =
    key === null
      ? undefined
      : toasts.find((t) => t.phase !== "exiting" && mergeKey(t) === key);

  if (existing) {
    stopTimer(existing.id);
    patch(existing.id, {
      count: existing.count + 1,
      version: existing.version + 1,
      remaining: existing.duration,
    });
    startTimer(existing.id);
    emit();
    return existing.id;
  }

  const duration = isSticky(type, options.action)
    ? null
    : (options.duration ?? settings.duration);
  const id = `toast-${nextId++}`;
  toasts = [
    ...toasts,
    {
      id,
      type,
      title,
      description: options.description,
      action: options.action,
      count: 1,
      duration,
      remaining: duration,
      phase: "queued",
      createdAt: performance.now(),
      version: 0,
    },
  ];
  rebalance();
  emit();
  return id;
}

/** Updates a toast in place (used for async tracking). */
function update(id: string, type: ToastType, title: string, options: ToastOptions = {}) {
  const t = find(id);
  if (!t || t.phase === "exiting") return;
  stopTimer(id);
  const duration = isSticky(type, options.action)
    ? null
    : (options.duration ?? settings.duration);
  patch(id, {
    type,
    title,
    description: options.description,
    action: options.action,
    duration,
    remaining: duration,
    version: t.version + 1,
  });
  startTimer(id);
  emit();
}

function dismiss(id: string) {
  const t = find(id);
  if (!t || t.phase === "exiting") return;
  stopTimer(id);
  if (t.phase === "queued") {
    toasts = toasts.filter((x) => x.id !== id);
  } else {
    patch(id, { phase: "exiting" });
    window.setTimeout(() => {
      toasts = toasts.filter((x) => x.id !== id);
      actionsRun.delete(id);
      emit();
    }, EXIT_MS);
  }
  rebalance();
  emit();
}

function dismissAll() {
  for (const t of [...toasts]) {
    if (t.phase === "queued") toasts = toasts.filter((x) => x.id !== t.id);
  }
  for (const t of [...toasts]) dismiss(t.id);
  emit();
}

type Message = string | { title: string; description?: string };

function toMessage(m: Message) {
  return typeof m === "string" ? { title: m } : m;
}

class TimeoutError extends Error {}

function trackPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: Message;
    success: Message | ((value: T) => Message);
    error: Message | ((error: unknown) => Message);
  },
) {
  const loading = toMessage(messages.loading);
  const id = add("loading", loading.title, { description: loading.description });
  if (!id) return promise;

  let timeoutHandle = 0;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = window.setTimeout(
      () => reject(new TimeoutError()),
      PROMISE_TIMEOUT_MS,
    );
  });

  Promise.race([promise, timeout]).then(
    (value) => {
      const m = toMessage(
        typeof messages.success === "function"
          ? messages.success(value)
          : messages.success,
      );
      update(id, "success", m.title, { description: m.description });
    },
    (error: unknown) => {
      const m =
        error instanceof TimeoutError
          ? { title: "Timed out", description: "The operation took longer than 30 seconds." }
          : toMessage(
              typeof messages.error === "function"
                ? messages.error(error)
                : messages.error,
            );
      update(id, "error", m.title, { description: m.description });
    },
  ).finally(() => window.clearTimeout(timeoutHandle));

  return promise;
}

export const toast = {
  success: (title: string, options?: ToastOptions) => add("success", title, options),
  error: (title: string, options?: ToastOptions) => add("error", title, options),
  info: (title: string, options?: ToastOptions) => add("info", title, options),
  warning: (title: string, options?: ToastOptions) => add("warning", title, options),
  promise: trackPromise,
  dismiss,
  dismissAll,
};

// --- toaster controls (used by the Toaster UI and demo controls) -----------

export const toaster = {
  configure(changes: Partial<ToasterSettings>) {
    settings = { ...settings, ...changes };
    rebalance();
    emit();
  },

  pause(reason: PauseReason) {
    if (pauseReasons.has(reason)) return;
    if (pauseReasons.size === 0) {
      for (const id of [...timers.keys()]) stopTimer(id);
    }
    pauseReasons.add(reason);
    emit();
  },

  resume(reason: PauseReason) {
    if (!pauseReasons.delete(reason)) return;
    if (pauseReasons.size === 0) {
      for (const t of toasts) startTimer(t.id);
    }
    emit();
  },

  /** Runs a toast's action at most once, then dismisses it. */
  async runAction(id: string) {
    const t = find(id);
    if (!t?.action || actionsRun.has(id)) return;
    actionsRun.add(id);
    dismiss(id);
    try {
      await t.action.onAction();
    } catch (error) {
      add("error", "Action failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  },
};

// --- React binding -----------------------------------------------------------

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useToastState(): ToastState {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_SNAPSHOT,
  );
}
