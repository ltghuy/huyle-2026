import type { DailyLesson } from "@/learning/types";
import { notifyChanged } from "./broadcast";
import { getDb } from "./db";

export async function getLesson(date: string): Promise<DailyLesson | undefined> {
  return (await getDb()).get("lessons", date);
}

export async function getAllLessons(): Promise<DailyLesson[]> {
  return (await getDb()).getAll("lessons");
}

export async function putLesson(lesson: DailyLesson): Promise<void> {
  await (await getDb()).put("lessons", lesson);
  notifyChanged(["lessons"]);
}
