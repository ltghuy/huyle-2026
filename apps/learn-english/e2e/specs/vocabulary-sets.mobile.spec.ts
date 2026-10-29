import { test } from "@playwright/test";
import { followSetIntoLesson } from "../sets-flow";

test("vocabulary sets on a phone: open Chuyên ngành, follow a set, and learn its first word today (feature 012)", async ({ page }) => {
  await followSetIntoLesson(page);
});
