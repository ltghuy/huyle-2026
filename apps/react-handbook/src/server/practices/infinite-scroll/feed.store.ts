import "server-only";
import type { FeedPage, NewerResult, Post } from "./feed.schema";

// In-memory mock feed. Sequence numbers only grow, so cursor paging stays
// stable while new posts are added.

const INITIAL_POSTS = 500;
const MAX_POSTS = 2000;
const NEWER_LIMIT = 100;
const MINUTE = 60_000;
const BASE_TIME = Date.parse("2026-10-06T08:00:00Z");

const AUTHORS = [
  ["Mai Nguyen", "mai"],
  ["Lukas Becker", "lukas"],
  ["Aisha Khan", "aisha"],
  ["Diego Alvarez", "diego"],
  ["Hana Sato", "hana"],
  ["Omar Haddad", "omar"],
  ["Chloé Martin", "chloe"],
  ["Ravi Patel", "ravi"],
  ["Sofia Rossi", "sofia"],
  ["Jonas Berg", "jonas"],
] as const;

const TOPICS = [
  "Shipped a small fix for the date picker today.",
  "Reminder: the design review moved to Thursday.",
  "Anyone else seeing slow builds after the upgrade?",
  "Wrote up notes on cursor vs offset pagination.",
  "Pairing session on accessibility was great, thanks all!",
  "Coffee machine on floor 3 is fixed ☕",
  "New onboarding docs are live, feedback welcome.",
  "Profiling showed the list re-rendered 400 times. Oops.",
  "Released v1.5 of the internal UI kit.",
  "Hot take: every list needs an empty state.",
];

function makePost(seq: number, createdAt = BASE_TIME - (INITIAL_POSTS - seq) * 7 * MINUTE): Post {
  const [author, handle] = AUTHORS[seq % AUTHORS.length];
  return {
    id: `p${seq}`,
    seq,
    author,
    handle,
    createdAt: new Date(createdAt).toISOString(),
    text: `${TOPICS[(seq * 7) % TOPICS.length]} (#${seq})`,
  };
}

/** Ascending by seq (oldest first). */
let posts: Post[] = Array.from({ length: INITIAL_POSTS }, (_, i) => makePost(i + 1));

const CURSOR = /^(before|after):(\d+)$/;

function encode(kind: "before" | "after", seq: number) {
  return Buffer.from(`${kind}:${seq}`).toString("base64url");
}

function decode(cursor: string, kind: "before" | "after"): number | null {
  const match = CURSOR.exec(Buffer.from(cursor, "base64url").toString());
  return match && match[1] === kind ? Number(match[2]) : null;
}

export function getPage(cursor: string | undefined, limit: number): FeedPage | null {
  const before = cursor === undefined ? Infinity : decode(cursor, "before");
  if (before === null) return null;
  const older = posts.filter((p) => p.seq < before).reverse();
  const data = older.slice(0, limit);
  const last = data.at(-1);
  return {
    data,
    nextCursor: last && older.length > limit ? encode("before", last.seq) : null,
    topCursor: cursor === undefined ? encode("after", data[0]?.seq ?? 0) : undefined,
    total: posts.length,
  };
}

export function getNewer(cursor: string): NewerResult | null {
  const after = decode(cursor, "after");
  if (after === null) return null;
  const newer = posts.filter((p) => p.seq > after);
  const taken = newer.slice(0, NEWER_LIMIT);
  const newest = taken.at(-1);
  return {
    count: newer.length,
    posts: taken.reverse(),
    cursor: newest ? encode("after", newest.seq) : cursor,
  };
}

export function simulateNewPosts(count = 3) {
  const room = Math.max(0, MAX_POSTS - posts.length);
  const created = Math.min(count, room);
  const maxSeq = posts.at(-1)?.seq ?? 0;
  const now = Date.now();
  posts = [
    ...posts,
    ...Array.from({ length: created }, (_, i) => makePost(maxSeq + i + 1, now + i)),
  ];
  return { created, total: posts.length };
}

export async function withLatency<T>(latencyMs: number, failRate: number, work: () => T) {
  await new Promise((resolve) => setTimeout(resolve, latencyMs));
  if (Math.random() < failRate) return { failed: true as const };
  return { failed: false as const, value: work() };
}
