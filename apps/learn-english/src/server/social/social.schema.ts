// Request and response shapes of the friends and notification routes (feature 031). No
// `server-only`: the browser's social client shares these types, messages and timings.
import { z } from "zod";

export const SOCIAL_MESSAGES = {
  invalidJson: "Dữ liệu gửi lên không đúng định dạng.",
  invalidBody: "Thông tin gửi lên không hợp lệ.",
  notFound: "Không tìm thấy người này.",
  self: "Bạn không thể kết bạn với chính mình.",
  tooMany: "Bạn đã gửi quá nhiều lời mời đang chờ.",
  gone: "Lời mời này không còn nữa.",
  throttled: "Bạn thao tác quá nhanh. Vui lòng đợi một phút rồi thử lại.",
  unavailable: "Bạn bè đang tạm nghỉ, bạn thử lại sau nhé.",
} as const;

/** How often each open tab checks in (and refreshes friends and the bell). */
export const PULSE_MS = 60_000;
/** A pulse rewrites the stored time only when it is older than this, so tabs share one write. */
export const PRESENCE_WRITE_MS = 45_000;
/** Seen within this window and not gone: online. Covers one missed pulse. */
export const ONLINE_WINDOW_MS = 150_000;
/** After a decline, the sender waits this long before asking again. */
export const DECLINE_COOLDOWN_MS = 7 * 24 * 60 * 60_000;
/** Requests a learner may have waiting for an answer at once. */
export const MAX_PENDING = 20;
export const NOTIFICATION_DAYS = 30;
export const NOTIFICATION_MAX_AGE_MS = NOTIFICATION_DAYS * 24 * 60 * 60_000;
export const NOTIFICATION_LIMIT = 50;

/** Better Auth ids are short random strings; anything far longer isn't one. */
const userId = z.string().min(1).max(64);

export const requestBodySchema = z.object({ userId });
export const respondBodySchema = z.object({ userId, accept: z.boolean() });
export const userIdSchema = userId;

export interface Friend {
  id: string;
  name: string;
  image: string | null;
  online: boolean;
  /** Epoch ms of the last contact; null if never seen since this feature shipped. */
  lastSeenAt: number | null;
}

export interface PulseResponse {
  /** Server time (epoch ms), so "N phút trước" doesn't depend on the device clock. */
  now: number;
  friends: Friend[];
  /** Ids the learner asked and is waiting on (or was declined by, for 7 days): "Đã gửi lời mời". */
  outgoing: string[];
  /** Ids waiting for the learner's answer: their card's "Kết bạn" accepts. */
  incoming: string[];
  unread: number;
}

export type NotificationKind = "friend_request" | "friend_added" | "friend_accepted";

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  actor: { id: string; name: string; image: string | null };
  createdAt: number;
  read: boolean;
  /** A friend request still waiting for an answer: show "Đồng ý" and "Từ chối". */
  pending: boolean;
}

export interface NotificationsResponse {
  now: number;
  items: NotificationItem[];
}

export type RequestState = "sent" | "friends";
export type RespondState = "friends" | "declined";
