// The pagination demo's model: a feed that grows at the head (new posts arrive
// at the top) and two ways to page through it. Offset paging counts from the
// start, so a head insert shifts everything down by one and the reader sees a
// duplicate (or, scrolling the other way, a skip). Cursor paging points at the
// last item seen, so head inserts don't disturb it. Deterministic; client-only.

export type FeedPost = { id: number; label: string };

/** Newest first: id descending. `count` posts, newest id = startId. */
export function makeFeed(count: number, startId = 1000): FeedPost[] {
  return Array.from({ length: count }, (_, i) => {
    const id = startId - i;
    return { id, label: `Post #${id}` };
  });
}

/** New posts arrive at the top, each with an id above the current highest. */
export function prepend(feed: FeedPost[], n: number): FeedPost[] {
  const top = feed.length > 0 ? feed[0].id : 0;
  const fresh = Array.from({ length: n }, (_, i) => {
    const id = top + n - i;
    return { id, label: `Post #${id}` };
  });
  return [...fresh, ...feed];
}

/** LIMIT/OFFSET: page `pageIndex` (0-based) of `size` from the current list. */
export function offsetPage(feed: FeedPost[], pageIndex: number, size: number): FeedPost[] {
  const start = pageIndex * size;
  return feed.slice(start, start + size);
}

/** Items strictly older than `cursorId` (null = from the top), plus the next cursor. */
export function cursorPage(feed: FeedPost[], cursorId: number | null, size: number): { items: FeedPost[]; nextCursor: number | null } {
  const startIndex = cursorId === null ? 0 : feed.findIndex((p) => p.id < cursorId);
  if (startIndex === -1) return { items: [], nextCursor: null };
  const items = feed.slice(startIndex, startIndex + size);
  const nextCursor = items.length === size ? items[items.length - 1].id : null;
  return { items, nextCursor };
}

/** Classify each post of a freshly fetched page against the ids already seen. */
export function classify(items: FeedPost[], seen: Set<number>): { post: FeedPost; duplicate: boolean }[] {
  return items.map((post) => ({ post, duplicate: seen.has(post.id) }));
}
