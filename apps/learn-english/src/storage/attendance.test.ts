import { beforeEach, describe, expect, it } from "vitest";
import { addAttendance, getAllAttendance, getAttendance } from "./attendance";
import { resetStorage } from "./test-utils";

describe("addAttendance", () => {
  beforeEach(resetStorage);

  it("awards a date once and never overwrites it", async () => {
    expect(await addAttendance({ date: "2026-10-26", points: 10, bonus: 0, at: 1 })).toBe("awarded");
    expect(await addAttendance({ date: "2026-10-26", points: 10, bonus: 20, at: 2 })).toBe("already-awarded");
    expect(await getAttendance("2026-10-26")).toEqual({ date: "2026-10-26", points: 10, bonus: 0, at: 1 });
  });

  it("lets only one of two concurrent writes for the same date through", async () => {
    const results = await Promise.all([
      addAttendance({ date: "2026-10-26", points: 10, bonus: 0, at: 1 }),
      addAttendance({ date: "2026-10-26", points: 10, bonus: 0, at: 2 }),
    ]);
    expect(results.toSorted()).toEqual(["already-awarded", "awarded"]);
    expect(await getAllAttendance()).toHaveLength(1);
  });

  it("returns all rows ordered by date", async () => {
    await addAttendance({ date: "2026-10-27", points: 10, bonus: 0, at: 2 });
    await addAttendance({ date: "2026-10-25", points: 10, bonus: 0, at: 1 });
    expect((await getAllAttendance()).map((row) => row.date)).toEqual(["2026-10-25", "2026-10-27"]);
  });
});
