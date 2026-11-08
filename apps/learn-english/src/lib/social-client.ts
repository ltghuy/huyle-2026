import type { ApiError } from "@/lib/http";
import {
  SOCIAL_MESSAGES,
  type NotificationsResponse,
  type PulseResponse,
  type RequestState,
  type RespondState,
} from "@/server/social/social.schema";

// Browser side of the friends and notification routes (feature 031). Each answers in
// Vietnamese on failure.

/** A failed friends request, with the Vietnamese message to show. */
export class SocialError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const OFFLINE = "Không kết nối được. Bạn kiểm tra mạng nhé.";

async function request(url: string, init?: RequestInit): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...init });
  } catch {
    throw new SocialError(OFFLINE, 0);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as ApiError | undefined;
    throw new SocialError(body?.error.message ?? SOCIAL_MESSAGES.unavailable, response.status);
  }
  return response;
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const init: RequestInit = body === undefined ? { method: "POST" } : { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
  const response = await request(url, init);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/** Checks in and reads friends, request ids and the unread count. */
export function pulse(): Promise<PulseResponse> {
  return post<PulseResponse>("/api/social/pulse");
}

/** The last tab's goodbye; fire and forget, safe during `pagehide`. */
export function sendLeave(): void {
  if (typeof navigator.sendBeacon === "function") navigator.sendBeacon("/api/social/leave");
}

export function sendFriendRequest(userId: string): Promise<{ state: RequestState }> {
  return post("/api/social/requests", { userId });
}

export function respondToRequest(userId: string, accept: boolean): Promise<{ state: RespondState }> {
  return post("/api/social/requests/respond", { userId, accept });
}

export function removeFriend(userId: string): Promise<void> {
  return post("/api/social/friends/remove", { userId });
}

export async function fetchNotifications(): Promise<NotificationsResponse> {
  return (await request("/api/social/notifications")).json() as Promise<NotificationsResponse>;
}

export function markNotificationsRead(): Promise<void> {
  return post("/api/social/notifications/read");
}
