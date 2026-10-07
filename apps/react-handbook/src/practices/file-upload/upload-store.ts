import { useSyncExternalStore } from "react";

import { toast } from "@/practices/toast-notifications/toast-store";
import {
  DEFAULT_SETTINGS,
  MB,
  type FilesResponse,
  type UploadSettings,
} from "@/server/practices/file-upload/upload.schema";

import type { Picked } from "./collect-files";
import { DEFAULT_RULES, fingerprint, formatBytes, rejectReason, type Rules } from "./rules";
import {
  AbortedError,
  UploadHttpError,
  completeUpload,
  createUpload,
  deleteUpload,
  getSettings,
  getUpload,
  listFiles,
  putSettings,
  sendPiece,
} from "./upload-api";

// The upload engine: one module-level store, so uploads keep running while
// the learner visits other practices. Each file is sent in pieces at the
// offset the server confirms; a scheduler keeps at most `concurrency` files
// uploading.

export type UploadStatus =
  | "rejected"
  | "duplicate"
  | "queued"
  | "uploading"
  | "paused"
  | "waiting-network"
  | "verifying"
  | "done"
  | "failed"
  | "interrupted";

export type UploadItem = {
  id: string;
  name: string;
  /** Path inside a dropped folder. */
  path: string | null;
  size: number;
  type: string;
  fingerprint: string;
  status: UploadStatus;
  reason: string | null;
  uploadId: string | null;
  /** Bytes the server has confirmed. */
  confirmed: number;
  /** Bytes of the current piece sent but not yet confirmed. */
  inFlight: number;
  /** Bytes per second, smoothed over confirmed pieces. */
  speed: number | null;
  /** Seconds left, once a piece has been confirmed. */
  eta: number | null;
  /** Retry attempt for the current piece (0 = first try). */
  attempt: number;
  previewUrl: string | null;
  /** Queue order: lower goes first. */
  order: number;
  hasFile: boolean;
};

export type EngineSettings = {
  concurrency: number;
  pieceSize: number;
  rules: Rules;
};

export type UploadSnapshot = {
  items: UploadItem[];
  settings: EngineSettings;
  server: UploadSettings;
  stored: FilesResponse | null;
  online: boolean;
  /** Latest message for the status live region. */
  announcement: { id: number; text: string } | null;
};

const MAX_PIECE_ATTEMPTS = 12;
const PREVIEW_MAX_BYTES = 20 * MB;
const INTERRUPTED_KEY = "upload:interrupted";

const SERVER_SNAPSHOT: UploadSnapshot = {
  items: [],
  settings: { concurrency: 3, pieceSize: MB, rules: DEFAULT_RULES },
  server: DEFAULT_SETTINGS,
  stored: null,
  online: true,
  announcement: null,
};

/** Per-item state that never renders: the file, the request in flight, the checksum. */
type Runtime = {
  file: File | null;
  /** Bumped by pause/cancel/offline: a running loop with an older token stops. */
  token: number;
  abort: (() => void) | null;
  hash: Promise<string> | null;
};

let snapshot = SERVER_SNAPSHOT;
let started = false;
let nextId = 0;
let nextOrder = 0;
let announceId = 0;
const runtimes = new Map<string, Runtime>();
const listeners = new Set<() => void>();
let batch = { done: 0, failed: 0 };

function emit(changes: Partial<UploadSnapshot> = {}) {
  snapshot = { ...snapshot, ...changes };
  for (const listener of listeners) listener();
}

function getItem(id: string) {
  return snapshot.items.find((item) => item.id === id);
}

function update(id: string, changes: Partial<UploadItem>) {
  emit({ items: snapshot.items.map((item) => (item.id === id ? { ...item, ...changes } : item)) });
}

function announce(text: string) {
  emit({ announcement: { id: ++announceId, text } });
}

// --- interrupted uploads (survive a reload) -------------------------------------

type InterruptedRecord = Pick<UploadItem, "name" | "path" | "size" | "type" | "fingerprint" | "uploadId" | "confirmed">;

function saveInterrupted() {
  const records: InterruptedRecord[] = snapshot.items
    .filter((i) => i.uploadId && !["done", "rejected", "duplicate"].includes(i.status))
    .slice(0, 50)
    .map(({ name, path, size, type, fingerprint: fp, uploadId, confirmed }) => ({
      name, path, size, type, fingerprint: fp, uploadId, confirmed,
    }));
  try {
    if (records.length) localStorage.setItem(INTERRUPTED_KEY, JSON.stringify(records));
    else localStorage.removeItem(INTERRUPTED_KEY);
  } catch {
    // Storage unavailable: interrupted uploads just won't be offered after a reload.
  }
}

function loadInterrupted(): UploadItem[] {
  try {
    const records = JSON.parse(localStorage.getItem(INTERRUPTED_KEY) ?? "[]") as InterruptedRecord[];
    return records.map((r) => ({
      ...r,
      id: `u${++nextId}`,
      status: "interrupted",
      reason: "Add the same file again to resume",
      inFlight: 0,
      speed: null,
      eta: null,
      attempt: 0,
      previewUrl: null,
      order: ++nextOrder,
      hasFile: false,
    }));
  } catch {
    return [];
  }
}

// --- checksum ---------------------------------------------------------------------

let hashChain: Promise<unknown> = Promise.resolve();

/** SHA-256 of a file, one file at a time so many large files don't fill memory at once. */
function hashFile(file: File): Promise<string> {
  const result = hashChain.then(async () => {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  });
  hashChain = result.catch(() => {});
  return result;
}

// --- scheduler --------------------------------------------------------------------

function uploadingCount() {
  return snapshot.items.filter((i) => i.status === "uploading").length;
}

function pump() {
  if (!snapshot.online) return;
  const queued = snapshot.items
    .filter((i) => i.status === "queued")
    .sort((a, b) => a.order - b.order);
  let running = uploadingCount();
  for (const item of queued) {
    if (running >= snapshot.settings.concurrency) break;
    running++;
    void run(item.id);
  }
  if (running === 0 && !snapshot.items.some((i) => i.status === "queued" || i.status === "verifying")) reportBatch();
}

function reportBatch() {
  const { done, failed } = batch;
  if (done + failed === 0) return;
  batch = { done: 0, failed: 0 };
  const files = (n: number) => `${n} ${n === 1 ? "file" : "files"}`;
  if (failed === 0) toast.success(`${files(done)} uploaded`);
  else toast.warning(`${files(done)} uploaded, ${failed} failed`, { description: "Use Retry on the failed files." });
}

function backoff(attempt: number) {
  return Math.min(500 * 2 ** (attempt - 1), 8000) * (0.5 + Math.random() * 0.5);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Uploads one file until it's done, fails, or its token changes (pause/cancel/offline). */
async function run(id: string) {
  const runtime = runtimes.get(id);
  const start = getItem(id);
  if (!runtime?.file || !start) return;
  const token = ++runtime.token;
  const file = runtime.file;
  const live = () => runtime.token === token;
  update(id, { status: "uploading", reason: null, inFlight: 0, attempt: 0 });

  try {
    // Create the upload, or ask the server how much it already has.
    let uploadId = start.uploadId;
    let confirmed: number;
    if (uploadId) {
      try {
        confirmed = (await getUpload(uploadId)).offset;
      } catch (error) {
        if (!(error instanceof UploadHttpError) || error.status !== 404) throw error;
        uploadId = null;
        confirmed = 0;
      }
    }
    if (!uploadId) {
      const created = await createUpload({
        name: start.name, path: start.path, size: start.size, type: start.type, fingerprint: start.fingerprint,
      });
      uploadId = created.id;
      confirmed = created.offset;
    }
    if (!live()) return;
    update(id, { uploadId, confirmed: confirmed! });
    saveInterrupted();

    let attempt = 0;
    while (confirmed! < start.size) {
      // Concurrency was lowered: give the slot back between pieces.
      if (uploadingCount() > snapshot.settings.concurrency) {
        update(id, { status: "queued", inFlight: 0, order: Math.min(...snapshot.items.map((i) => i.order)) - 1 });
        return;
      }
      const offset = confirmed!;
      const piece = file.slice(offset, offset + snapshot.settings.pieceSize);
      const startedAt = performance.now();
      const request = sendPiece(uploadId, offset, piece, (sent) => live() && update(id, { inFlight: sent }));
      runtime.abort = request.abort;
      try {
        const result = await request.promise;
        if (!live()) return;
        confirmed = result.offset;
        attempt = 0;
        const item = getItem(id)!;
        const rate = piece.size / ((performance.now() - startedAt) / 1000);
        const speed = item.speed === null ? rate : item.speed * 0.5 + rate * 0.5;
        update(id, { confirmed, inFlight: 0, attempt: 0, speed, eta: (start.size - confirmed) / speed });
        saveInterrupted();
      } catch (error) {
        if (error instanceof AbortedError || !live()) return;
        if (!(error instanceof UploadHttpError)) throw error;
        if (error.status === 409 && error.offset !== undefined) {
          // The server is somewhere else (e.g. a lost response): continue from there.
          confirmed = error.offset;
          update(id, { confirmed, inFlight: 0 });
          continue;
        }
        if (!navigator.onLine) {
          update(id, { status: "waiting-network", inFlight: 0 });
          return;
        }
        if (error.temporary && attempt < MAX_PIECE_ATTEMPTS - 1) {
          attempt++;
          update(id, { inFlight: 0, attempt, reason: error.message });
          await sleep(backoff(attempt));
          if (!live()) return;
          continue;
        }
        if (error.status === 404) update(id, { uploadId: null });
        throw error;
      } finally {
        runtime.abort = null;
      }
    }

    update(id, { status: "verifying", inFlight: 0, eta: 0, reason: null });
    const sha256 = await (runtime.hash ??= hashFile(file));
    if (!live()) return;
    await completeUpload(uploadId, sha256);
    if (!live()) return;
    update(id, { status: "done", reason: null, eta: null });
    batch.done++;
    announce(`${start.name} uploaded`);
    saveInterrupted();
    void refreshStored();
  } catch (error) {
    if (!live()) return;
    const message =
      error instanceof UploadHttpError && error.status === 404
        ? "The server no longer has this upload; Retry starts over"
        : error instanceof Error
          ? error.message
          : "Upload failed";
    if (error instanceof UploadHttpError && error.status === 422) update(id, { uploadId: null });
    update(id, { status: "failed", reason: message, inFlight: 0, eta: null });
    batch.failed++;
    announce(`${start.name} failed: ${message}`);
    saveInterrupted();
  } finally {
    if (live()) pump();
  }
}

/** Stops a running upload: its loop sees the new token and its request is aborted. */
function stop(id: string) {
  const runtime = runtimes.get(id);
  if (!runtime) return;
  runtime.token++;
  runtime.abort?.();
  runtime.abort = null;
}

// --- adding files -----------------------------------------------------------------

function add(picked: Picked[]) {
  init();
  const { rules } = snapshot.settings;
  const items = [...snapshot.items];
  let accepted = 0;
  let rejected = 0;
  let resumed = 0;
  let active = items.filter((i) => !["rejected", "duplicate", "done"].includes(i.status)).length;

  for (const { file, path } of picked) {
    const fp = fingerprint(file);
    const interrupted = items.findIndex((i) => i.status === "interrupted" && i.fingerprint === fp);
    if (interrupted !== -1) {
      const item = items[interrupted];
      runtimes.set(item.id, { file, token: 0, abort: null, hash: null });
      items[interrupted] = { ...item, status: "queued", reason: null, hasFile: true, order: ++nextOrder, previewUrl: preview(file) };
      resumed++;
      continue;
    }
    const base = {
      id: `u${++nextId}`,
      name: file.name,
      path,
      size: file.size,
      type: file.type,
      fingerprint: fp,
      uploadId: null,
      confirmed: 0,
      inFlight: 0,
      speed: null,
      eta: null,
      attempt: 0,
      order: ++nextOrder,
    };
    const duplicate = items.some((i) => i.fingerprint === fp && i.status !== "rejected" && i.status !== "duplicate");
    const reason = duplicate
      ? "Already in the list"
      : active >= rules.maxFiles
        ? `Over the ${rules.maxFiles}-file limit`
        : rejectReason(file, rules);
    if (reason) {
      items.push({ ...base, status: duplicate ? "duplicate" : "rejected", reason, previewUrl: null, hasFile: false });
      rejected++;
      continue;
    }
    runtimes.set(base.id, { file, token: 0, abort: null, hash: null });
    items.push({ ...base, status: "queued", reason: null, previewUrl: preview(file), hasFile: true });
    active++;
    accepted++;
  }

  emit({ items });
  const parts = [`${accepted} ${accepted === 1 ? "file" : "files"} added`];
  if (resumed) parts.push(`${resumed} resumed`);
  if (rejected) parts.push(`${rejected} not added`);
  announce(parts.join(", "));
  pump();
}

function preview(file: File) {
  return file.type.startsWith("image/") && file.size <= PREVIEW_MAX_BYTES ? URL.createObjectURL(file) : null;
}

function release(item: UploadItem) {
  if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
  runtimes.delete(item.id);
}

function removeItems(predicate: (item: UploadItem) => boolean) {
  const removed = snapshot.items.filter(predicate);
  removed.forEach(release);
  emit({ items: snapshot.items.filter((i) => !predicate(i)) });
  saveInterrupted();
}

// --- lifecycle --------------------------------------------------------------------

async function refreshStored() {
  try {
    emit({ stored: await listFiles() });
  } catch {
    // Keep the last list; the next upload refreshes it.
  }
}

function handleOffline() {
  emit({ online: false });
  for (const item of snapshot.items) {
    if (item.status !== "uploading") continue;
    stop(item.id);
    update(item.id, { status: "waiting-network", inFlight: 0 });
  }
}

function handleOnline() {
  emit({ online: true });
  for (const item of snapshot.items) {
    if (item.status === "waiting-network") update(item.id, { status: "queued", order: item.order - nextOrder });
  }
  pump();
}

function init() {
  if (started) return;
  started = true;
  emit({ items: loadInterrupted(), online: navigator.onLine });
  window.addEventListener("offline", handleOffline);
  window.addEventListener("online", handleOnline);
  void refreshStored();
  getSettings().then((server) => emit({ server }), () => {});
}

// --- public API ---------------------------------------------------------------------

export const uploads = {
  init,
  add,

  pause(id: string) {
    const item = getItem(id);
    if (!item || !["uploading", "queued", "waiting-network"].includes(item.status)) return;
    stop(id);
    update(id, { status: "paused", inFlight: 0, eta: null });
    pump();
  },

  resume(id: string) {
    const item = getItem(id);
    if (!item || (item.status !== "paused" && item.status !== "failed")) return;
    update(id, { status: "queued", reason: null, order: ++nextOrder });
    pump();
  },

  retry(id: string) {
    uploads.resume(id);
  },

  cancel(id: string) {
    const item = getItem(id);
    if (!item) return;
    stop(id);
    if (item.uploadId && item.status !== "done") void deleteUpload(item.uploadId).catch(() => {});
    removeItems((i) => i.id === id);
    announce(`${item.name} cancelled`);
    pump();
  },

  /** Removes a finished, rejected or interrupted row without touching the server copy. */
  remove(id: string) {
    const item = getItem(id);
    if (!item || item.status === "uploading" || item.status === "verifying") return;
    if (item.status === "interrupted" && item.uploadId) void deleteUpload(item.uploadId).catch(() => {});
    removeItems((i) => i.id === id);
  },

  pauseAll() {
    for (const item of snapshot.items) {
      if (["uploading", "queued", "waiting-network"].includes(item.status)) uploads.pause(item.id);
    }
  },

  resumeAll() {
    for (const item of [...snapshot.items].sort((a, b) => a.order - b.order)) {
      if (item.status === "paused") uploads.resume(item.id);
    }
  },

  cancelAll() {
    for (const item of snapshot.items) {
      if (!["done", "rejected", "duplicate"].includes(item.status)) uploads.cancel(item.id);
    }
  },

  clearFinished() {
    removeItems((i) => i.status === "done" || i.status === "rejected" || i.status === "duplicate");
  },

  async deleteStored(id: string) {
    await deleteUpload(id);
    await refreshStored();
  },

  setEngine(changes: Partial<Omit<EngineSettings, "rules">>) {
    emit({ settings: { ...snapshot.settings, ...changes } });
    pump();
  },

  /** Rules apply on the client to files added afterwards, and on the server at creation. */
  async setRules(changes: Partial<Rules>) {
    const rules = { ...snapshot.settings.rules, ...changes };
    emit({ settings: { ...snapshot.settings, rules } });
    emit({ server: await putSettings({ maxSizeMB: rules.maxSizeMB, allowedKinds: rules.allowedKinds }) });
  },

  async setNetwork(changes: Partial<Pick<UploadSettings, "speedKBps" | "failRate">>) {
    emit({ server: await putSettings(changes) });
  },

  refreshStored,
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUploads(): UploadSnapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);
}

export { formatBytes };
