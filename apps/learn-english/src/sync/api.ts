import {
  SYNC_CODE_HEADER,
  type CreateSyncResponse,
  type GetSyncResponse,
  type SyncConflictResponse,
  type UpdateSyncResponse,
} from "@/server/sync/sync.schema";

// Thin fetch wrappers over /api/sync. Every failure becomes a SyncError with a
// kind the caller can act on and a Vietnamese message the UI can show as is.

export type SyncErrorKind =
  | "invalid-code"
  | "not-found"
  | "throttled"
  | "offline"
  | "too-large"
  | "conflict"
  | "invalid-data"
  | "newer-version"
  | "server";

export const SYNC_ERROR_MESSAGES: Record<SyncErrorKind, string> = {
  "invalid-code": "Mã đồng bộ không đúng định dạng. Mã gồm 12 ký tự, dạng XXXX-XXXX-XXXX.",
  "not-found": "Không tìm thấy mã đồng bộ này. Bạn kiểm tra lại mã nhé.",
  throttled: "Bạn đã nhập sai mã quá nhiều lần. Vui lòng đợi một phút rồi thử lại.",
  offline: "Không kết nối được máy chủ. Bạn kiểm tra mạng rồi thử lại nhé.",
  "too-large": "Tiến độ quá lớn để đồng bộ. Bạn hãy dùng file sao lưu thay thế.",
  conflict: "Tiến độ đang được cập nhật từ thiết bị khác. Ứng dụng sẽ thử lại sau.",
  "invalid-data": "Dữ liệu đồng bộ bị hỏng hoặc không đọc được.",
  "newer-version": "Dữ liệu đồng bộ đến từ phiên bản mới hơn của ứng dụng. Bạn hãy tải lại trang rồi thử lại nhé.",
  server: "Máy chủ đồng bộ đang gặp sự cố. Bạn thử lại sau nhé.",
};

export class SyncError extends Error {
  readonly kind: SyncErrorKind;
  /** The stored rev, for a conflict. */
  readonly rev?: number;

  constructor(kind: SyncErrorKind, options?: { rev?: number; cause?: unknown }) {
    super(SYNC_ERROR_MESSAGES[kind], { cause: options?.cause });
    this.name = "SyncError";
    this.kind = kind;
    this.rev = options?.rev;
  }
}

/** Kinds worth retrying later without the learner doing anything. */
export function isTransient(error: unknown): boolean {
  return error instanceof SyncError && ["offline", "server", "throttled", "conflict"].includes(error.kind);
}

const ENDPOINT = "/api/sync";
const TIMEOUT_MS = 20_000;
/** Browsers refuse keepalive bodies over 64 KiB in total; keep a margin. */
export const KEEPALIVE_MAX_CHARS = 60_000;

interface RequestOptions {
  code?: string;
  body?: unknown;
  keepalive?: boolean;
}

async function send(method: string, { code, body, keepalive }: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (code) headers[SYNC_CODE_HEADER] = code;
  let payload: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method,
      headers,
      body: payload,
      cache: "no-store",
      keepalive: keepalive === true && (payload?.length ?? 0) <= KEEPALIVE_MAX_CHARS,
      signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(TIMEOUT_MS) : undefined,
    });
  } catch (cause) {
    throw new SyncError("offline", { cause });
  }
  if (response.ok) return response;
  throw await toError(response);
}

async function toError(response: Response): Promise<SyncError> {
  switch (response.status) {
    case 400:
      return new SyncError("invalid-code");
    case 404:
      return new SyncError("not-found");
    case 409: {
      const body = (await response.json().catch(() => null)) as Partial<SyncConflictResponse> | null;
      return new SyncError("conflict", { rev: typeof body?.rev === "number" ? body.rev : undefined });
    }
    case 413:
      return new SyncError("too-large");
    case 429:
      return new SyncError("throttled");
    default:
      return new SyncError("server", { cause: response.status });
  }
}

export async function createRemote(data: string): Promise<CreateSyncResponse> {
  return (await (await send("POST", { body: { data } })).json()) as CreateSyncResponse;
}

export async function getRemote(code: string): Promise<GetSyncResponse> {
  return (await (await send("GET", { code })).json()) as GetSyncResponse;
}

export async function putRemote(
  code: string,
  rev: number,
  data: string,
  { keepalive = false }: { keepalive?: boolean } = {},
): Promise<UpdateSyncResponse> {
  return (await (await send("PUT", { code, body: { rev, data }, keepalive })).json()) as UpdateSyncResponse;
}

export async function deleteRemote(code: string): Promise<void> {
  await send("DELETE", { code });
}
