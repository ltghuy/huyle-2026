// Builds the displayed list: ticket keys in sort order, filtered by the
// query. Base orders are cached per (sort, count); filtering is one pass.

import { fold, ticketStore } from "./tickets";

export const SORTS = [
  { value: "oldest", label: "Oldest first" },
  { value: "newest", label: "Newest first" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title A–Z" },
] as const;

export type Sort = (typeof SORTS)[number]["value"];

const WHITESPACE = /\s+/;
const orders = new Map<string, Int32Array>();

function buildOrder(sort: Sort, count: number): Int32Array {
  const keys = new Int32Array(count);
  switch (sort) {
    case "oldest":
      for (let i = 0; i < count; i++) keys[i] = i;
      return keys;
    case "newest":
      for (let i = 0; i < count; i++) keys[i] = count - 1 - i;
      return keys;
    case "priority": {
      // Bucket by priority, newest first inside a bucket: O(n), stable.
      const buckets: number[][] = [[], [], [], []];
      for (let key = count - 1; key >= 0; key--) buckets[ticketStore.get(key).priority].push(key);
      let i = 0;
      for (const bucket of buckets) for (const key of bucket) keys[i++] = key;
      return keys;
    }
    case "title": {
      for (let i = 0; i < count; i++) keys[i] = i;
      return keys.sort((a, b) => {
        const ta = ticketStore.foldedTitle(a);
        const tb = ticketStore.foldedTitle(b);
        return ta < tb ? -1 : ta > tb ? 1 : a - b;
      });
    }
  }
}

function baseOrder(sort: Sort, count: number) {
  const id = `${sort}:${count}`;
  let order = orders.get(id);
  if (!order) {
    order = buildOrder(sort, count);
    orders.set(id, order);
  }
  return order;
}

/** Folded, de-duplicated words; empty means "match everything". */
export function parseQuery(query: string): string[] {
  return [...new Set(fold(query).split(WHITESPACE).filter(Boolean))];
}

/** Ticket keys to display, in order. */
export function buildView(count: number, sort: Sort, query: string): Int32Array {
  const order = baseOrder(sort, count);
  const words = parseQuery(query);
  if (words.length === 0) return order;
  const out = new Int32Array(count);
  let n = 0;
  outer: for (let i = 0; i < order.length; i++) {
    const key = order[i];
    const text = ticketStore.folded(key);
    for (const word of words) if (!text.includes(word)) continue outer;
    out[n++] = key;
  }
  return out.slice(0, n);
}

/** Display index of every ticket key (-1 when filtered out): O(1) lookups. */
export function positionsOf(keys: Int32Array, count: number): Int32Array {
  const positions = new Int32Array(count).fill(-1);
  for (let i = 0; i < keys.length; i++) positions[keys[i]] = i;
  return positions;
}
