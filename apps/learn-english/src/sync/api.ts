import type { GetProgressResponse, PutProgressResponse } from "@/server/progress/progress.schema";

// Thin fetch wrappers over /api/progress (the account, feature 022; sync codes went in feature 037).
// Every failure becomes a SyncError with a
// kind the caller can act on and a Vietnamese message the UI can show as is.

export type SyncErrorKind =
  | "not-found"
  | "throttled"
  | "offline"
  | "too-large"
  | "conflict"
  | "invalid-data"
  | "newer-version"
  | "unauthorized"
  | "server";

export const SYNC_ERROR_MESSAGES: Record<SyncErrorKind, string> = {
  "not-found": "Tài khoản chưa có tiến độ được lưu.",
  throttled: "Bạn thao tác quá nhanh. Vui lòng đợi một phút rồi thử lại.",
  offline: "Không kết nối được máy chủ. Bạn kiểm tra mạng rồi thử lại nhé.",
  "too-large": "Tiến độ quá lớn để đồng bộ. Bạn hãy dùng file sao lưu thay thế.",
  conflict: "Tiến độ đang được cập nhật từ thiết bị khác. Ứng dụng sẽ thử lại sau.",
  "invalid-data": "Dữ liệu đồng bộ bị hỏng hoặc không đọc được.",
  "newer-version": "Dữ liệu đồng bộ đến từ phiên bản mới hơn của ứng dụng. Bạn hãy tải lại trang rồi thử lại nhé.",
  unauthorized: "Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại để tiếp tục đồng bộ nhé.",
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

const ACCOUNT_ENDPOINT = "/api/progress";
const TIMEOUT_MS = 20_000;
/** Browsers refuse keepalive bodies over 64 KiB in total; keep a margin. */
export const KEEPALIVE_MAX_CHARS = 60_000;

interface RequestOptions {
  body?: unknown;
  keepalive?: boolean;
}

/** PUT 409: someone else wrote first; `rev` is the stored one. */
interface ConflictBody {
  rev?: unknown;
}

async function send(method: string, { body, keepalive }: RequestOptions = {}): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  let payload: string | undefined;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  let response: Response;
  try {
    response = await fetch(ACCOUNT_ENDPOINT, {
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
    case 401:
      return new SyncError("unauthorized");
    case 404:
      return new SyncError("not-found");
    case 409: {
      const body = (await response.json().catch(() => null)) as ConflictBody | null;
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

/** The signed-in account's progress (feature 022); 404 ("not-found") while the account has none. */
export async function getAccountRemote(): Promise<GetProgressResponse> {
  return (await (await send("GET")).json()) as GetProgressResponse;
}

/** `rev` 0 creates the account's first copy; `deviceId` and `countMe` feed the owner's usage counts. */
export async function putAccountRemote(
  rev: number,
  data: string,
  { deviceId, countMe, keepalive = false }: { deviceId: string; countMe: boolean; keepalive?: boolean },
): Promise<PutProgressResponse> {
  return (await (await send("PUT", { body: { rev, data, deviceId, countMe }, keepalive })).json()) as PutProgressResponse;
}
