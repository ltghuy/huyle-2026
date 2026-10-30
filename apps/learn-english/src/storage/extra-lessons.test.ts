import { beforeEach, describe, expect, it } from "vitest";
import type { ExtraLesson } from "@/learning/types";
import { getAllExtraLessons, getExtraLesson, getExtraLessonsOn, purchaseExtraLesson, putExtraLesson } from "./extra-lessons";
import { resetStorage } from "./test-utils";

const extra = (id: string, date = "2026-10-30"): ExtraLesson => ({
  id,
  date,
  price: 10,
  purchasedAt: 1,
  contentVersion: 1,
  plan: [],
  position: { part: 0, index: 0 },
  updatedAt: 1,
});

describe("extra lessons storage (013)", () => {
  beforeEach(resetStorage);

  it("reads by id and by date", async () => {
    await putExtraLesson(extra("a", "2026-10-29"));
    await putExtraLesson(extra("b"));
    expect((await getExtraLesson("b"))?.date).toBe("2026-10-30");
    expect((await getExtraLessonsOn("2026-10-30")).map((e) => e.id)).toEqual(["b"]);
    expect(await getAllExtraLessons()).toHaveLength(2);
  });

  it("saves the same purchase number once: the second tab gets the first tab's lesson", async () => {
    const [first, second] = await Promise.all([purchaseExtraLesson(extra("tab-1"), 1), purchaseExtraLesson(extra("tab-2"), 1)]);
    expect([first.status, second.status].sort()).toEqual(["bought", "taken"]);
    const taken = first.status === "taken" ? first : second;
    expect(taken).toMatchObject({ id: first.status === "bought" ? "tab-1" : "tab-2" });
    expect(await getAllExtraLessons()).toHaveLength(1);
    expect((await purchaseExtraLesson(extra("next"), 2)).status).toBe("bought");
  });
});
