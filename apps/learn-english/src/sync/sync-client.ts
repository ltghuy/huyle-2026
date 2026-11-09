import { localDate } from "@/learning/attendance";
import { mergeSnapshots } from "@/learning/merge";
import {
  base64ToBytes,
  buildSnapshot,
  bytesToBase64,
  decodeSnapshot,
  encodeSnapshot,
  progressSummary,
  type LearnerState,
  type ProgressSummary,
  type Snapshot,
  type SnapshotData,
} from "@/learning/snapshot";
import type { AccountLink, Profile } from "@/learning/types";
import { subscribeChanges } from "@/storage/broadcast";
import { getProfile, updateProfile } from "@/storage/meta";
import { readLearnerState, replaceAll } from "@/storage/replace";
import { getAccountRemote, isTransient, putAccountRemote, SyncError } from "./api";

// Browser side of sync (AC-047–AC-051). No React here.
//
// How a device knows it has something to upload: every successful sync
// stores a fingerprint (SHA-256 of the snapshot data) in localStorage, shared
// by the tabs of this browser. A push builds the snapshot and only uploads
// when its fingerprint differs. Change messages therefore only schedule a
// check, so the writes sync makes itself (replaceAll after a merge, the
// profile.sync bookkeeping) never cause an upload loop: they leave the
// fingerprint unchanged and the check ends without a request.
//
// The server copy is the signed-in account's (`/api/progress`, feature 022), with
// its bookkeeping in the device-only `profile.account`. Sync codes (`/api/sync`)
// were removed in feature 037. A `SyncTarget` says where the copy lives and
// where its bookkeeping goes.

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

/** This device's bookkeeping for one server copy. */
interface SyncMark {
  rev: number;
  lastSyncedAt?: number;
  dirty: boolean;
}

interface SyncTarget {
  /** Scopes the stored fingerprint, so two accounts on one browser never share one. */
  key: string;
  read(profile: Profile | undefined): SyncMark | undefined;
  /** The profile with `mark` recorded, for the merged state written by `replaceAll`. */
  apply(profile: Profile, mark: SyncMark): Profile;
  save(mark: SyncMark, now: number): Promise<void>;
  get(): Promise<{ rev: number; data: string; updatedAt: number }>;
  put(rev: number, data: string, profile: Profile, keepalive: boolean): Promise<{ rev: number }>;
}

function accountTarget(userId: string): SyncTarget {
  const linked = (profile: Profile | undefined) => (profile?.account?.userId === userId ? profile.account : undefined);
  return {
    key: `account:${userId}`,
    read: (profile) => {
      const account = linked(profile);
      return account ? { rev: account.rev ?? 0, lastSyncedAt: account.lastSyncedAt, dirty: account.dirty ?? false } : undefined;
    },
    apply: (profile, mark) => {
      const account = linked(profile);
      return account ? { ...profile, account: { ...account, ...mark } } : profile;
    },
    async save(mark, now) {
      const account = linked(await getProfile());
      if (!account) return; // signed out meanwhile
      // The first copy that matches this device's progress completes the move (AC-018).
      const linkedAt = account.linkedAt ?? (mark.dirty ? undefined : now);
      await updateProfile({ account: { ...account, ...mark, linkedAt } }, now);
    },
    get: () => getAccountRemote(),
    put: (rev, data, profile, keepalive) => putAccountRemote(rev, data, { deviceId: profile.deviceId, countMe: !profile.statsOptOut, keepalive }),
  };
}

/** Where this device syncs to now: the signed-in account, else nowhere. */
function activeTarget(profile: Profile | undefined): SyncTarget | null {
  if (profile?.account && !profile.account.expired) return accountTarget(profile.account.userId);
  return null;
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

async function fetchRemote(target: SyncTarget): Promise<Remote> {
  const { rev, data, updatedAt } = await target.get();
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

async function markDirty(target: SyncTarget, now: number): Promise<void> {
  const current = target.read(await getProfile());
  if (current && !current.dirty) await target.save({ ...current, dirty: true }, now);
}

/**
 * Brings this device and the server row in line. With `remote`, its data is
 * merged into local progress first; then the local snapshot is uploaded with
 * the matching rev. A 409 fetches the newer row, merges and tries again.
 */
async function reconcile(target: SyncTarget, startRev: number, firstRemote: Remote | undefined, keepalive = false): Promise<void> {
  let remote = firstRemote;
  let rev = startRev;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const now = Date.now();
    // Read and replace back to back, so the window for a change made in
    // between (which replaceAll would overwrite) stays a few milliseconds.
    let state = await readLearnerState(now);
    const lastSyncedAt = target.read(state.profile)?.lastSyncedAt;
    let remoteFingerprint: string | undefined;
    if (remote) {
      rev = remote.rev;
      state = mergeSnapshots(state, remote.snapshot.data);
      state.profile = target.apply(state.profile, { rev, lastSyncedAt, dirty: true });
      await replaceAll(state);
      remoteFingerprint = await fingerprint(remote.snapshot.data);
    }

    const local = await encode(state, now);
    // A server copy exists (rev > 0) and holds exactly this: nothing to send.
    if (local.fingerprint === remoteFingerprint || (!remote && rev > 0 && local.fingerprint === readFingerprint(target.key))) {
      await target.save({ rev, lastSyncedAt: now, dirty: false }, now);
      writeFingerprint(target.key, local.fingerprint);
      return;
    }

    try {
      const result = await target.put(rev, local.base64, state.profile, keepalive);
      await target.save({ rev: result.rev, lastSyncedAt: Date.now(), dirty: false }, now);
      writeFingerprint(target.key, local.fingerprint);
      return;
    } catch (error) {
      if (!(error instanceof SyncError && error.kind === "conflict")) {
        await markDirty(target, now);
        throw error;
      }
      remote = await fetchRemote(target);
    }
  }
  await markDirty(target, Date.now());
  throw new SyncError("conflict");
}

/** After a failed step: a session that ended marks the account expired, so the learner is asked to sign in again (AC-006). */
async function handleFailure(error: unknown, target: SyncTarget): Promise<never> {
  if (error instanceof SyncError) {
    const profile = await getProfile();
    if (error.kind === "unauthorized" && profile?.account && target.key === `account:${profile.account.userId}`) {
      await updateProfile({ account: { ...profile.account, expired: true } }, Date.now());
    }
  }
  throw error;
}

// ---------------------------------------------------------------------------
// Public API

/**
 * Uploads local changes if there are any (409 → fetch, merge, apply, retry).
 * On a network error the device stays dirty and the error is rethrown.
 * Resolves true when something was checked against the server.
 */
export function pushNow({ keepalive = false }: { keepalive?: boolean } = {}): Promise<boolean> {
  return withLock(async () => {
    const profile = await getProfile();
    const target = activeTarget(profile);
    const mark = target?.read(profile);
    if (!target || !mark) return false;
    await reconcile(target, mark.rev, undefined, keepalive).catch((error: unknown) => handleFailure(error, target));
    return true;
  });
}

/** Pushes local changes, or, when there are none, pulls and applies newer progress from other devices. */
export function syncNow(): Promise<void> {
  return withLock(async () => {
    const profile = await getProfile();
    const target = activeTarget(profile);
    const mark = target?.read(profile);
    if (!target || !mark) return;
    try {
      const now = Date.now();
      const current = await stateFingerprint(await readLearnerState(now), now);
      if (mark.dirty || mark.rev === 0 || current !== readFingerprint(target.key)) {
        await reconcile(target, mark.rev, undefined);
        return;
      }
      const remote = await fetchRemote(target);
      if (remote.rev !== mark.rev) await reconcile(target, remote.rev, remote);
    } catch (error) {
      await handleFailure(error, target);
    }
  });
}

/** The account as the session reports it (feature 022). */
export type AccountIdentity = Pick<AccountLink, "userId" | "name" | "email" | "image">;

/**
 * Records `account` on this device and brings its progress into the account (feature 022, AC-014,
 * AC-015, AC-018): uploads it as the first copy when the account has none, otherwise merges the
 * account's copy in and uploads the merge. Safe to repeat until it succeeds: merging is a union, so
 * nothing is counted twice. Resolves to what the progress now amounts to, for the message.
 */
export function linkAccount(account: AccountIdentity): Promise<ProgressSummary> {
  return withLock(async () => {
    const now = Date.now();
    const profile = await getProfile();
    const current = profile?.account?.userId === account.userId ? profile.account : undefined;
    await updateProfile({ account: { ...current, ...account, expired: false, rev: current?.rev ?? 0, dirty: current?.dirty ?? true } }, now);
    const target = accountTarget(account.userId);
    try {
      let remote: Remote | undefined;
      try {
        remote = await fetchRemote(target);
      } catch (error) {
        if (!(error instanceof SyncError && error.kind === "not-found")) throw error;
      }
      await reconcile(target, remote?.rev ?? 0, remote);
    } catch (error) {
      await handleFailure(error, target);
    }
    const state = await readLearnerState(Date.now());
    return progressSummary(state, localDate(Date.now(), state.profile.timeZone));
  });
}

/** Whether this device's progress has reached the account at least once (AC-018). */
export function isAccountLinked(profile: Profile | undefined): boolean {
  return profile?.account?.linkedAt !== undefined;
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
      if (!activeTarget(await getProfile())) return;
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
