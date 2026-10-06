import type { Post } from "@/server/practices/infinite-scroll/feed.schema";

export type FeedStatus = "loading" | "idle" | "error" | "ended";

export type FeedEvent =
  | { id: number; type: "loaded"; count: number; total: number }
  | { id: number; type: "error" }
  | { id: number; type: "ended"; total: number }
  | { id: number; type: "shown"; count: number };

export type FeedSnapshot = {
  posts: Post[];
  status: FeedStatus;
  error: string | null;
  nextCursor: string | null;
  topCursor: string | null;
  total: number | null;
  pending: Post[];
  pendingCount: number;
  pendingCursor: string | null;
  requests: number;
  event: FeedEvent | null;
};

export type ScrollAnchor = { id: string; offset: number };

// Lives in module memory: survives in-app navigation, cleared by a reload.
let snapshot: FeedSnapshot | null = null;
let anchor: ScrollAnchor | null = null;

export const feedCache = {
  read: () => snapshot,
  write(next: FeedSnapshot) {
    snapshot = next;
  },
  readAnchor: () => anchor,
  writeAnchor(next: ScrollAnchor | null) {
    anchor = next;
  },
  clear() {
    snapshot = null;
    anchor = null;
  },
};
