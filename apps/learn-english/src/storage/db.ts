import { openDB, type IDBPDatabase, type IDBPTransaction } from "idb";
import type { Attempt, Attendance, DailyLesson, ExtraLesson, StoredCard } from "@/learning/types";

export const DB_NAME = "learn-english";
export const DB_VERSION = 2;

/** One row of the `meta` store: a small key-value record (the profile lives under "profile"). */
export interface MetaRecord<T = unknown> {
  key: string;
  value: T;
}

/** Last downloaded content for one kind/level, kept for offline use. */
export interface ContentCacheEntry<T = unknown> {
  /** `${kind}:${level}` */
  key: string;
  version: number;
  items: T[];
  tombstones: string[];
  fetchedAt: number;
}

export interface StoreValues {
  cards: StoredCard;
  attempts: Attempt;
  lessons: DailyLesson;
  extraLessons: ExtraLesson;
  attendance: Attendance;
  meta: MetaRecord;
  content: ContentCacheEntry;
}

export type StoreName = keyof StoreValues;
export type Key = number | string | Key[];

// Every store keeps its key inside the value, so one key path describes it for
// both IndexedDB and the in-memory fallback.
// `since` is the database version that added the store.
const STORES: { [S in StoreName]: { keyPath: string; indexes: Record<string, string | string[]>; since: number } } = {
  cards: { keyPath: "itemId", indexes: { due: "due" }, since: 1 },
  attempts: { keyPath: "id", indexes: { itemId_at: ["itemId", "at"], at: "at" }, since: 1 },
  lessons: { keyPath: "date", indexes: {}, since: 1 },
  // Extra lessons bought with points (feature 013).
  extraLessons: { keyPath: "id", indexes: { date: "date" }, since: 2 },
  attendance: { keyPath: "date", indexes: {}, since: 1 },
  meta: { keyPath: "key", indexes: {}, since: 1 },
  content: { keyPath: "key", indexes: {}, since: 1 },
};

export interface KeyRange {
  lower?: Key;
  upper?: Key;
}

/** Read/write access inside one transaction. */
export interface TxOps {
  get<S extends StoreName>(store: S, key: Key): Promise<StoreValues[S] | undefined>;
  put<S extends StoreName>(store: S, value: StoreValues[S]): Promise<void>;
  /** Inserts only; resolves `false` when the key already exists. */
  add<S extends StoreName>(store: S, value: StoreValues[S]): Promise<boolean>;
  /** Removes every record in `store`. */
  clear(store: StoreName): Promise<void>;
}

export interface Backend extends TxOps {
  readonly kind: "indexeddb" | "memory";
  getAll<S extends StoreName>(store: S): Promise<StoreValues[S][]>;
  /** Values whose index key is within the inclusive range, ordered by that key. */
  getAllFromIndex<S extends StoreName>(store: S, index: string, range: KeyRange): Promise<StoreValues[S][]>;
  /**
   * Runs `fn` in one readwrite transaction over `stores`. With IndexedDB, `fn`
   * may only await `tx` calls (awaiting anything else lets the transaction
   * auto-commit early).
   */
  transaction(stores: StoreName[], fn: (tx: TxOps) => Promise<void>): Promise<void>;
  close(): void;
}

function isConstraintError(error: unknown): boolean {
  return error instanceof Error && error.name === "ConstraintError";
}

function toIdbRange({ lower, upper }: KeyRange): IDBKeyRange | undefined {
  if (lower !== undefined && upper !== undefined) return IDBKeyRange.bound(lower, upper);
  if (lower !== undefined) return IDBKeyRange.lowerBound(lower);
  if (upper !== undefined) return IDBKeyRange.upperBound(upper);
  return undefined;
}

async function openIndexedDb(): Promise<Backend> {
  const db: IDBPDatabase = await openDB(DB_NAME, DB_VERSION, {
    // Creates the stores added after `oldVersion`; existing stores and data are left alone.
    upgrade(database, oldVersion) {
      for (const [name, { keyPath, indexes, since }] of Object.entries(STORES)) {
        if (since <= oldVersion) continue;
        const store = database.createObjectStore(name, { keyPath });
        for (const [index, path] of Object.entries(indexes)) store.createIndex(index, path);
      }
    },
  });

  const txOps = (tx: IDBPTransaction<unknown, StoreName[], "readwrite">): TxOps => ({
    get: (store, key) => tx.objectStore(store).get(key),
    put: async (store, value) => {
      await tx.objectStore(store).put(value);
    },
    add: async (store, value) => {
      try {
        await tx.objectStore(store).add(value);
        return true;
      } catch (error) {
        if (isConstraintError(error)) return false;
        throw error;
      }
    },
    clear: async (store) => {
      await tx.objectStore(store).clear();
    },
  });

  return {
    kind: "indexeddb",
    get: (store, key) => db.get(store, key),
    getAll: (store) => db.getAll(store),
    getAllFromIndex: (store, index, range) => db.getAllFromIndex(store, index, toIdbRange(range)),
    put: async (store, value) => {
      await db.put(store, value);
    },
    clear: async (store) => {
      await db.clear(store);
    },
    add: async (store, value) => {
      try {
        await db.add(store, value);
        return true;
      } catch (error) {
        if (isConstraintError(error)) return false;
        throw error;
      }
    },
    transaction: async (stores, fn) => {
      const tx = db.transaction(stores, "readwrite");
      // A failed request aborts the transaction; `tx.done` then rejects too.
      tx.done.catch(() => {});
      try {
        await fn(txOps(tx));
      } catch (error) {
        try {
          tx.abort();
        } catch {
          // Already finished or aborted.
        }
        throw error;
      }
      await tx.done;
    },
    close: () => db.close(),
  };
}

function keyOf(value: object, path: string | string[]): Key {
  const record = value as Record<string, Key>;
  return Array.isArray(path) ? path.map((part) => record[part]) : record[path];
}

/** IndexedDB key order for the key types we use: numbers < strings < arrays. */
export function compareKeys(a: Key, b: Key): number {
  const rank = (key: Key) => (typeof key === "number" ? 0 : typeof key === "string" ? 1 : 2);
  if (rank(a) !== rank(b)) return rank(a) - rank(b);
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      const order = compareKeys(a[i], b[i]);
      if (order !== 0) return order;
    }
    return a.length - b.length;
  }
  return a < b ? -1 : a > b ? 1 : 0;
}

// In-memory fallback: when IndexedDB can't be opened (some private modes), the
// same Backend API is served from plain Maps of structured clones. Data lives
// for the session only, and transactions run without rollback, which is good
// enough for one tab; the app shows a banner suggesting export or sync.
function createMemoryBackend(): Backend {
  const maps = new Map<StoreName, Map<string, unknown>>();
  const mapOf = (store: StoreName) => {
    let map = maps.get(store);
    if (!map) maps.set(store, (map = new Map()));
    return map;
  };
  const id = (key: Key) => JSON.stringify(key);

  const ops: TxOps = {
    get: async (store, key) => structuredClone(mapOf(store).get(id(key))) as never,
    put: async (store, value) => {
      mapOf(store).set(id(keyOf(value, STORES[store].keyPath)), structuredClone(value));
    },
    add: async (store, value) => {
      const key = id(keyOf(value, STORES[store].keyPath));
      if (mapOf(store).has(key)) return false;
      mapOf(store).set(key, structuredClone(value));
      return true;
    },
    clear: async (store) => {
      mapOf(store).clear();
    },
  };

  return {
    kind: "memory",
    ...ops,
    getAll: async (store) => {
      const path = STORES[store].keyPath;
      return ([...mapOf(store).values()] as StoreValues[typeof store][])
        .map((value) => structuredClone(value))
        .sort((a, b) => compareKeys(keyOf(a, path), keyOf(b, path)));
    },
    getAllFromIndex: async (store, index, { lower, upper }) => {
      const path = STORES[store].indexes[index];
      if (!path) throw new Error(`Unknown index ${store}.${index}`);
      return ([...mapOf(store).values()] as StoreValues[typeof store][])
        .filter((value) => {
          const key = keyOf(value, path);
          return (
            (lower === undefined || compareKeys(key, lower) >= 0) &&
            (upper === undefined || compareKeys(key, upper) <= 0)
          );
        })
        .sort((a, b) => compareKeys(keyOf(a, path), keyOf(b, path)))
        .map((value) => structuredClone(value));
    },
    transaction: (_stores, fn) => fn(ops),
    close: () => {},
  };
}

let backend: Promise<Backend> | undefined;

/** The open database, or the in-memory fallback when IndexedDB is unavailable. */
export function getDb(): Promise<Backend> {
  backend ??= (async () => {
    try {
      if (typeof indexedDB === "undefined") throw new Error("IndexedDB is missing");
      return await openIndexedDb();
    } catch {
      return createMemoryBackend();
    }
  })();
  return backend;
}

/** Closes the database so the next `getDb()` opens it again (tests, resets). */
export async function closeDb(): Promise<void> {
  const current = backend;
  backend = undefined;
  (await current)?.close();
}

/** Whether progress is saved to IndexedDB (false: in-memory for this session only). */
export async function isStorageAvailable(): Promise<boolean> {
  return (await getDb()).kind === "indexeddb";
}

/** Asks the browser not to evict our data under storage pressure. Never throws. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
