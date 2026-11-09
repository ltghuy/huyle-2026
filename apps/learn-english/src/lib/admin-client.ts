import type { ApiError } from "@/lib/http";
import {
  ADMIN_MESSAGES,
  type AdminClaimGroup,
  type AdminContentItem,
  type AdminContentRow,
  type AdminOverview,
  type ClaimDecision,
  type ContentListQuery,
  type OverviewRange,
  type SaveItemBody,
} from "@/server/admin/admin.schema";

// Browser side of the admin routes (feature 038). Failures become an AdminError with the
// route's Vietnamese message, its status, and, for an invalid item, the problems found.

export interface ItemIssue {
  path: string;
  message: string;
}

export class AdminError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: ItemIssue[] = [],
  ) {
    super(message);
  }
}

const OFFLINE = "Không kết nối được. Bạn kiểm tra mạng nhé.";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  } catch {
    throw new AdminError(OFFLINE, 0);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as ApiError | undefined;
    const issues = Array.isArray(body?.error.issues) ? (body.error.issues as ItemIssue[]).filter((issue) => typeof issue?.message === "string") : [];
    throw new AdminError(body?.error.message ?? ADMIN_MESSAGES.unavailable, response.status, issues);
  }
  return (await response.json()) as T;
}

function post<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

function search(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") query.set(key, String(value));
  const text = query.toString();
  return text ? `?${text}` : "";
}

export const fetchOverview = (range: OverviewRange) => request<AdminOverview>(`/api/admin/overview${search({ range })}`);
export const fetchClaimGroups = () => request<{ groups: AdminClaimGroup[] }>("/api/admin/claims");
export const decideClaimGroup = (decision: ClaimDecision) => post<{ changed: number }>("/api/admin/claims/decide", decision);
export const fetchContent = (query: Partial<ContentListQuery>) =>
  request<{ items: AdminContentRow[]; total: number; page: number }>(`/api/admin/content${search({ kind: query.kind, level: query.level, q: query.q, page: query.page })}`);
export const fetchContentItem = (id: string) => request<{ item: AdminContentItem }>(`/api/admin/content/item${search({ id })}`);
export const saveContentItem = (body: SaveItemBody) => post<{ item: AdminContentItem }>("/api/admin/content/item", body);
export const setContentRemoved = (id: string, removed: boolean) => post<{ ok: true }>("/api/admin/content/remove", { id, removed });
