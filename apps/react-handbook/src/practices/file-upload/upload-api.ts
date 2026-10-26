import type {
  FilesResponse,
  StoredFile,
  UploadInfo,
  UploadSettings,
} from "@/server/practices/file-upload/upload.schema";

const BASE = "/api/practices/file-upload";
const PIECE_TIMEOUT_MS = 60_000;

/** A failed request; `offset` is set when the server says where it really is (409). */
export class UploadHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly offset?: number,
  ) {
    super(message);
  }
  /** Worth retrying the same request after a pause. */
  get temporary() {
    return this.status === 0 || this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

export class AbortedError extends Error {}

async function readJson<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new UploadHttpError(res.status, json?.error?.message ?? `HTTP ${res.status}`, json?.offset);
  return json.data as T;
}

function sendJson(path: string, method: string, body?: unknown) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export async function createUpload(body: {
  name: string;
  path: string | null;
  size: number;
  type: string;
  fingerprint: string;
}) {
  return readJson<UploadInfo>(await sendJson("/uploads", "POST", body));
}

export async function getUpload(id: string) {
  return readJson<UploadInfo>(await fetch(`${BASE}/uploads/${id}`, { cache: "no-store" }));
}

export async function completeUpload(id: string, sha256: string) {
  return readJson<StoredFile>(await sendJson(`/uploads/${id}/complete`, "POST", { sha256 }));
}

export async function deleteUpload(id: string) {
  const res = await sendJson(`/uploads/${id}`, "DELETE");
  if (!res.ok && res.status !== 404) await readJson(res);
}

export async function listFiles() {
  return readJson<FilesResponse>(await fetch(`${BASE}/files`, { cache: "no-store" }));
}

export async function getSettings() {
  return readJson<UploadSettings>(await fetch(`${BASE}/settings`, { cache: "no-store" }));
}

export async function putSettings(changes: Partial<UploadSettings>) {
  return readJson<UploadSettings>(await sendJson("/settings", "PUT", changes));
}

/**
 * Sends one piece with XMLHttpRequest: fetch() has no upload progress events.
 * `onProgress` reports bytes handed to the network (not yet confirmed).
 */
export function sendPiece(id: string, offset: number, piece: Blob, onProgress: (sent: number) => void) {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<UploadInfo>((resolve, reject) => {
    xhr.open("PUT", `${BASE}/uploads/${id}?offset=${offset}`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.timeout = PIECE_TIMEOUT_MS;
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      let json: { data?: UploadInfo; error?: { message?: string }; offset?: number } | null = null;
      try {
        json = JSON.parse(xhr.responseText);
      } catch {
        // Non-JSON body: handled by the status below.
      }
      if (xhr.status >= 200 && xhr.status < 300 && json?.data) return resolve(json.data);
      reject(new UploadHttpError(xhr.status, json?.error?.message ?? `HTTP ${xhr.status}`, json?.offset));
    };
    xhr.onerror = () => reject(new UploadHttpError(0, "Network error"));
    xhr.ontimeout = () => reject(new UploadHttpError(408, "The server took too long to answer"));
    xhr.onabort = () => reject(new AbortedError("Aborted"));
    xhr.send(piece);
  });
  return { promise, abort: () => xhr.abort() };
}
