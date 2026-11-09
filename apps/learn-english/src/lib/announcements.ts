// App announcements for the "Hệ thống" tab of the bell (feature 034). They
// ship with the app, newest first; an announcement's id never changes once
// released. Which ones were read is kept per device in localStorage (memory
// when storage is blocked) and cleared on sign-out by `clearDevice`.

export const ANNOUNCEMENTS_SEEN_KEY = "learn-english:announcements-seen";

export interface Announcement {
  id: string;
  /** When it was published (ms). */
  publishedAt: number;
  title: string;
  body: string;
  /** What the announcement is about; the bell picks the call to action from it. */
  topic: "ai-grading";
}

export const ANNOUNCEMENTS: readonly Announcement[] = [
  {
    id: "2026-11-ai-grading",
    publishedAt: Date.UTC(2026, 10, 9, 3),
    title: "Mới: chấm bài “Dịch câu” bằng AI",
    body: "Viết khác đáp án mà vẫn đúng nghĩa? Thêm khóa API miễn phí của Google AI Studio để AI chấm câu dịch của bạn theo nghĩa và giải thích chỗ sai bằng tiếng Việt. Khóa chỉ lưu trên thiết bị của bạn.",
    topic: "ai-grading",
  },
];

const EMPTY = "";
let memory = EMPTY;
const listeners = new Set<() => void>();

/** The read ids as one string (stable for `useSyncExternalStore`). */
export function getSeenAnnouncements(): string {
  try {
    return localStorage.getItem(ANNOUNCEMENTS_SEEN_KEY) ?? memory;
  } catch {
    return memory;
  }
}

export function getServerSeenAnnouncements(): string {
  // Before hydration nothing counts as unread, so the server and first paint agree.
  return ANNOUNCEMENTS.map((announcement) => announcement.id).join(",");
}

export function unseenIds(seen: string, announcements: readonly Announcement[] = ANNOUNCEMENTS): string[] {
  const read = new Set(seen.split(",").filter(Boolean));
  return announcements.filter((announcement) => !read.has(announcement.id)).map((announcement) => announcement.id);
}

/** Counts every current announcement as read on this device (AC-009). */
export function markAnnouncementsSeen() {
  const ids = ANNOUNCEMENTS.map((announcement) => announcement.id).join(",");
  if (getSeenAnnouncements() === ids) return;
  memory = ids;
  try {
    localStorage.setItem(ANNOUNCEMENTS_SEEN_KEY, ids);
  } catch {
    // Blocked storage: read for this visit only.
  }
  for (const listener of listeners) listener();
}

/** For `useSyncExternalStore`. */
export function subscribeAnnouncements(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Test only. */
export function resetAnnouncementsForTest() {
  memory = EMPTY;
  listeners.clear();
}
