// How long ago something happened, in Vietnamese (feature 031): a friend's last activity
// (AC-013) and a notification's arrival (AC-024). Days count calendar days in the learner's
// own time zone, like `matchWhen` (feature 025).

const DATE = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function daysBetween(then: number, now: number): number {
  const start = (time: number) => {
    const date = new Date(time);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };
  return Math.round((start(now).getTime() - start(then).getTime()) / (24 * HOUR));
}

/** "vừa xong", "5 phút trước", "3 giờ trước", "hôm qua", "4 ngày trước", or the date after a week. */
export function timeAgo(then: number, now: number): string {
  const elapsed = Math.max(0, now - then);
  if (elapsed < MINUTE) return "vừa xong";
  const days = daysBetween(then, now);
  if (days === 0 || elapsed < HOUR) {
    return elapsed < HOUR ? `${Math.floor(elapsed / MINUTE)} phút trước` : `${Math.floor(elapsed / HOUR)} giờ trước`;
  }
  if (days === 1) return "hôm qua";
  if (days <= 7) return `${days} ngày trước`;
  return DATE.format(new Date(then));
}

/** A friend's status line when offline (AC-013). */
export function lastActive(lastSeenAt: number | null, now: number): string {
  if (lastSeenAt === null) return "Chưa hoạt động gần đây";
  const ago = timeAgo(lastSeenAt, now);
  if (ago === "vừa xong") return "Vừa mới hoạt động";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(ago)) return `Hoạt động ngày ${ago}`;
  return `Hoạt động ${ago}`;
}
