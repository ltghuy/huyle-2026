import { DEFAULT_TIME_ZONE, type Attendance } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
export const DAILY_POINTS = 10;
const STREAK_BONUS: Record<number, number> = { 7: 20, 30: 30, 100: 100 };

const formatters = new Map<string, Intl.DateTimeFormat>();

/** The learner's local calendar date ("YYYY-MM-DD") for an instant. */
export function localDate(epochMs: number, timeZone: string = DEFAULT_TIME_ZONE): string {
  let fmt = formatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    formatters.set(timeZone, fmt);
  }
  const parts = Object.fromEntries(fmt.formatToParts(epochMs).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/** Points for today's lesson, given the streak length including today. */
export function pointsFor(streakAfterToday: number): { points: number; bonus: number } {
  return { points: DAILY_POINTS, bonus: STREAK_BONUS[streakAfterToday] ?? 0 };
}

function dayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY_MS);
}

/**
 * `current` counts consecutive days ending today, or yesterday when today's
 * lesson isn't done yet (a streak only breaks once a whole day is missed).
 */
export function streaks(dates: readonly string[], today: string): { current: number; longest: number } {
  const days = [...new Set(dates.map(dayNumber))].sort((a, b) => a - b);
  let longest = 0;
  let run = 0;
  for (let i = 0; i < days.length; i++) {
    run = i > 0 && days[i] === days[i - 1] + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
  }

  const attended = new Set(days);
  const t = dayNumber(today);
  let day = attended.has(t) ? t : t - 1;
  let current = 0;
  while (attended.has(day)) {
    current++;
    day--;
  }
  return { current, longest };
}

export function totalPoints(attendance: readonly Attendance[]): number {
  return attendance.reduce((sum, a) => sum + a.points + a.bonus, 0);
}
