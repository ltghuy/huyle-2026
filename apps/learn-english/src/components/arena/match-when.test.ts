import { describe, expect, it } from "vitest";
import { matchWhen } from "./match-when";

// Local times, so the test holds in any time zone.
const NOW = new Date(2026, 10, 5, 9, 30).getTime();

describe("matchWhen (feature 025, AC-003)", () => {
  it("says hôm nay for a match earlier today", () => {
    expect(matchWhen(new Date(2026, 10, 5, 0, 5).getTime(), NOW)).toBe("00:05 hôm nay");
  });

  it("says hôm qua for a match yesterday, even late at night", () => {
    expect(matchWhen(new Date(2026, 10, 4, 23, 59).getTime(), NOW)).toBe("23:59 hôm qua");
    expect(matchWhen(new Date(2026, 10, 4, 20, 14).getTime(), NOW)).toBe("20:14 hôm qua");
  });

  it("gives the date for anything older", () => {
    expect(matchWhen(new Date(2026, 10, 3, 20, 14).getTime(), NOW)).toBe("20:14 · 03/11/2026");
  });
});
