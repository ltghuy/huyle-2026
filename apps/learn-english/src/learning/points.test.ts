import { describe, expect, it } from "vitest";
import { extraLessonPrice, nextExtraPrice, pointsBalance, spentPoints } from "./points";
import type { Attendance } from "./types";

const day = (date: string, points = 20, bonus = 0): Attendance => ({ date, points, bonus, at: 0 });

describe("extraLessonPrice", () => {
  it("starts at 10 and grows by 30% each time, in whole points", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(extraLessonPrice)).toEqual([10, 13, 17, 22, 29, 37, 48]);
  });
});

describe("nextExtraPrice", () => {
  it("counts only today's purchases, so a new day starts at 10 again", () => {
    const extras = [{ date: "2026-10-29" }, { date: "2026-10-29" }, { date: "2026-10-30" }];
    expect(nextExtraPrice(extras, "2026-10-30")).toBe(13);
    expect(nextExtraPrice(extras, "2026-10-31")).toBe(10);
  });
});

describe("pointsBalance", () => {
  it("is everything earned minus everything spent", () => {
    const attendance = [day("2026-10-29", 10), day("2026-10-30", 20, 20)];
    expect(spentPoints([{ price: 10 }, { price: 13 }])).toBe(23);
    expect(pointsBalance(attendance, [{ price: 10 }, { price: 13 }])).toBe(27);
  });

  it("can go below 0 when two devices spent the same points", () => {
    expect(pointsBalance([day("2026-10-30")], [{ price: 10 }, { price: 10 }, { price: 13 }])).toBe(-13);
  });
});
