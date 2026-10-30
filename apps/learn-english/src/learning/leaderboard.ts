// Rules of the leaderboard (feature 007, ranked by streak since feature 013):
// the numbers a learner sends after a daily lesson, what the server accepts,
// which names may be shown, and how rows move when the learner climbs. Pure:
// no storage, React or fetch. The server checks names with the same
// `checkBoardName`.
import { DAILY_POINTS, streaks, totalPoints } from "./attendance";
import { cleanName, NAME_MAX_LENGTH } from "./name";
import type { Attendance } from "./types";

const DAY_MS = 86_400_000;

/** The app's first day: no streak can have started before it. */
export const BOARD_EPOCH = "2026-10-26";

/** Places shown above and below the learner on the board. */
export const BOARD_NEIGHBOURS = 3;

/** More than every streak bonus (20 + 30 + 100): the room the server allows on top of the daily points. */
export const BONUS_ALLOWANCE = 150;

function utcDay(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from `from` to `to` ("YYYY-MM-DD"); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcDay(to) - utcDay(from)) / DAY_MS);
}

/** The day before `date`. */
export function previousDay(date: string): string {
  return new Date(utcDay(date) - DAY_MS).toISOString().slice(0, 10);
}

/** Longest streak and most points anyone can have by `lastDate`; the server refuses more. */
export function boardLimits(lastDate: string): { streak: number; earned: number } {
  const days = Math.max(0, daysBetween(BOARD_EPOCH, lastDate) + 1);
  return { streak: days, earned: days * DAILY_POINTS + BONUS_ALLOWANCE };
}

/** What the board ranks by, now and before today's lesson: current streak, then points ever earned. */
export interface BoardNumbers {
  /** The learner's last daily lesson ("" when there is none). */
  lastDate: string;
  streak: number;
  earned: number;
  previousStreak: number;
  previousEarned: number;
}

/** The learner's board numbers on `today`, from attendance in their time zone. */
export function boardNumbers(attendance: readonly Attendance[], today: string): BoardNumbers {
  const upToToday = attendance.filter((row) => row.date <= today);
  const before = upToToday.filter((row) => row.date !== today);
  const dates = upToToday.map((row) => row.date);
  return {
    lastDate: dates.reduce((last, date) => (date > last ? date : last), ""),
    streak: streaks(dates, today).current,
    earned: totalPoints(upToToday),
    previousStreak: streaks(before.map((row) => row.date), today).current,
    previousEarned: totalPoints(before),
  };
}

export const BOARD_NAME_ERRORS = {
  rules: `Bạn nhập tên của mình nhé (tối đa ${NAME_MAX_LENGTH} ký tự).`,
  blocked: "Tên này không dùng được trên bảng xếp hạng. Bạn chọn tên khác nhé.",
} as const;

// Slurs and profanity kept off the board. Whole words match; the English
// stems below also match inside a word ("fuckyou"). A short list on purpose:
// it stops the obvious cases, not impersonation.
const BLOCKED_WORDS = new Set([
  "địt",
  "đụ",
  "lồn",
  "cặc",
  "buồi",
  "đĩ",
  "đéo",
  "đcm",
  "đmm",
  "vcl",
  "clm",
  "shit",
  "bitch",
  "dick",
  "pussy",
  "slut",
  "whore",
  "bastard",
  "asshole",
]);
const BLOCKED_STEMS = ["fuck", "cunt", "nigg", "fagg", "retard"];

function isBlocked(name: string): boolean {
  const lower = name.normalize("NFC").toLocaleLowerCase("vi");
  if (BLOCKED_STEMS.some((stem) => lower.includes(stem))) return true;
  return lower.split(/[^\p{L}\p{N}]+/u).some((word) => BLOCKED_WORDS.has(word));
}

/** The name as shown on the board, or the Vietnamese reason it can't be used. */
export function checkBoardName(raw: string): { ok: true; name: string } | { ok: false; message: string } {
  const name = cleanName(raw);
  if (!name) return { ok: false, message: BOARD_NAME_ERRORS.rules };
  if (isBlocked(name)) return { ok: false, message: BOARD_NAME_ERRORS.blocked };
  return { ok: true, name };
}

export interface BoardRow {
  position: number;
  name: string;
  streak: number;
  /** Points ever earned: breaks ties between equal streaks. */
  earned: number;
  me: boolean;
}

/** True when (streak, earned) `a` ranks above `b`. */
export function ranksAbove(a: Pick<BoardRow, "streak" | "earned">, b: Pick<BoardRow, "streak" | "earned">): boolean {
  return a.streak > b.streak || (a.streak === b.streak && a.earned > b.earned);
}

/**
 * Where each row starts before sliding to its place, in row heights (0 = no
 * move): the learner starts below the rows they just overtook, and those rows
 * start one place higher. Overtaken = shown below the learner now, but ranked
 * above where the learner was before this lesson.
 */
export function slideOffsets(rows: readonly BoardRow[], previous: Pick<BoardRow, "streak" | "earned">): number[] {
  const meIndex = rows.findIndex((row) => row.me);
  if (meIndex === -1) return rows.map(() => 0);
  const passed = rows.map((row, i) => i > meIndex && ranksAbove(row, previous));
  const count = passed.filter(Boolean).length;
  return rows.map((row, i) => (row.me ? count : passed[i] ? -1 : 0));
}
