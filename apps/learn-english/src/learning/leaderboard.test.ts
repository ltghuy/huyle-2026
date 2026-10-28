import { describe, expect, it } from "vitest";
import { BOARD_NAME_ERRORS, checkBoardName, MAX_WEEK_POINTS, slideOffsets, weekKey, weekPoints, weekStart, type BoardRow } from "./leaderboard";
import type { Attendance } from "./types";

const day = (date: string, points = 10, bonus = 0): Attendance => ({ date, points, bonus, at: 0 });

describe("weeks (AC-005)", () => {
  it("starts on Monday", () => {
    expect(weekStart("2026-10-28")).toBe("2026-10-26"); // Wednesday
    expect(weekStart("2026-10-26")).toBe("2026-10-26"); // Monday
    expect(weekStart("2026-11-01")).toBe("2026-10-26"); // Sunday
  });

  it("names ISO weeks, including across a year change", () => {
    expect(weekKey("2026-10-28")).toBe("2026-W44");
    expect(weekKey("2026-01-01")).toBe("2026-W01"); // Thursday
    expect(weekKey("2027-01-01")).toBe("2026-W53"); // Friday of the last 2026 week
    expect(weekKey("2027-01-04")).toBe("2027-W01");
    expect(weekKey("2024-12-30")).toBe("2025-W01");
  });

  it("counts this week's points, with and without today", () => {
    const rows = [day("2026-10-25"), day("2026-10-26"), day("2026-10-27", 10, 20), day("2026-10-28")];
    expect(weekPoints(rows, "2026-10-28")).toEqual({ points: 50, previousPoints: 40 });
    // Monday: last week's points don't count, so the week starts at 0.
    expect(weekPoints(rows, "2026-10-26")).toEqual({ points: 10, previousPoints: 0 });
  });

  it("caps a week at the most the app can award", () => {
    const dates = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"];
    const rows = dates.map((date) => day(date, 10, 100));
    expect(weekPoints(rows, "2026-11-01").points).toBeLessThanOrEqual(MAX_WEEK_POINTS);
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

describe("slideOffsets (AC-002, AC-003)", () => {
  const row = (position: number, points: number, me = false): BoardRow => ({ position, name: `L${position}`, points, me });

  it("starts the learner below the rows they overtook, and those rows one place up", () => {
    // Now 5th with 40 points; had 20 before, so the 6th (30) and 7th (25) were above.
    const rows = [row(4, 50), row(5, 40, true), row(6, 30), row(7, 25), row(8, 10)];
    expect(slideOffsets(rows, 20)).toEqual([0, 2, -1, -1, 0]);
  });

  it("doesn't move anything when nobody was overtaken", () => {
    const rows = [row(1, 50), row(2, 40, true), row(3, 10)];
    expect(slideOffsets(rows, 30)).toEqual([0, 0, 0]);
  });

  it("treats a tie as not overtaken", () => {
    const rows = [row(1, 40, true), row(2, 20)];
    expect(slideOffsets(rows, 20)).toEqual([0, 0]);
  });
});
