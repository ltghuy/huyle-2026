import { describe, expect, it } from "vitest";
import { localDate, pointsFor, streaks, totalPoints } from "./attendance";
import type { Attendance } from "./types";

describe("localDate", () => {
  it("uses Asia/Ho_Chi_Minh (UTC+7) by default across the midnight boundary", () => {
    // 16:59:59 UTC = 23:59:59 in Vietnam; one second later is the next local day.
    expect(localDate(Date.UTC(2026, 0, 31, 16, 59, 59))).toBe("2026-01-31");
    expect(localDate(Date.UTC(2026, 0, 31, 17, 0, 0))).toBe("2026-02-01");
  });

  it("honours another time zone", () => {
    const instant = Date.UTC(2026, 0, 31, 17, 0, 0);
    expect(localDate(instant, "UTC")).toBe("2026-01-31");
    expect(localDate(instant, "America/New_York")).toBe("2026-01-31");
  });
});

describe("pointsFor", () => {
  it("gives 20 points a day", () => {
    expect(pointsFor(1)).toEqual({ points: 20, bonus: 0 });
    expect(pointsFor(8)).toEqual({ points: 20, bonus: 0 });
  });

  it("adds bonuses at exactly 7, 30 and 100 days", () => {
    expect(pointsFor(7)).toEqual({ points: 20, bonus: 20 });
    expect(pointsFor(30)).toEqual({ points: 20, bonus: 30 });
    expect(pointsFor(100)).toEqual({ points: 20, bonus: 100 });
    expect(pointsFor(14).bonus).toBe(0);
    expect(pointsFor(101).bonus).toBe(0);
  });
});

describe("streaks", () => {
  it("increments with consecutive days", () => {
    expect(streaks(["2026-01-01"], "2026-01-01")).toEqual({ current: 1, longest: 1 });
    expect(streaks(["2026-01-01", "2026-01-02"], "2026-01-02")).toEqual({ current: 2, longest: 2 });
  });

  it("keeps the streak alive until a whole day is missed", () => {
    expect(streaks(["2026-01-01", "2026-01-02"], "2026-01-03")).toEqual({ current: 2, longest: 2 });
  });

  it("resets after a missed day", () => {
    expect(streaks(["2026-01-01", "2026-01-02"], "2026-01-04")).toEqual({ current: 0, longest: 2 });
    expect(streaks(["2026-01-01", "2026-01-02", "2026-01-04"], "2026-01-04")).toEqual({ current: 1, longest: 2 });
  });

  it("keeps the longest streak", () => {
    const dates = ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-10", "2026-01-11"];
    expect(streaks(dates, "2026-01-11")).toEqual({ current: 2, longest: 3 });
  });

  it("handles unsorted, duplicate and month-crossing dates", () => {
    const dates = ["2026-03-01", "2026-02-28", "2026-02-27", "2026-03-01"];
    expect(streaks(dates, "2026-03-01")).toEqual({ current: 3, longest: 3 });
  });

  it("is zero with no attendance", () => {
    expect(streaks([], "2026-01-01")).toEqual({ current: 0, longest: 0 });
  });

  it("works with local dates across the Vietnam midnight", () => {
    const day1 = localDate(Date.UTC(2026, 0, 1, 16, 30)); // 23:30 local, Jan 1
    const day2 = localDate(Date.UTC(2026, 0, 1, 17, 30)); // 00:30 local, Jan 2
    expect(streaks([day1, day2], day2)).toEqual({ current: 2, longest: 2 });
  });
});

describe("totalPoints", () => {
  it("sums points and bonuses", () => {
    const rows: Attendance[] = [
      { date: "2026-01-01", points: 10, bonus: 0, at: 1 },
      { date: "2026-01-07", points: 10, bonus: 20, at: 2 },
    ];
    expect(totalPoints(rows)).toBe(40);
    expect(totalPoints([])).toBe(0);
  });
});
