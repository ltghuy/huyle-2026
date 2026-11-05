// When an Arena match ended, in the learner's own time zone (feature 025, AC-003):
// "20:14 hôm nay", "20:14 hôm qua", or "20:14 · 03/11/2026".

const TIME = new Intl.DateTimeFormat("vi-VN", { timeStyle: "short" });
const DATE = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

function dayStart(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function matchWhen(endedAt: number, now: number = Date.now()): string {
  const ended = new Date(endedAt);
  const time = TIME.format(ended);
  const today = dayStart(new Date(now));
  const day = dayStart(ended);
  if (day === today) return `${time} hôm nay`;
  // One calendar day back (not 24 h), so it holds across daylight-saving changes.
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === yesterday.getTime()) return `${time} hôm qua`;
  return `${time} · ${DATE.format(ended)}`;
}
