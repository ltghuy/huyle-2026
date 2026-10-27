import { localDate } from "@/learning/attendance";
import { mergeSnapshots } from "@/learning/merge";
import {
  base64ToBytes,
  buildSnapshot,
  bytesToBase64,
  decodeSnapshot,
  encodeSnapshot,
  summarize,
  type LearnerState,
  type Snapshot,
  type SnapshotData,
} from "@/learning/snapshot";
import type { SyncState } from "@/learning/types";
import { formatSyncCode, normalizeSyncCode } from "@/server/sync/code";
import { subscribeChanges } from "@/storage/broadcast";
import { getProfile, updateProfile } from "@/storage/meta";
import { readLearnerState, replaceAll } from "@/storage/replace";
import { createRemote, deleteRemote, getRemote, isTransient, putRemote, SyncError } from "./api";

// Browser side of sync (AC-047–AC-051). No React here.
//
// How a device knows it has something to upload: every successful sync
// stores a fingerprint (SHA-256 of the snapshot data) in localStorage, shared
// by the tabs of this browser. A push builds the snapshot and only uploads
// when its fingerprint differs. Change messages therefore only schedule a
// check, so the writes sync makes itself (replaceAll after a merge, the
// profile.sync bookkeeping) never cause an upload loop: they leave the
// fingerprint unchanged and the check ends without a request.

export { SyncError, SYNC_ERROR_MESSAGES, type SyncErrorKind } from "./api";

/** Conflict retries (merge, then PUT again) before giving up until the next run. */
const MAX_TRIES = 3;
const FINGERPRINT_KEY = "learn-english:sync-fingerprint";
const LOCK_NAME = "learn-english-sync";

interface Remote {
  rev: number;
  updatedAt: number;
  snapshot: Snapshot;
}

export interface SyncPreview {
  /** The code, formatted XXXX-XXXX-XXXX. */
  code: string;
  rev: number;
  updatedAt: number;
  summary: Snapshot["summary"];
}

// ---------------------------------------------------------------------------
// Helpers

/** JSON with sorted object keys, so equal data always gives the same text. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

async function fingerprint(data: SnapshotData): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stableStringify(data)));
  return bytesToBase64(new Uint8Array(digest));
}

// Falls back to memory when localStorage is blocked: at worst a tab uploads
// unchanged data once.
let memoryFingerprint: { code: string; value: string } | undefined;

function readFingerprint(code: string): string | undefined {
  try {
    const stored = JSON.parse(localStorage.getItem(FINGERPRINT_KEY) ?? "null") as { code?: string; value?: string } | null;
    if (stored?.code === code) return stored.value;
  } catch {
    // ignore: use the in-memory copy
  }
  return memoryFingerprint?.code === code ? memoryFingerprint.value : undefined;
}

function writeFingerprint(code: string, value: string | undefined): void {
  memoryFingerprint = value === undefined ? undefined : { code, value };
  try {
    if (value === undefined) localStorage.removeItem(FINGERPRINT_KEY);
    else localStorage.setItem(FINGERPRINT_KEY, JSON.stringify({ code, value }));
  } catch {
    // ignore: memory only
  }
}

let fallbackQueue: Promise<unknown> = Promise.resolve();

/** Runs sync steps one at a time across this browser's tabs (Web Locks), or in this tab when unsupported. */
function withLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (locks?.request) return locks.request(LOCK_NAME, task) as Promise<T>;
  const run = fallbackQueue.then(task, task);
  fallbackQueue = run.catch(() => {});
  return run;
}

async function encode(state: LearnerState, now: number): Promise<{ base64: string; fingerprint: string }> {
  const snapshot = buildSnapshot(state, now, state.profile.timeZone);
  const [bytes, fp] = await Promise.all([encodeSnapshot(snapshot), fingerprint(snapshot.data)]);
  return { base64: bytesToBase64(bytes), fingerprint: fp };
}

/** The fingerprint alone, without compressing anything. */
async function stateFingerprint(state: LearnerState, now: number): Promise<string> {
  return fingerprint(buildSnapshot(state, now, state.profile.timeZone).data);
}

async function fetchRemote(code: string): Promise<Remote> {
  const { rev, data, updatedAt } = await getRemote(code);
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(data);
  } catch (cause) {
    throw new SyncError("invalid-data", { cause });
  }
  const parsed = await decodeSnapshot(bytes);
  if (!parsed.ok) throw new SyncError(parsed.reason === "newer-version" ? "newer-version" : "invalid-data");
  return { rev, updatedAt, snapshot: parsed.snapshot };
}

function toCode(input: string): string {
  const normalised = normalizeSyncCode(input);
  if (normalised === null) throw new SyncError("invalid-code");
  return formatSyncCode(normalised);
}

async function saveSync(sync: SyncState | undefined, now: number): Promise<void> {
  await updateProfile({ sync }, now);
}

async function markDirty(sync: SyncState, now: number): Promise<void> {
  const current = (await getProfile())?.sync;
  if (current?.code === sync.code && !current.dirty) await saveSync({ ...current, dirty: true }, now);
}

/**
 * Brings this device and the server row in line. With `remote`, its data is
 * merged into local progress first; then the local snapshot is uploaded with
 * the matching rev. A 409 fetches the newer row, merges and tries again.
 */
async function reconcile(code: string, startRev: number, firstRemote: Remote | undefined, keepalive = false): Promise<void> {
  let remote = firstRemote;
  let rev = startRev;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const now = Date.now();
    // Read and replace back to back, so the window for a change made in
    // between (which replaceAll would overwrite) stays a few milliseconds.
    let state = await readLearnerState(now);
    const lastSyncedAt = state.profile.sync?.code === code ? state.profile.sync.lastSyncedAt : undefined;
    let remoteFingerprint: string | undefined;
    if (remote) {
      rev = remote.rev;
      state = mergeSnapshots(state, remote.snapshot.data);
      state.profile = { ...state.profile, sync: { code, rev, lastSyncedAt, dirty: true } };
      await replaceAll(state);
      remoteFingerprint = await fingerprint(remote.snapshot.data);
    }

    const local = await encode(state, now);
    if (local.fingerprint === remoteFingerprint || (!remote && local.fingerprint === readFingerprint(code))) {
      // Nothing the server lacks.
      await saveSync({ code, rev, lastSyncedAt: now, dirty: false }, now);
      writeFingerprint(code, local.fingerprint);
      return;
    }

    try {
      const result = await putRemote(code, rev, local.base64, { keepalive });
      await saveSync({ code, rev: result.rev, lastSyncedAt: Date.now(), dirty: false }, now);
      writeFingerprint(code, local.fingerprint);
      return;
    } catch (error) {
      if (!(error instanceof SyncError && error.kind === "conflict")) {
        await markDirty({ code, rev, dirty: true }, now);
        throw error;
      }
      remote = await fetchRemote(code);
    }
  }
  await markDirty({ code, rev, dirty: true }, Date.now());
  throw new SyncError("conflict");
}

/** The server forgot this code (deleted from another device): unlink here too. */
async function handleGone(error: unknown, code: string): Promise<never> {
  if (error instanceof SyncError && error.kind === "not-found") {
    const current = (await getProfile())?.sync;
    if (current?.code === code) await unlinkSync();
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Public API

/** Turns sync on: uploads the current progress and stores the new code (AC-047). Returns the code. */
export function turnOnSync(): Promise<string> {
  return withLock(async () => {
    const now = Date.now();
    const state = await readLearnerState(now);
    const { base64, fingerprint: fp } = await encode(state, now);
    const { code, rev } = await createRemote(base64);
    await saveSync({ code, rev, lastSyncedAt: now, dirty: false }, now);
    writeFingerprint(code, fp);
    return code;
  });
}

/** What the synced progress behind `code` contains, for the confirm dialog (AC-049). */
export async function previewSync(input: string): Promise<SyncPreview> {
  const code = toCode(input);
  const remote = await fetchRemote(code);
  const { data } = remote.snapshot;
  const today = localDate(Date.now(), data.meta.timeZone);
  return { code, rev: remote.rev, updatedAt: remote.updatedAt, summary: summarize(data, today) };
}

/** Links this device: merges the synced progress into local progress and uploads the result (AC-049, AC-050). */
export function linkSync(input: string): Promise<void> {
  const code = toCode(input);
  return withLock(async () => {
    const remote = await fetchRemote(code);
    await reconcile(code, remote.rev, remote).catch((error: unknown) => {
      // Linked and merged locally; the upload is retried by auto sync.
      if (!isTransient(error)) throw error;
    });
  });
}

/**
 * Uploads local changes if there are any (409 → fetch, merge, apply, retry).
 * On a network error the device stays dirty and the error is rethrown.
 * Resolves true when something was checked against the server.
 */
export function pushNow({ keepalive = false }: { keepalive?: boolean } = {}): Promise<boolean> {
  return withLock(async () => {
    const sync = (await getProfile())?.sync;
    if (!sync) return false;
    await reconcile(sync.code, sync.rev, undefined, keepalive).catch((error: unknown) => handleGone(error, sync.code));
    return true;
  });
}

/** Pushes local changes, or, when there are none, pulls and applies newer progress from other devices. */
export function syncNow(): Promise<void> {
  return withLock(async () => {
    const profile = await getProfile();
    const sync = profile?.sync;
    if (!profile || !sync) return;
    try {
      const now = Date.now();
      const current = await stateFingerprint(await readLearnerState(now), now);
      if (sync.dirty || current !== readFingerprint(sync.code)) {
        await reconcile(sync.code, sync.rev, undefined);
        return;
      }
      const remote = await fetchRemote(sync.code);
      if (remote.rev !== sync.rev) await reconcile(sync.code, remote.rev, remote);
    } catch (error) {
      await handleGone(error, sync.code);
    }
  });
}

/** Turns sync off on this device only; the synced copy stays on the server (AC-051). */
export async function unlinkSync(): Promise<void> {
  const sync = (await getProfile())?.sync;
  await saveSync(undefined, Date.now());
  if (sync) writeFingerprint(sync.code, undefined);
}

/** Deletes the synced copy from the server, then unlinks this device (AC-051). */
export function deleteSyncedData(): Promise<void> {
  return withLock(async () => {
    const sync = (await getProfile())?.sync;
    if (!sync) return;
    try {
      await deleteRemote(sync.code);
    } catch (error) {
      // Already gone is fine.
      if (!(error instanceof SyncError && error.kind === "not-found")) throw error;
    }
    await unlinkSync();
  });
}

// ---------------------------------------------------------------------------
// Auto sync

/** Upload at most this often while changes are pending (AC-048), and pull this often while the page is visible. */
export const SYNC_INTERVAL_MS = 60_000;
/** A short wait after a change, so a burst of answers goes up together. */
export const CHANGE_DELAY_MS = 5_000;
const FIRST_BACKOFF_MS = 30_000;
const MAX_BACKOFF_MS = 10 * 60_000;
/** Stop polling for other devices' changes after this long without activity here. */
const IDLE_AFTER_MS = 30 * 60_000;

/**
 * Keeps this device in sync while the app is open: any storage change
 * schedules an upload within a minute; the page pulls other devices' changes
 * every minute while visible; hiding the page pushes at once (fetch
 * keepalive); failures back off and retry, and coming back online retries at
 * once. Returns the stop function.
 */
export function startAutoSync(): () => void {
  if (typeof window === "undefined") return () => {};
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dueAt = Infinity;
  let lastRunAt = 0;
  let lastActivityAt = Date.now();
  let backoff = 0;
  let running = false;

  const visible = () => document.visibilityState !== "hidden";

  function schedule(delay: number) {
    if (stopped) return;
    const at = Date.now() + Math.max(0, delay);
    if (timer !== undefined && at >= dueAt) return;
    clearTimeout(timer);
    dueAt = at;
    timer = setTimeout(run, Math.max(0, delay));
  }

  async function run() {
    timer = undefined;
    dueAt = Infinity;
    if (stopped) return;
    if (running) {
      schedule(CHANGE_DELAY_MS);
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) return; // "online" resumes
    running = true;
    lastRunAt = Date.now();
    try {
      const sync = (await getProfile())?.sync;
      if (!sync) return;
      await syncNow();
      backoff = 0;
      if (visible() && Date.now() - lastActivityAt < IDLE_AFTER_MS) schedule(SYNC_INTERVAL_MS);
    } catch (error) {
      if (isTransient(error)) {
        backoff = Math.min(backoff ? backoff * 2 : FIRST_BACKOFF_MS, MAX_BACKOFF_MS);
        schedule(backoff);
      }
    } finally {
      running = false;
    }
  }

  function handleChange() {
    lastActivityAt = Date.now();
    // Within a minute of the last run, but never sooner than the short delay.
    schedule(Math.max(CHANGE_DELAY_MS, lastRunAt + SYNC_INTERVAL_MS - Date.now(), backoff ? backoff : 0));
  }

  function handleVisibility() {
    if (visible()) {
      lastActivityAt = Date.now();
      schedule(0);
    } else {
      clearTimeout(timer);
      timer = undefined;
      dueAt = Infinity;
      pushNow({ keepalive: true }).catch(() => {});
    }
  }

  function handleOnline() {
    backoff = 0;
    schedule(0);
  }

  const unsubscribe = subscribeChanges(handleChange);
  document.addEventListener("visibilitychange", handleVisibility);
  window.addEventListener("online", handleOnline);
  schedule(0);

  return () => {
    stopped = true;
    clearTimeout(timer);
    unsubscribe();
    document.removeEventListener("visibilitychange", handleVisibility);
    window.removeEventListener("online", handleOnline);
  };
}
