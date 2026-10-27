import { describe, expect, it } from "vitest";
import { dailyTable, parseRange, reportQueries, totals, type Report } from "./stats-report";

const range = { from: "2026-10-26", to: "2026-10-28" };

describe("parseRange", () => {
  it("accepts an ordered range of real dates", () => {
    expect(parseRange("2026-10-26", "2026-10-28")).toEqual(range);
    expect(parseRange("2026-10-26", "2026-10-26")).toEqual({ from: "2026-10-26", to: "2026-10-26" });
  });

  it.each([
    [undefined, "2026-10-28"],
    ["2026-10-28", "2026-10-26"],
    ["2026-02-30", "2026-03-01"],
    ["2026-10-26' OR 1=1 --", "2026-10-28"],
  ])("rejects %s .. %s", (from, to) => {
    expect(() => parseRange(from, to)).toThrow();
  });
});

describe("reportQueries", () => {
  it("builds the four range queries", () => {
    const [daily, devices, exercises, words] = reportQueries(range);
    for (const sql of [daily, devices, exercises, words]) expect(sql).toContain("day BETWEEN '2026-10-26' AND '2026-10-28'");
    expect(daily).toMatch(/metric IN \('lesson_completed', 'placement_done'\).*GROUP BY day/);
    expect(devices).toMatch(/COUNT\(\*\) AS devices FROM stats_devices/);
    expect(exercises).toMatch(/metric = 'exercise'.*GROUP BY key ORDER BY answered DESC/);
    expect(words).toMatch(/metric = 'word_wrong'.*ORDER BY wrong DESC, word LIMIT 20$/);
  });
});

describe("formatting", () => {
  const report: Report = {
    daily: [{ day: "2026-10-26", lessons: 3, placements: 1 }],
    devices: [
      { day: "2026-10-26", devices: 2 },
      { day: "2026-10-28", devices: 1 },
    ],
    exercises: [
      { kind: "mcq", answered: 40 },
      { kind: "listening", answered: 5 },
    ],
    words: [{ word: "word:cat-n", wrong: 4 }],
  };

  it("lists every day of the range, with zeros for quiet days", () => {
    expect(dailyTable(report, range)).toEqual([
      { day: "2026-10-26", devices: 2, lessons: 3, placements: 1 },
      { day: "2026-10-27", devices: 0, lessons: 0, placements: 0 },
      { day: "2026-10-28", devices: 1, lessons: 0, placements: 0 },
    ]);
  });

  it("totals the range", () => {
    expect(totals(report)).toEqual({ lessons: 3, placements: 1, deviceDays: 3, exercises: 45 });
  });
});
