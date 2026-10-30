import { describe, expect, it } from "vitest";
import {
  BOARD_EPOCH,
  BOARD_NAME_ERRORS,
  BONUS_ALLOWANCE,
  boardLimits,
  boardNumbers,
  checkBoardName,
  daysBetween,
  previousDay,
  slideOffsets,
  type BoardRow,
} from "./leaderboard";
import type { Attendance } from "./types";

const day = (date: string, points = 10, bonus = 0): Attendance => ({ date, points, bonus, at: 0 });

describe("boardNumbers (013 AC-010)", () => {
  it("sends the current streak and points ever earned, and the same before today's lesson", () => {
    const rows = [day("2026-10-27", 10), day("2026-10-28", 20), day("2026-10-29", 20), day("2026-10-30", 20, 20)];
    expect(boardNumbers(rows, "2026-10-30")).toEqual({ lastDate: "2026-10-30", streak: 4, earned: 90, previousStreak: 3, previousEarned: 50 });
  });

  it("keeps the streak from yesterday before today's lesson, and drops it after a missed day", () => {
    expect(boardNumbers([day("2026-10-29")], "2026-10-30")).toMatchObject({ lastDate: "2026-10-29", streak: 1, previousStreak: 1 });
    expect(boardNumbers([day("2026-10-27")], "2026-10-30")).toMatchObject({ lastDate: "2026-10-27", streak: 0, earned: 10 });
    expect(boardNumbers([], "2026-10-30")).toEqual({ lastDate: "", streak: 0, earned: 0, previousStreak: 0, previousEarned: 0 });
  });
});

describe("boardLimits (013 AC-016)", () => {
  it("allows one streak day per day since the app opened", () => {
    expect(boardLimits(BOARD_EPOCH)).toEqual({ streak: 1, earned: 20 + BONUS_ALLOWANCE });
    expect(boardLimits("2026-10-30").streak).toBe(5);
    expect(daysBetween("2026-10-29", "2026-11-02")).toBe(4);
    expect(previousDay("2026-11-01")).toBe("2026-10-31");
  });
});

describe("checkBoardName (AC-012)", () => {
  it("accepts a normal name, cleaned like feature 003", () => {
    expect(checkBoardName("  Lê   Trần Gia Huy ")).toEqual({ ok: true, name: "Lê Trần Gia Huy" });
    expect(checkBoardName("Minh Anh 2")).toEqual({ ok: true, name: "Minh Anh 2" });
  });

  it("applies the name rules", () => {
    expect(checkBoardName("123")).toEqual({ ok: false, message: BOARD_NAME_ERRORS.rules });
    expect(checkBoardName("a".repeat(41))).toEqual({ ok: false, message: BOARD_NAME_ERRORS.rules });
  });

  it("rejects profanity as a word, and English stems inside a word", () => {
    expect(checkBoardName("Đéo biết")).toEqual({ ok: false, message: BOARD_NAME_ERRORS.blocked });
    expect(checkBoardName("FuckYou")).toEqual({ ok: false, message: BOARD_NAME_ERRORS.blocked });
    expect(checkBoardName("big Shit")).toEqual({ ok: false, message: BOARD_NAME_ERRORS.blocked });
  });

  it("doesn't reject ordinary words that only look alike without accents", () => {
    // "lớn" (big) and "lon" (can) are fine; only "lồn" is blocked.
    expect(checkBoardName("Anh Lớn").ok).toBe(true);
    expect(checkBoardName("Dickens").ok).toBe(true);
  });
});

describe("slideOffsets (007 AC-002, 013 AC-012)", () => {
  const row = (position: number, streak: number, earned: number, me = false): BoardRow => ({ position, name: `L${position}`, streak, earned, me });

  it("starts the learner below the rows they overtook, and those rows one place up", () => {
    // Now 5th on a 6-day streak; was on 5 days with 100 points, so the 6th (5 days, 120) and 7th (5 days, 110) were above.
    const rows = [row(4, 9, 200), row(5, 6, 120, true), row(6, 5, 120), row(7, 5, 110), row(8, 5, 90)];
    expect(slideOffsets(rows, { streak: 5, earned: 100 })).toEqual([0, 2, -1, -1, 0]);
  });

  it("doesn't move anything when nobody was overtaken", () => {
    const rows = [row(1, 9, 50), row(2, 6, 40, true), row(3, 2, 10)];
    expect(slideOffsets(rows, { streak: 5, earned: 30 })).toEqual([0, 0, 0]);
  });

  it("treats a tie as not overtaken", () => {
    const rows = [row(1, 6, 40, true), row(2, 5, 20)];
    expect(slideOffsets(rows, { streak: 5, earned: 20 })).toEqual([0, 0]);
  });
});
