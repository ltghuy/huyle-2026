import "server-only";

import { createHash, randomUUID } from "node:crypto";

import {
  DEFAULT_SETTINGS,
  KIND_RULES,
  MAX_PIECE,
  MB,
  STORAGE_LIMIT,
  kindOf,
  type CreateBody,
  type FilesResponse,
  type StoredFile,
  type UploadInfo,
  type UploadSettings,
} from "./upload.schema";

// Resumable uploads: the client creates an upload, sends pieces at the offset
// the server confirms, then completes with a checksum. State and the uploaded
// bytes live on globalThis so dev reloads and every route module share them.
// Bytes are held in memory (not on a filesystem) because this runs on
// Cloudflare Workers, which have no disk; the stored total is capped by
// STORAGE_LIMIT and the oldest files are evicted first. Note: on Workers the
// state is per-isolate, so a multi-request upload only resumes while its
// requests land on the same isolate.

type Session = {
  id: string;
  name: string;
  path: string | null;
  size: number;
  type: string;
  fingerprint: string;
  /** Bytes stored so far: the confirmed offset. */
  offset: number;
  /** The confirmed bytes, one entry per stored piece. */
  data: Uint8Array[];
  status: "uploading" | "complete";
  /** A piece is being received. */
  busy: boolean;
  /** Bumped by each piece request: a newer request supersedes an abandoned one. */
  ticket: number;
  sha256: string | null;
  verified: boolean;
  updatedAt: number;
  completedAt: string | null;
};

type State = {
  sessions: Map<string, Session>;
  settings: UploadSettings;
  /** Shared bandwidth: when the "network" is next free (epoch ms). */
  nextFree: number;
};

export class UploadError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly offset?: number,
  ) {
    super(message);
  }
}

function init(): State {
  return { sessions: new Map(), settings: { ...DEFAULT_SETTINGS }, nextFree: 0 };
}

const globalUploads = globalThis as typeof globalThis & { __uploads?: State };
const state = (globalUploads.__uploads ??= init());

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function info(session: Session): UploadInfo {
  return { id: session.id, offset: session.offset, size: session.size, status: session.status };
}

function get(id: string) {
  const session = state.sessions.get(id);
  if (!session) throw new UploadError(404, "Upload not found (it may have been removed)");
  return session;
}

// --- settings -------------------------------------------------------------------

export function getSettings(): UploadSettings {
  return state.settings;
}

export function updateSettings(changes: Partial<UploadSettings>) {
  state.settings = { ...state.settings, ...changes };
  return state.settings;
}

// --- uploads --------------------------------------------------------------------

/** Re-checks the rules; resumes an unfinished upload of the same file (by fingerprint). */
export async function createUpload(body: CreateBody): Promise<{ upload: UploadInfo; resumed: boolean }> {
  const { settings } = state;
  const kind = kindOf(body.name, body.type);
  if (!kind || !settings.allowedKinds.includes(kind)) {
    const allowed = settings.allowedKinds.map((k) => KIND_RULES[k].label).join(", ");
    throw new UploadError(422, `File type not allowed (allowed: ${allowed})`);
  }
  if (body.size === 0) throw new UploadError(422, "File is empty");
  if (body.size > settings.maxSizeMB * MB) {
    throw new UploadError(422, `File is larger than ${settings.maxSizeMB} MB`);
  }

  for (const session of state.sessions.values()) {
    if (session.status === "uploading" && session.fingerprint === body.fingerprint) {
      return { upload: info(session), resumed: true };
    }
  }

  const session: Session = {
    id: randomUUID(),
    name: body.name,
    path: body.path ?? null,
    size: body.size,
    type: body.type,
    fingerprint: body.fingerprint,
    offset: 0,
    data: [],
    status: "uploading",
    busy: false,
    ticket: 0,
    sha256: null,
    verified: false,
    updatedAt: Date.now(),
    completedAt: null,
  };
  state.sessions.set(session.id, session);
  return { upload: info(session), resumed: false };
}

export async function getUpload(id: string) {
  return info(get(id));
}

/** Waits until the shared "network" can carry `bytes` more at the configured speed. */
async function throttle(bytes: number, signal: AbortSignal) {
  const { speedKBps } = state.settings;
  if (speedKBps === null) return;
  const now = Date.now();
  const start = Math.max(now, state.nextFree);
  state.nextFree = start + (bytes / (speedKBps * 1024)) * 1000;
  const wait = state.nextFree - now;
  if (wait > 0 && !signal.aborted) await sleep(wait);
}

/**
 * Appends one piece at `offset`. The body is read chunk by chunk under the
 * throttle (real backpressure on the sender) and only stored when complete.
 */
export async function appendPiece(
  id: string,
  offset: number,
  declaredLength: number,
  body: ReadableStream<Uint8Array> | null,
  signal: AbortSignal,
): Promise<UploadInfo> {
  const session = get(id);
  if (session.status !== "uploading") throw new UploadError(409, "Upload already complete", session.offset);
  if (offset !== session.offset) throw new UploadError(409, "Offset mismatch", session.offset);
  if (!body || declaredLength <= 0) throw new UploadError(400, "Empty piece");
  if (declaredLength > MAX_PIECE || offset + declaredLength > session.size) {
    throw new UploadError(413, "Piece too large");
  }

  const fail = Math.random() < state.settings.failRate;
  const failAt = Math.floor(declaredLength / 2);
  // A client that paused and resumed may send the next request before this
  // server notices the old one was abandoned: the newest request wins.
  const ticket = ++session.ticket;
  const current = () => session.ticket === ticket && !signal.aborted;
  session.busy = true;
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    const reader = body.getReader();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > declaredLength) throw new UploadError(413, "Piece larger than declared");
      chunks.push(value);
      await throttle(value.byteLength, signal);
      if (!current()) {
        await reader.cancel().catch(() => {});
        throw new UploadError(409, "Piece superseded by a newer request", session.offset);
      }
      if (fail && received >= failAt) {
        // Simulated mid-transfer failure: nothing from this piece is stored.
        await reader.cancel().catch(() => {});
        throw new UploadError(503, "Simulated network failure");
      }
    }
    if (received !== declaredLength) throw new UploadError(400, "Piece incomplete");
    // The upload may have been cancelled, or another piece stored, while this one was arriving.
    if (state.sessions.get(id) !== session) throw new UploadError(404, "Upload not found (it was cancelled)");
    if (!current() || offset !== session.offset) throw new UploadError(409, "Offset mismatch", session.offset);
    session.data.push(Buffer.concat(chunks));
    session.offset += received;
    session.updatedAt = Date.now();
    await enforceLimit(id);
    return info(session);
  } finally {
    if (session.ticket === ticket) session.busy = false;
  }
}

function hashSession(session: Session) {
  const hash = createHash("sha256");
  for (const chunk of session.data) hash.update(chunk);
  return hash.digest("hex");
}

/** Verifies the checksum; a mismatch deletes the upload. */
export async function completeUpload(id: string, sha256: string): Promise<StoredFile> {
  const session = get(id);
  if (session.status === "complete") return stored(session);
  if (session.offset !== session.size) {
    throw new UploadError(409, "Not all bytes have been received", session.offset);
  }
  const actual = hashSession(session);
  if (actual !== sha256) {
    await deleteUpload(id);
    throw new UploadError(422, "Checksum mismatch: the file changed during upload");
  }
  session.status = "complete";
  session.sha256 = actual;
  session.verified = true;
  session.completedAt = new Date().toISOString();
  await enforceLimit(id);
  return stored(session);
}

export async function deleteUpload(id: string) {
  const session = get(id);
  state.sessions.delete(id);
  // Drop the bytes so they can be garbage-collected.
  session.data = [];
}

function stored(session: Session): StoredFile {
  return {
    id: session.id,
    name: session.name,
    path: session.path,
    size: session.size,
    type: session.type,
    sha256: session.sha256 ?? "",
    verified: session.verified,
    completedAt: session.completedAt ?? new Date(session.updatedAt).toISOString(),
  };
}

function usedBytes() {
  let used = 0;
  for (const s of state.sessions.values()) used += s.status === "complete" ? s.size : s.offset;
  return used;
}

/** Keeps total storage under the limit: oldest stored files first, then oldest idle partials. */
async function enforceLimit(keepId: string) {
  const candidates = [...state.sessions.values()]
    .filter((s) => s.id !== keepId && !s.busy)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "complete" ? -1 : 1;
      return a.updatedAt - b.updatedAt;
    });
  for (const session of candidates) {
    if (usedBytes() <= STORAGE_LIMIT) break;
    await deleteUpload(session.id);
  }
}

export async function listFiles(): Promise<FilesResponse> {
  const files = [...state.sessions.values()]
    .filter((s) => s.status === "complete")
    .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
    .map(stored);
  return { files, usedBytes: usedBytes(), limitBytes: STORAGE_LIMIT };
}
