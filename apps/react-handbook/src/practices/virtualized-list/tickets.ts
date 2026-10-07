// Generated support tickets. Each ticket is built from its own seed, so
// ticket N has the same content whatever list size or chunk produced it.
// Tickets accumulate in a module cache (growing the list reuses them) and
// are generated in chunks so 100,000 never block the main thread at once.

import { useSyncExternalStore } from "react";

export const MAX_TICKETS = 100_000;
const CHUNK = 5_000;
const SEED = 0x7e57;
const START = Date.UTC(2026, 0, 1);
const MINUTE = 60_000;

export const PRIORITIES = ["Urgent", "High", "Normal", "Low"] as const;
export const STATUSES = ["open", "pending", "solved"] as const;

export type Ticket = {
  /** 0-based position in the generated universe: stable identity. */
  key: number;
  /** Shown as "#12,345". */
  id: number;
  title: string;
  body: string;
  requester: string;
  /** 0 urgent · 1 high · 2 normal · 3 low */
  priority: number;
  status: (typeof STATUSES)[number];
  createdAt: number;
};

const FIRST = ["Ana", "José", "Zoë", "Liam", "Mai", "Noah", "Chloé", "Øystein", "Priya", "Kenji", "Amélie", "Omar", "Sofia", "Đức", "Ingrid", "Mateo", "Hana", "Björn", "Lucía", "Tariq"];
const LAST = ["Núñez", "Smith", "Nguyễn", "Kowalski", "Müller", "Tanaka", "Okafor", "García", "Lefèvre", "Haddad", "Johansson", "Rossi", "Patel", "Dubois", "Novák", "Silva"];
const SUBJECTS = ["Login", "Invoice", "Export", "Dashboard", "Password reset", "Mobile app", "Webhook", "Search", "Billing page", "Report", "Calendar sync", "File upload", "Notification", "API key", "Team invite", "Checkout"];
const PROBLEMS = ["fails after the latest update", "is very slow today", "shows the wrong totals", "keeps timing out", "doesn't load on Safari", "sends duplicate emails", "returns a blank page", "is missing some rows", "asks me to sign in again", "crashes on large files", "ignores my time zone", "rounds amounts incorrectly"];
const OPENERS = ["Since this morning", "After yesterday's release", "For a few users on our team", "Only on the shared workspace", "When I use the desktop app", "Every time I try again", "On both of our accounts", "Intermittently"];
const DETAILS = ["the spinner never stops and nothing is saved", "we get an error that says something went wrong", "the numbers don't match last month's export", "the page reloads and loses everything we typed", "it works in a private window but not in a normal one", "clearing the cache didn't help", "our customers have started to notice", "the same steps worked fine last week", "the log shows a 502 from the gateway", "it only happens with more than fifty items"];
const CLOSERS = ["Could you take a look?", "Is there a workaround for now?", "This is blocking our month-end close.", "Happy to share a screen recording.", "Thanks for your help!", "Please let me know if you need more details."];

/** mulberry32: tiny, fast, good enough for demo data. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(next: () => number, list: readonly T[]): T {
  return list[Math.floor(next() * list.length)];
}

export function generateTicket(key: number): Ticket {
  const next = random(Math.imul(key + 1, 0x9e3779b1) ^ SEED);
  const sentences: string[] = [];
  // 0–4 sentences: the source of variable row height.
  const count = Math.floor(next() * 5);
  for (let i = 0; i < count; i++) {
    let sentence = "";
    // A few tries to avoid repeating a sentence within one ticket.
    for (let attempt = 0; attempt < 3 && (!sentence || sentences.includes(sentence)); attempt++) {
      sentence = i === count - 1 && next() < 0.5 ? pick(next, CLOSERS) : `${pick(next, OPENERS)}, ${pick(next, DETAILS)}.`;
    }
    if (!sentences.includes(sentence)) sentences.push(sentence);
  }
  const roll = next();
  return {
    key,
    id: key + 1,
    title: `${pick(next, SUBJECTS)} ${pick(next, PROBLEMS)}`,
    body: sentences.join(" "),
    requester: `${pick(next, FIRST)} ${pick(next, LAST)}`,
    priority: roll < 0.08 ? 0 : roll < 0.3 ? 1 : roll < 0.8 ? 2 : 3,
    status: pick(next, STATUSES),
    createdAt: START + key * 7 * MINUTE + Math.floor(next() * 6 * MINUTE),
  };
}

const MARKS = /\p{M}/gu;

/** Accent- and case-insensitive form used for filtering. */
export function fold(text: string) {
  return text.normalize("NFD").replace(MARKS, "").toLowerCase();
}

// ---------------------------------------------------------------------------
// Store

const tickets: Ticket[] = [];
/** Folded "title body requester" per ticket, same index as `tickets`. */
const folded: string[] = [];
/** Folded title per ticket, for the A–Z sort. */
const foldedTitles: string[] = [];

type Snapshot = { generated: number; target: number };

let snapshot: Snapshot = { generated: 0, target: 0 };
const listeners = new Set<() => void>();
const SERVER_SNAPSHOT: Snapshot = { generated: 0, target: 0 };
let timer: ReturnType<typeof setTimeout> | null = null;
let onDone: (() => void) | null = null;

function emit(next: Snapshot) {
  snapshot = next;
  for (const listener of listeners) listener();
}

function step() {
  timer = null;
  const end = Math.min(snapshot.target, tickets.length + CHUNK);
  for (let key = tickets.length; key < end; key++) {
    const ticket = generateTicket(key);
    tickets.push(ticket);
    folded.push(fold(`${ticket.title} ${ticket.body} ${ticket.requester}`));
    foldedTitles.push(fold(ticket.title));
  }
  emit({ ...snapshot, generated: tickets.length });
  if (tickets.length < snapshot.target) timer = setTimeout(step, 0);
  else onDone?.();
}

export const ticketStore = {
  /**
   * Makes sure the first `count` tickets exist. `generated` runs once they
   * do, only when some had to be generated.
   */
  ensure(count: number, generated?: () => void) {
    const target = Math.min(count, MAX_TICKETS);
    onDone = generated ?? null;
    if (tickets.length >= target) {
      onDone = null;
      if (snapshot.target !== target) emit({ generated: tickets.length, target });
      return;
    }
    emit({ ...snapshot, target });
    timer ??= setTimeout(step, 0);
  },
  get(key: number) {
    return tickets[key];
  },
  folded(key: number) {
    return folded[key];
  },
  foldedTitle(key: number) {
    return foldedTitles[key];
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** How many tickets exist and how many the current list needs. */
export function useTicketProgress() {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
}
