import "server-only";
import {
  PAGE_SIZE,
  REPLAY_WINDOW,
  type ChatMessage,
  type ClearedEvent,
  type HistoryPage,
  type SendBody,
  type StreamEvent,
} from "./chat.schema";

// One in-memory room. It lives on globalThis so dev reloads and every chat
// route module share the same messages, subscribers and bot timers.

type Subscriber = {
  tabId: string;
  send: (event: StreamEvent) => void;
  close: () => void;
};

type Room = {
  /** Ascending by seq, at most REPLAY_WINDOW long. */
  messages: ChatMessage[];
  nextSeq: number;
  trimmed: boolean;
  byClientId: Map<string, ChatMessage>;
  subscribers: Set<Subscriber>;
  /** The most recent clear, replayed to clients that missed it. */
  lastClear: ClearedEvent | null;
  /** Called when the subscriber count goes 0 → 1 or 1 → 0. */
  onPresence: ((active: boolean) => void) | null;
};

const MINUTE = 60_000;
const SEED_AUTHORS = ["Mai Nguyen", "Lukas Becker", "Aisha Khan", "Diego Alvarez", "Hana Sato"];
const SEED_LINES = [
  "Morning all! Standup in 10.",
  "Pushed the fix for the flaky test.",
  "Can someone review my PR when you get a chance?",
  "Lunch plans? Thinking ramen.",
  "The staging deploy is green again.",
  "I'll take the accessibility ticket.",
  "Anyone seen the new design tokens doc?",
  "Heading out, see you tomorrow 👋",
  "Quick question about the cursor pagination API.",
  "Thanks for the help earlier!",
];

function seed(): Room {
  const room: Room = {
    messages: [],
    nextSeq: 1,
    trimmed: false,
    byClientId: new Map(),
    subscribers: new Set(),
    lastClear: null,
    onPresence: null,
  };
  // ~120 messages over the last three days, so day separators show up.
  const start = Date.now() - 3 * 24 * 60 * MINUTE;
  for (let i = 0; i < 120; i++) {
    const day = Math.floor(i / 40);
    const createdAt = start + day * 24 * 60 * MINUTE + 9 * 60 * MINUTE + (i % 40) * 11 * MINUTE;
    const name = SEED_AUTHORS[(i * 3) % SEED_AUTHORS.length];
    store(room, {
      clientId: `seed-${i}`,
      authorId: `bot:${name}`,
      authorName: name,
      text: SEED_LINES[(i * 7) % SEED_LINES.length],
    }, createdAt);
  }
  return room;
}

const globalRoom = globalThis as typeof globalThis & { __chatRoom?: Room };
const room = (globalRoom.__chatRoom ??= seed());

function store(target: Room, body: SendBody, createdAt = Date.now()): ChatMessage {
  const seq = target.nextSeq++;
  const message: ChatMessage = {
    id: `m${seq}`,
    seq,
    clientId: body.clientId,
    authorId: body.authorId,
    authorName: body.authorName,
    text: body.text,
    createdAt: new Date(createdAt).toISOString(),
  };
  target.messages.push(message);
  target.byClientId.set(message.clientId, message);
  if (target.messages.length > REPLAY_WINDOW) {
    const dropped = target.messages.shift()!;
    target.byClientId.delete(dropped.clientId);
    target.trimmed = true;
  }
  return message;
}

function broadcast(event: StreamEvent) {
  for (const sub of room.subscribers) sub.send(event);
}

/** Idempotent by clientId: a repeated send returns the stored message. */
export function postMessage(body: SendBody): { message: ChatMessage; created: boolean } {
  const existing = room.byClientId.get(body.clientId);
  if (existing) return { message: existing, created: false };
  const message = store(room, body);
  broadcast({ type: "message", data: message });
  return { message, created: true };
}

export function findByClientId(clientId: string) {
  return room.byClientId.get(clientId) ?? null;
}

export function getHistory(before = Infinity, limit = PAGE_SIZE): HistoryPage {
  const older = room.messages.filter((m) => m.seq < before);
  const messages = older.slice(-limit);
  const hasMore = older.length > limit;
  return { messages, hasMore, trimmed: !hasMore && room.trimmed };
}

/** Deletes the history for everyone. Seq keeps counting, so catch-up stays exact. */
export function clearRoom(byId: string, byName: string) {
  const cleared = room.messages.length;
  const event: ClearedEvent = { byId, byName, upToSeq: room.nextSeq - 1 };
  room.messages = [];
  room.byClientId.clear();
  room.trimmed = false;
  room.lastClear = event;
  broadcast({ type: "cleared", data: event });
  return cleared;
}

export function broadcastTyping(authorId: string, authorName: string, typing: boolean) {
  broadcast({ type: "typing", data: { authorId, authorName, typing } });
}

export function broadcastSeen(authorId: string, upToSeq: number) {
  broadcast({ type: "seen", data: { authorId, upToSeq } });
}

/**
 * Registers a subscriber and returns what it missed, in the same tick, so no
 * message can be broadcast between the replay snapshot and the subscription.
 */
export function subscribe(sub: Subscriber, after: number) {
  const oldestSeq = room.messages[0]?.seq ?? room.nextSeq;
  const newestSeq = room.nextSeq - 1;
  const backlog: StreamEvent[] = [{ type: "hello", data: { tabId: sub.tabId, oldestSeq, newestSeq } }];
  // The client still holds messages from before a clear it missed: clear first.
  const missedClear = room.lastClear !== null && after > 0 && after <= room.lastClear.upToSeq;
  if (missedClear) backlog.push({ type: "cleared", data: room.lastClear! });
  // Something between `after` (or the clear) and the oldest kept message is gone: reset.
  const from = missedClear ? room.lastClear!.upToSeq : after;
  const gap = from > 0 && from + 1 < oldestSeq;
  if (gap) {
    backlog.push({ type: "reset", data: { page: getHistory() } });
  } else {
    for (const message of room.messages) {
      if (message.seq > after) backlog.push({ type: "message", data: message });
    }
  }
  room.subscribers.add(sub);
  if (room.subscribers.size === 1) room.onPresence?.(true);

  return {
    backlog,
    unsubscribe() {
      if (!room.subscribers.delete(sub)) return;
      if (room.subscribers.size === 0) room.onPresence?.(false);
    },
  };
}

/** Closes every stream of a tab from the server side. */
export function dropTab(tabId: string) {
  let dropped = 0;
  // close() removes the subscriber; deleting during Set iteration is safe.
  for (const sub of room.subscribers) {
    if (sub.tabId !== tabId) continue;
    sub.close();
    dropped++;
  }
  return dropped;
}

export function setPresenceListener(listener: (active: boolean) => void) {
  room.onPresence = listener;
  listener(room.subscribers.size > 0);
}

export async function simulateNetwork(latencyMs: number) {
  const wait = latencyMs === -1 ? 100 + Math.random() * 1900 : latencyMs;
  await new Promise((resolve) => setTimeout(resolve, wait));
}
