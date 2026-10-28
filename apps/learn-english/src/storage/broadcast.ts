import type { StoreName } from "./db";

export const CHANNEL_NAME = "learn-english";

export interface ChangedMessage {
  type: "changed";
  stores: StoreName[];
  /** The tab that made the change (see `TAB_ID`). */
  tab?: string;
}

/** Identifies this tab in change messages, so it can tell its own from other tabs'. */
export const TAB_ID = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random());

// When each store was last written in this tab, and who to tell at once.
const lastChange = new Map<StoreName, number>();
const localListeners = new Set<(stores: readonly StoreName[]) => void>();

const hasChannel = () => typeof BroadcastChannel !== "undefined";

let sender: BroadcastChannel | undefined;

/**
 * Tells other tabs (and other listeners in this tab) that `stores` changed.
 * Listeners in this tab registered with `subscribeLocalChanges` hear it
 * before this returns, so the next screen never reads a cached copy from
 * before the write.
 */
export function notifyChanged(stores: StoreName[]): void {
  if (stores.length === 0) return;
  const now = Date.now();
  for (const store of stores) lastChange.set(store, now);
  for (const listener of localListeners) listener(stores);
  if (!hasChannel()) return;
  sender ??= new BroadcastChannel(CHANNEL_NAME);
  const message: ChangedMessage = { type: "changed", stores, tab: TAB_ID };
  sender.postMessage(message);
}

/** When any of `stores` was last written in this tab (epoch ms; 0 = not since the tab opened). */
export function lastChangedAt(stores: readonly StoreName[]): number {
  return Math.max(0, ...stores.map((store) => lastChange.get(store) ?? 0));
}

/** Calls `listener` synchronously for each write in this tab. Returns the unsubscribe function. */
export function subscribeLocalChanges(listener: (stores: readonly StoreName[]) => void): () => void {
  localListeners.add(listener);
  return () => localListeners.delete(listener);
}

/**
 * Calls `listener` for each change message. Each subscriber gets its own
 * channel, so messages from this tab's sender reach it too. Returns the
 * unsubscribe function.
 */
export function subscribeChanges(listener: (message: ChangedMessage) => void): () => void {
  if (!hasChannel()) return () => {};
  const channel = new BroadcastChannel(CHANNEL_NAME);
  channel.onmessage = (event: MessageEvent<unknown>) => {
    const data = event.data as Partial<ChangedMessage> | null;
    if (data?.type === "changed" && Array.isArray(data.stores)) listener(data as ChangedMessage);
  };
  return () => channel.close();
}

/** Closes the shared sender and forgets this tab's write times (tests). */
export function closeBroadcast(): void {
  sender?.close();
  sender = undefined;
  lastChange.clear();
}
