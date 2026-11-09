// The learner's Google AI Studio keys (feature 033), kept on this device only.
// They live in localStorage rather than IndexedDB on purpose: backups, sync
// codes and account progress are built from IndexedDB, so they can never
// carry a key. Falls back to memory when storage is blocked (private mode);
// `clearDevice` removes them on sign-out.
import { z } from "zod";
import { MAX_AI_KEYS, usableKeys, type AiKey } from "@/learning/exercises/translate-ai";

export const AI_KEYS_KEY = "learn-english:ai-keys";

const keysSchema = z.array(
  z.object({
    id: z.string(),
    key: z.string().min(1),
    status: z.enum(["working", "quota", "invalid"]),
    skipUntil: z.number().optional(),
    reasonVi: z.string().optional(),
  }),
);

const EMPTY: readonly AiKey[] = Object.freeze([]);
let memory: readonly AiKey[] = EMPTY;
let blocked = false;
// The last raw value read and its parsed list, so `useSyncExternalStore` gets the same array until it changes.
let cache: { raw: string | null; keys: readonly AiKey[] } = { raw: null, keys: EMPTY };
const listeners = new Set<() => void>();

function parse(raw: string | null): readonly AiKey[] {
  if (raw === cache.raw) return cache.keys;
  let keys: readonly AiKey[] = EMPTY;
  try {
    const parsed = raw === null ? null : keysSchema.safeParse(JSON.parse(raw));
    if (parsed?.success) keys = parsed.data;
  } catch {
    // A broken value reads as no keys.
  }
  cache = { raw, keys };
  return keys;
}

/** The keys in the order they are tried. Stable between changes, for `useSyncExternalStore`. */
export function getAiKeys(): readonly AiKey[] {
  if (blocked) return memory;
  try {
    return parse(localStorage.getItem(AI_KEYS_KEY));
  } catch {
    blocked = true;
    return memory;
  }
}

function save(keys: readonly AiKey[]) {
  memory = keys;
  try {
    if (blocked) throw new Error("blocked");
    const raw = keys.length ? JSON.stringify(keys) : null;
    if (raw === null) localStorage.removeItem(AI_KEYS_KEY);
    else localStorage.setItem(AI_KEYS_KEY, raw);
    cache = { raw, keys };
  } catch {
    // Blocked storage: the keys last until the tab closes.
    blocked = true;
  }
  for (const listener of listeners) listener();
}

/** Whether keys are kept only for this visit because the browser blocks storage. */
export function isAiKeyStorageBlocked(): boolean {
  getAiKeys();
  return blocked;
}

export type AddKeyError = "empty" | "duplicate" | "full";

/** Why a key can't be added, or null when it can. Spaces and line breaks around it are ignored. */
export function addKeyError(text: string, keys: readonly AiKey[] = getAiKeys()): AddKeyError | null {
  const key = text.trim();
  if (!key) return "empty";
  if (keys.some((existing) => existing.key === key)) return "duplicate";
  if (keys.length >= MAX_AI_KEYS) return "full";
  return null;
}

/** Adds a key the caller has checked, as the last one tried. Returns false when it can't be added. */
export function addAiKey(text: string): boolean {
  const keys = getAiKeys();
  if (addKeyError(text, keys)) return false;
  save([...keys, { id: crypto.randomUUID(), key: text.trim(), status: "working" }]);
  return true;
}

export function removeAiKey(id: string) {
  save(getAiKeys().filter((key) => key.id !== id));
}

/** Moves a key one place earlier (-1) or later (1) in the try order. */
export function moveAiKey(id: string, by: -1 | 1) {
  const keys = [...getAiKeys()];
  const from = keys.findIndex((key) => key.id === id);
  const to = from + by;
  if (from < 0 || to < 0 || to >= keys.length) return;
  [keys[from], keys[to]] = [keys[to]!, keys[from]!];
  save(keys);
}

/** Replaces a key's status fields (after a call to Google). The key text and id never change. */
export function updateAiKey(id: string, change: Pick<AiKey, "status" | "skipUntil" | "reasonVi">) {
  const keys = getAiKeys();
  if (!keys.some((key) => key.id === id)) return;
  save(keys.map((key) => (key.id === id ? { id: key.id, key: key.key, ...change } : key)));
}

/** Whether a translate answer can be graded by AI right now (AC-006). */
export function hasUsableAiKey(now: number = Date.now()): boolean {
  return usableKeys(getAiKeys(), now).length > 0;
}

/** For `useSyncExternalStore`. */
export function subscribeAiKeys(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Server render and first paint: no keys. */
export function getServerAiKeys(): readonly AiKey[] {
  return EMPTY;
}

/** Test only: forgets the memory copy and the blocked flag. */
export function resetAiKeysForTest() {
  memory = EMPTY;
  blocked = false;
  cache = { raw: null, keys: EMPTY };
  listeners.clear();
}
