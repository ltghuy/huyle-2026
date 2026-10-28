import type {
  ContentItemsResponse,
  ContentVersion,
  StaleVersionResponse,
} from "@/server/content/content.schema";
import { getDb } from "@/storage/db";
import { getContentCache, putContentCache, type ContentCacheEntry } from "@/storage/content";
import type { Level } from "@/learning/types";
import type { ContentItemOf, ContentKind } from "./schema";

// Browser-side content fetcher. Content is downloaded per kind/level, kept in
// IndexedDB with the version it came from, and refetched only when
// `/api/content/version` reports a new publish. When the network or server
// fails, the last download is used instead (AC-055).

/** How long a fetched version is trusted before asking the server again. */
export const VERSION_TTL_MS = 5 * 60 * 1000;
/** Cache key part used for kinds fetched across every level. */
export const ALL_LEVELS = "all";

/** No content could be loaded and none was downloaded before. The UI shows a Vietnamese message with a retry. */
export class ContentUnavailableError extends Error {
  readonly kind: ContentKind;
  readonly level?: Level;

  constructor(kind: ContentKind, level?: Level, options?: { cause?: unknown }) {
    super(`Content ${kind}:${level ?? ALL_LEVELS} is unavailable`, options);
    this.name = "ContentUnavailableError";
    this.kind = kind;
    this.level = level;
  }
}

export interface LoadedContent<K extends ContentKind = ContentKind> {
  items: ContentItemOf<K>[];
  version: number;
  /** True when this is an earlier download served because the server couldn't be reached. */
  stale: boolean;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body: unknown = await response.json().catch(() => undefined);
  if (!response.ok) throw new HttpError(response.status, body);
  return body as T;
}

let memo: { version: number; at: number } | undefined;
let inflight: Promise<number> | undefined;
// Ids removed from any kind/level loaded in this session (see `isTombstoned`).
const tombstones = new Set<string>();

/** The current content version, fetched at most once per `VERSION_TTL_MS` unless `force` is set. */
export function getContentVersion({ force = false }: { force?: boolean } = {}): Promise<number> {
  if (!force && memo && Date.now() - memo.at < VERSION_TTL_MS) return Promise.resolve(memo.version);
  inflight ??= getJson<ContentVersion>("/api/content/version")
    .then(({ version }) => {
      memo = { version, at: Date.now() };
      return version;
    })
    .finally(() => {
      inflight = undefined;
    });
  return inflight;
}

/**
 * Asks the server for the version again (call on window focus), at most once
 * per `VERSION_TTL_MS`: switching back and forth between windows doesn't
 * call the API each time. Resolves `true` when it changed, so the caller
 * reloads its content. Never throws: offline simply means nothing changed.
 */
export async function refreshIfChanged(): Promise<boolean> {
  const previous = memo?.version;
  try {
    const version = await getContentVersion();
    return previous !== undefined && version !== previous;
  } catch {
    return false;
  }
}

function remember(entry: Pick<ContentCacheEntry, "tombstones">) {
  for (const id of entry.tombstones) tombstones.add(id);
}

function itemsUrl(kind: ContentKind, level: Level | undefined, version: number): string {
  const params = new URLSearchParams({ kind });
  if (level) params.set("level", level);
  params.set("v", String(version));
  return `/api/content/items?${params}`;
}

async function fetchItems(kind: ContentKind, level: Level | undefined, version: number) {
  try {
    return await getJson<ContentItemsResponse>(itemsUrl(kind, level, version));
  } catch (error) {
    // Published in between: the 409 carries the new version (the version
    // endpoint itself may still be edge-cached), so retry once with it.
    if (!(error instanceof HttpError) || error.status !== 409) throw error;
    const current = (error.body as Partial<StaleVersionResponse> | undefined)?.version;
    const next = typeof current === "number" ? current : await getContentVersion({ force: true });
    memo = { version: next, at: Date.now() };
    return getJson<ContentItemsResponse>(itemsUrl(kind, level, next));
  }
}

/**
 * The live items of one kind (one level, or every level when omitted).
 * Served from IndexedDB when the stored copy has the current version;
 * otherwise downloaded and stored. Offline or on a server error, the last
 * download is returned with `stale: true`; with none, this throws
 * `ContentUnavailableError`.
 */
export async function loadContent<K extends ContentKind>(kind: K, level?: Level): Promise<LoadedContent<K>> {
  const levelKey = level ?? ALL_LEVELS;
  const cached = await getContentCache<ContentItemOf<K>>(kind, levelKey).catch(() => undefined);
  if (cached) remember(cached);

  try {
    const version = await getContentVersion();
    if (cached && cached.version === version) {
      return { items: cached.items, version, stale: false };
    }

    const fresh = await fetchItems(kind, level, version);
    const entry = {
      version: fresh.version,
      items: fresh.items as ContentItemOf<K>[],
      tombstones: fresh.tombstones,
      fetchedAt: Date.now(),
    };
    // An item republished after removal is live again.
    for (const item of entry.items) tombstones.delete(item.id);
    remember(entry);
    // A failed write only costs the offline copy; the content is still shown.
    await putContentCache(kind, levelKey, entry).catch(() => {});
    return { items: entry.items, version: entry.version, stale: false };
  } catch (error) {
    if (cached) return { items: cached.items, version: cached.version, stale: true };
    throw new ContentUnavailableError(kind, level, { cause: error });
  }
}

/** Whether an item was removed from the course (hide it from lessons and lists; keep its card and attempts). */
export function isTombstoned(id: string): boolean {
  return tombstones.has(id);
}

/**
 * Every removed id stored in IndexedDB, across all downloaded kinds/levels.
 * Use this before building a lesson plan, when not every kind may have been
 * loaded in this session yet.
 */
export async function loadTombstones(): Promise<ReadonlySet<string>> {
  try {
    for (const entry of await (await getDb()).getAll("content")) remember(entry);
  } catch {
    // Storage unavailable: fall back to what this session has seen.
  }
  return new Set(tombstones);
}

/** Drops items whose ids are tombstoned. */
export function withoutTombstoned<T extends { id: string }>(items: readonly T[]): T[] {
  return items.filter((item) => !tombstones.has(item.id));
}

/** Forgets the in-memory version and tombstones (tests, resets). */
export function resetContentClient(): void {
  memo = undefined;
  inflight = undefined;
  tombstones.clear();
}
