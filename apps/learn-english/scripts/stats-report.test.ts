import { describe, expect, it } from "vitest";
import { accountQueries, accountWeeks, dailyTable, parseRange, reportQueries, totals, weeksOf, type Report } from "./stats-report";

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

describe("account weeks (022 AC-027, AC-028)", () => {
  const at = (day: string) => Date.parse(`${day}T10:00:00Z`);
  const users = [
    { id: "a", created_at: at("2026-10-27"), stats_opt_out: 0 }, // week 44
    { id: "b", created_at: at("2026-11-03"), stats_opt_out: 0 }, // week 45
    { id: "c", created_at: at("2026-11-04"), stats_opt_out: 1 }, // opted out
  ];
  const activity = [
    { user_id: "a", week: "2026-W44", device_hash: "a1" },
    { user_id: "a", week: "2026-W45", device_hash: "a1" },
    { user_id: "a", week: "2026-W45", device_hash: "a2" },
    { user_id: "b", week: "2026-W45", device_hash: "b1" },
    { user_id: "c", week: "2026-W45", device_hash: "c1" },
    { user_id: "c", week: "2026-W45", device_hash: "c2" },
  ];

  it("lists the ISO weeks a range touches", () => {
    expect(weeksOf({ from: "2026-10-31", to: "2026-11-03" })).toEqual(["2026-W44", "2026-W45"]);
    expect(accountQueries(["2026-W44", "2026-W45"])[1]).toContain("week IN ('2026-W44', '2026-W45')");
    expect(accountQueries([])[0]).not.toMatch(/name|email/);
  });

  it("counts created, active, returning and multi-device accounts, leaving out those who opted out", () => {
    expect(accountWeeks(users, activity, ["2026-W44", "2026-W45"])).toEqual([
      { week: "2026-W44", created: 1, active: 1, returning: 0, multiDevice: 0 },
      { week: "2026-W45", created: 1, active: 2, returning: 1, multiDevice: 1 },
    ]);
  });
});
