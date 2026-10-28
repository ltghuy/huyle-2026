// Rules of the weekly leaderboard (feature 007): which week a day belongs to,
// a learner's points that week, which names may be shown, and how rows move
// when the learner climbs. Pure: no storage, React or fetch. The server checks
// names with the same `checkBoardName`.
import { cleanName, NAME_MAX_LENGTH } from "./name";
import type { Attendance } from "./types";

const DAY_MS = 86_400_000;

/**
 * Most points one week can award: 10 a day for 7 days, plus the 20, 30 and
 * 100 streak bonuses (220), with room to spare. The server refuses more.
 */
export const MAX_WEEK_POINTS = 300;

/** Places shown above and below the learner on the board. */
export const BOARD_NEIGHBOURS = 3;

function utcDay(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function isoDate(epochMs: number): string {
  return new Date(epochMs).toISOString().slice(0, 10);
}

/** The Monday of `date`'s week ("YYYY-MM-DD" in, "YYYY-MM-DD" out). */
export function weekStart(date: string): string {
  const day = utcDay(date);
  const sinceMonday = (new Date(day).getUTCDay() + 6) % 7;
  return isoDate(day - sinceMonday * DAY_MS);
}

/** ISO 8601 week of a local date, as "2026-W44". Weeks start on Monday; week 1 holds the year's first Thursday. */
export function weekKey(date: string): string {
  const thursday = utcDay(weekStart(date)) + 3 * DAY_MS;
  const year = new Date(thursday).getUTCFullYear();
  const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / (7 * DAY_MS)) + 1;
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/**
 * Attendance points earned in `today`'s week, up to and including `today`,
 * and the same without `today` (the learner's points before this lesson).
 */
export function weekPoints(attendance: readonly Attendance[], today: string): { points: number; previousPoints: number } {
  const monday = weekStart(today);
  let points = 0;
  let previousPoints = 0;
  for (const row of attendance) {
    if (row.date < monday || row.date > today) continue;
    points += row.points + row.bonus;
    if (row.date !== today) previousPoints += row.points + row.bonus;
  }
  return { points: Math.min(points, MAX_WEEK_POINTS), previousPoints: Math.min(previousPoints, MAX_WEEK_POINTS) };
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
  points: number;
  me: boolean;
}

/**
 * Where each row starts before sliding to its place, in row heights (0 = no
 * move): the learner starts below the rows they just overtook, and those rows
 * start one place higher. Overtaken = shown below the learner now, but with
 * more points than the learner had before this lesson.
 */
export function slideOffsets(rows: readonly BoardRow[], previousPoints: number): number[] {
  const meIndex = rows.findIndex((row) => row.me);
  if (meIndex === -1) return rows.map(() => 0);
  const passed = rows.map((row, i) => i > meIndex && row.points > previousPoints);
  const count = passed.filter(Boolean).length;
  return rows.map((row, i) => (row.me ? count : passed[i] ? -1 : 0));
}
