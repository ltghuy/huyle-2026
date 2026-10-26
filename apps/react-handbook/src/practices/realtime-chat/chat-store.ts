import { useSyncExternalStore } from "react";

import { toast } from "@/practices/toast-notifications/toast-store";
import type {
  ChatMessage,
  HistoryPage,
  StreamEvent,
} from "@/server/practices/realtime-chat/chat.schema";

import { clearConversation, fetchHistory, postSeen, postTyping, sendMessage } from "./chat-api";
import { createConnection, type ConnectionInfo } from "./connection";
import { getDisplayName, getOwnAuthorIds, getTabId, setDisplayName } from "./identity";

// The chat engine: one module-level store shared by every chat component.
// Messages survive navigation; the connection is open only while the chat is
// mounted, and catches up from the last seq when it comes back.

export type DeliveryState = "sending" | "failed" | "sent";

export type LocalMessage = {
  /** Stable React key and merge key: the sender's idempotency id. */
  clientId: string;
  /** Null until the server confirms the message. */
  seq: number | null;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: string;
  own: boolean;
  state: DeliveryState;
  error: string | null;
};

export type TypingEntry = { authorId: string; authorName: string; expiresAt: number };

export type OlderState = {
  status: "idle" | "loading" | "error" | "done";
  error: string | null;
  /** The start was reached but older messages had been dropped by the server. */
  trimmed: boolean;
};

export type ChatStats = {
  received: number;
  replayed: number;
  duplicates: number;
  resets: number;
};

export type ChatSnapshot = {
  tabId: string;
  name: string;
  initial: "loading" | "ready" | "error";
  initialError: string | null;
  /** Confirmed messages by seq, then pending ones in the order they were typed. */
  messages: LocalMessage[];
  connection: ConnectionInfo;
  older: OlderState;
  /** A reconnect came back after the replay window: messages above may be missing. */
  gapAbove: boolean;
  typing: TypingEntry[];
  /** Highest seq any other participant has seen. */
  seenUpTo: number;
  /** Who last cleared the conversation while this page was open. */
  clearedBy: string | null;
  stats: ChatStats;
};

const SEND_TIMEOUT_MS = 15_000;
const TYPING_TTL_MS = 5000;
const TYPING_SEND_EVERY_MS = 3000;
const SEEN_THROTTLE_MS = 1000;
const PENDING_KEY = "chat:pending";

type PendingRecord = Pick<
  LocalMessage,
  "clientId" | "authorId" | "authorName" | "text" | "createdAt"
> & { state: "sending" | "failed" };

const SERVER_SNAPSHOT: ChatSnapshot = {
  tabId: "",
  name: "",
  initial: "loading",
  initialError: null,
  messages: [],
  connection: { status: "connecting", attempt: 0, retryAt: null },
  older: { status: "idle", error: null, trimmed: false },
  gapAbove: false,
  typing: [],
  seenUpTo: 0,
  clearedBy: null,
  stats: { received: 0, replayed: 0, duplicates: 0, resets: 0 },
};

// --- state -------------------------------------------------------------------

let snapshot = SERVER_SNAPSHOT;
let started = false;
let mounts = 0;
/** Ascending by seq. */
let confirmed: LocalMessage[] = [];
let pending: LocalMessage[] = [];
const seqs = new Set<number>();
/** Messages this browser sent from another tab session (restored pending). */
const ownClientIds = new Set<string>();
/** Discarded while in flight: a late confirmation still shows the message. */
const discarded = new Set<string>();
const inFlight = new Map<string, AbortController>();
let typing = new Map<string, TypingEntry>();
let typingTimer: ReturnType<typeof setInterval> | undefined;
let replayUpTo = 0;
let connection: ReturnType<typeof createConnection> | null = null;
let historyAbort: AbortController | null = null;
/** Highest seq we know of (messages or a clear): the resume point for the stream. */
let highWater = 0;
/** Everything up to this seq was cleared and must never come back. */
let clearedUpTo = 0;

const listeners = new Set<() => void>();

function emit(changes: Partial<ChatSnapshot> = {}) {
  snapshot = { ...snapshot, ...changes, messages: [...confirmed, ...pending] };
  for (const listener of listeners) listener();
}

function bumpStats(changes: Partial<ChatStats>) {
  const stats = { ...snapshot.stats };
  for (const [key, value] of Object.entries(changes) as [keyof ChatStats, number][]) {
    stats[key] += value;
  }
  snapshot = { ...snapshot, stats };
}

// --- pending persistence -----------------------------------------------------

function persistPending() {
  const records: PendingRecord[] = pending.map((m) => ({
    clientId: m.clientId,
    authorId: m.authorId,
    authorName: m.authorName,
    text: m.text,
    createdAt: m.createdAt,
    state: m.state === "failed" ? "failed" : "sending",
  }));
  try {
    if (records.length) localStorage.setItem(PENDING_KEY, JSON.stringify(records));
    else localStorage.removeItem(PENDING_KEY);
  } catch {
    // Storage unavailable: pending messages just won't survive a reload.
  }
}

function readPending(): PendingRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// --- merging -----------------------------------------------------------------

function isOwn(message: Pick<ChatMessage, "authorId" | "clientId">) {
  return getOwnAuthorIds().has(message.authorId) || ownClientIds.has(message.clientId);
}

function toLocal(message: ChatMessage, own: boolean): LocalMessage {
  return {
    clientId: message.clientId,
    seq: message.seq,
    authorId: message.authorId,
    authorName: message.authorName,
    text: message.text,
    createdAt: message.createdAt,
    own,
    state: "sent",
    error: null,
  };
}

function insertConfirmed(message: LocalMessage) {
  const seq = message.seq!;
  seqs.add(seq);
  highWater = Math.max(highWater, seq);
  const last = confirmed.at(-1);
  if (!last || last.seq! < seq) {
    confirmed = [...confirmed, message];
    return;
  }
  // Out of order (or an older page): binary search for the slot.
  let lo = 0;
  let hi = confirmed.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (confirmed[mid].seq! < seq) lo = mid + 1;
    else hi = mid;
  }
  confirmed = [...confirmed.slice(0, lo), message, ...confirmed.slice(lo)];
}

/**
 * Adds a confirmed message from any source (history, stream, send response).
 * Returns false when it was already known.
 */
function receive(message: ChatMessage): boolean {
  if (message.seq <= clearedUpTo) {
    // Stored before a clear (e.g. a late send response): it's gone for everyone.
    if (pending.some((m) => m.clientId === message.clientId)) {
      pending = pending.filter((m) => m.clientId !== message.clientId);
      persistPending();
    }
    return false;
  }
  if (seqs.has(message.seq)) return false;
  const index = pending.findIndex((m) => m.clientId === message.clientId);
  if (index !== -1) {
    // Our optimistic message, confirmed: replace it in place (same key).
    pending = pending.filter((_, i) => i !== index);
    inFlight.get(message.clientId)?.abort();
    inFlight.delete(message.clientId);
    persistPending();
    insertConfirmed(toLocal(message, true));
    return true;
  }
  const own = discarded.delete(message.clientId) || isOwn(message);
  insertConfirmed(toLocal(message, own));
  if (!own && typing.delete(message.authorId)) syncTyping();
  return true;
}

function applyPage(page: HistoryPage) {
  let duplicates = 0;
  for (const message of page.messages) if (!receive(message)) duplicates++;
  if (duplicates) bumpStats({ duplicates });
}

// --- stream events -------------------------------------------------------------

function handleEvent(event: StreamEvent) {
  switch (event.type) {
    case "hello":
      replayUpTo = event.data.newestSeq;
      break;
    case "message": {
      const replayed = event.data.seq <= replayUpTo;
      if (receive(event.data)) bumpStats({ received: 1, replayed: replayed ? 1 : 0 });
      else bumpStats({ duplicates: 1 });
      break;
    }
    case "reset":
      // We were away longer than the server's replay window.
      confirmed = [];
      seqs.clear();
      applyPage(event.data.page);
      bumpStats({ resets: 1 });
      emit({
        gapAbove: true,
        older: {
          status: event.data.page.hasMore ? "idle" : "done",
          error: null,
          trimmed: event.data.page.trimmed,
        },
      });
      return;
    case "cleared":
      handleCleared(event.data.byId, event.data.byName, event.data.upToSeq);
      return;
    case "typing":
      handleTyping(event.data.authorId, event.data.authorName, event.data.typing);
      return;
    case "seen":
      if (!getOwnAuthorIds().has(event.data.authorId) && event.data.upToSeq > snapshot.seenUpTo) {
        emit({ seenUpTo: event.data.upToSeq });
      }
      return;
  }
  emit();
}

function handleCleared(byId: string, byName: string, upToSeq: number) {
  // An older page in flight would bring deleted messages back.
  historyAbort?.abort();
  confirmed = [];
  seqs.clear();
  clearedUpTo = Math.max(clearedUpTo, upToSeq);
  highWater = Math.max(highWater, upToSeq);
  emit({
    clearedBy: byName,
    gapAbove: false,
    older: { status: "done", error: null, trimmed: false },
  });
  if (getOwnAuthorIds().has(byId)) toast.success("Conversation cleared", { description: "Everyone in the room was notified." });
  else toast.info(`${byName} cleared the conversation`, { description: "Earlier messages were deleted for everyone." });
}

function handleTyping(authorId: string, authorName: string, isTyping: boolean) {
  if (getOwnAuthorIds().has(authorId)) return;
  if (isTyping) typing.set(authorId, { authorId, authorName, expiresAt: Date.now() + TYPING_TTL_MS });
  else typing.delete(authorId);
  syncTyping();
  emit();
}

/** Publishes the typing map and keeps an expiry sweep running while it's non-empty. */
function syncTyping() {
  snapshot = { ...snapshot, typing: [...typing.values()] };
  if (typing.size > 0 && !typingTimer) {
    typingTimer = setInterval(() => {
      const now = Date.now();
      const next = new Map([...typing].filter(([, entry]) => entry.expiresAt > now));
      if (next.size === typing.size) return;
      typing = next;
      syncTyping();
      emit();
    }, 500);
  } else if (typing.size === 0 && typingTimer) {
    clearInterval(typingTimer);
    typingTimer = undefined;
  }
}

// --- sending -----------------------------------------------------------------

function updatePending(clientId: string, changes: Partial<LocalMessage>) {
  pending = pending.map((m) => (m.clientId === clientId ? { ...m, ...changes } : m));
  persistPending();
  emit();
}

/**
 * Outbox: one send at a time, in the order they were typed. The server numbers
 * messages as they arrive, so parallel sends with different latencies could
 * overtake each other; sending serially makes typed order the server order.
 */
const outbox: LocalMessage[] = [];
let sending = false;

function deliver(message: LocalMessage) {
  outbox.push(message);
  pump();
}

function pump() {
  if (sending) return;
  const next = outbox.shift();
  if (!next) return;
  // Confirmed or discarded while it waited.
  if (!pending.some((m) => m.clientId === next.clientId)) return pump();
  sending = true;
  void sendOne(next).finally(() => {
    sending = false;
    pump();
  });
}

async function sendOne(message: LocalMessage) {
  if (connection?.isOffline()) {
    updatePending(message.clientId, { state: "failed", error: "You're offline" });
    return;
  }
  const controller = new AbortController();
  inFlight.set(message.clientId, controller);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SEND_TIMEOUT_MS);

  try {
    const confirmedMessage = await sendMessage(
      {
        clientId: message.clientId,
        authorId: message.authorId,
        authorName: message.authorName,
        text: message.text,
      },
      controller.signal,
    );
    if (receive(confirmedMessage)) emit();
  } catch (error) {
    // Confirmed by the stream echo meanwhile (receive() aborted us): nothing to do.
    if (inFlight.get(message.clientId) !== controller) return;
    if (!pending.some((m) => m.clientId === message.clientId)) return;
    const reason = timedOut ? "Timed out" : error instanceof Error ? error.message : "Send failed";
    updatePending(message.clientId, { state: "failed", error: reason });
  } finally {
    clearTimeout(timer);
    if (inFlight.get(message.clientId) === controller) inFlight.delete(message.clientId);
  }
}

// --- typing and seen (outgoing) ----------------------------------------------

let lastTypingSent = 0;
let lastSeenSent = 0;
let lastSeenAt = 0;
let seenTimer: ReturnType<typeof setTimeout> | undefined;
let seenWanted = 0;

function stopTyping() {
  if (lastTypingSent === 0) return;
  lastTypingSent = 0;
  postTyping(snapshot.tabId, snapshot.name, false);
}

function flushSeen() {
  seenTimer = undefined;
  if (seenWanted <= lastSeenSent) return;
  lastSeenSent = seenWanted;
  lastSeenAt = Date.now();
  postSeen(snapshot.tabId, seenWanted);
}

// --- lifecycle ---------------------------------------------------------------

async function loadInitial() {
  emit({ initial: "loading", initialError: null });
  try {
    const page = await fetchHistory(null);
    applyPage(page);
    emit({
      initial: "ready",
      older: { status: page.hasMore ? "idle" : "done", error: null, trimmed: page.trimmed },
    });
    if (mounts > 0) connection?.start();
  } catch (error) {
    emit({ initial: "error", initialError: error instanceof Error ? error.message : "Load failed" });
  }
}

function init() {
  if (started) return;
  started = true;
  snapshot = { ...snapshot, tabId: getTabId(), name: getDisplayName() };

  // Restore messages that were still sending or failed before a reload.
  for (const record of readPending()) {
    ownClientIds.add(record.clientId);
    pending.push({ ...record, seq: null, own: true, error: record.state === "failed" ? "Not sent before you left" : null });
  }

  connection = createConnection({
    tabId: snapshot.tabId,
    getAfter: () => highWater,
    onEvent: handleEvent,
    onInfo: (info) => emit({ connection: info }),
  });
}

function mount() {
  init();
  mounts++;
  if (mounts > 1) return;
  if (snapshot.initial === "ready") connection!.start();
  else void loadInitial();
  // Re-send what was still sending when the page was left.
  for (const message of pending) {
    if (message.state === "sending" && !inFlight.has(message.clientId) && !outbox.some((m) => m.clientId === message.clientId)) deliver(message);
  }
}

function unmount() {
  mounts--;
  // Wait a tick: a quick remount (StrictMode) shouldn't drop the connection.
  setTimeout(() => {
    if (mounts > 0) return;
    connection?.stop();
    historyAbort?.abort();
    stopTyping();
    typing.clear();
    syncTyping();
    emit();
  }, 0);
}

// --- public API --------------------------------------------------------------

export const chat = {
  mount() {
    mount();
    return unmount;
  },

  retryInitial() {
    void loadInitial();
  },

  /** Returns false when there was nothing to send. */
  send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return false;
    stopTyping();
    const message: LocalMessage = {
      clientId: crypto.randomUUID(),
      seq: null,
      authorId: snapshot.tabId,
      authorName: snapshot.name,
      text: trimmed,
      createdAt: new Date().toISOString(),
      own: true,
      state: "sending",
      error: null,
    };
    pending = [...pending, message];
    persistPending();
    emit();
    deliver(message);
    return true;
  },

  retry(clientId: string) {
    const message = pending.find((m) => m.clientId === clientId);
    if (!message || message.state !== "failed") return;
    updatePending(clientId, { state: "sending", error: null });
    deliver({ ...message, state: "sending" });
  },

  discard(clientId: string) {
    if (!pending.some((m) => m.clientId === clientId)) return;
    // Still in flight: if the server accepted it after all, show it.
    if (inFlight.has(clientId)) discarded.add(clientId);
    pending = pending.filter((m) => m.clientId !== clientId);
    persistPending();
    emit();
  },

  async loadOlder() {
    const { status } = snapshot.older;
    const oldest = confirmed[0]?.seq;
    if (status === "loading" || status === "done" || oldest === undefined) return;
    emit({ older: { ...snapshot.older, status: "loading", error: null } });
    const controller = new AbortController();
    historyAbort = controller;
    try {
      const page = await fetchHistory(oldest, controller.signal);
      applyPage(page);
      emit({ older: { status: page.hasMore ? "idle" : "done", error: null, trimmed: page.trimmed } });
    } catch (error) {
      if (controller.signal.aborted) {
        // Left the page (try again later), or a clear already marked the start.
        if (snapshot.older.status === "loading") emit({ older: { ...snapshot.older, status: "idle" } });
        return;
      }
      emit({
        older: {
          ...snapshot.older,
          status: "error",
          error: error instanceof Error ? error.message : "Load failed",
        },
      });
    } finally {
      if (historyAbort === controller) historyAbort = null;
    }
  },

  /** Call on every input change; tells the room at most every few seconds. */
  notifyTyping(text: string) {
    if (!text.trim()) return stopTyping();
    const now = Date.now();
    if (now - lastTypingSent < TYPING_SEND_EVERY_MS) return;
    lastTypingSent = now;
    postTyping(snapshot.tabId, snapshot.name, true);
  },

  stopTyping,

  /** The newest message the user has on screen while the tab is visible. */
  reportSeen(seq: number) {
    if (seq <= seenWanted) return;
    seenWanted = seq;
    if (seenTimer) return;
    // At most one report per second; the newest seq wins.
    const wait = Math.max(0, lastSeenAt + SEEN_THROTTLE_MS - Date.now());
    seenTimer = setTimeout(flushSeen, wait);
  },

  /** Returns an error message, or null when saved. */
  rename(value: string) {
    const error = setDisplayName(value);
    if (!error) emit({ name: getDisplayName() });
    return error;
  },

  /** Clears the room for everyone; the stream's `cleared` event updates every tab. */
  async clearHistory() {
    await clearConversation(snapshot.tabId, snapshot.name);
  },

  setSimulatedOffline(value: boolean) {
    connection?.setSimulatedOffline(value);
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useChat(): ChatSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
}
