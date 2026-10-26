import type { StoreName } from "./db";

export const CHANNEL_NAME = "learn-english";

export interface ChangedMessage {
  type: "changed";
  stores: StoreName[];
}

const hasChannel = () => typeof BroadcastChannel !== "undefined";

let sender: BroadcastChannel | undefined;

/** Tells other tabs (and other listeners in this tab) that `stores` changed. */
export function notifyChanged(stores: StoreName[]): void {
  if (!hasChannel() || stores.length === 0) return;
  sender ??= new BroadcastChannel(CHANNEL_NAME);
  const message: ChangedMessage = { type: "changed", stores };
  sender.postMessage(message);
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

/** Closes the shared sender (tests). */
export function closeBroadcast(): void {
  sender?.close();
  sender = undefined;
}
