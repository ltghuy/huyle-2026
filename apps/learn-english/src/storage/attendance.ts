import type { Attendance } from "@/learning/types";
import { notifyChanged } from "./broadcast";
import { getDb } from "./db";

export type AddAttendanceResult = "awarded" | "already-awarded" | "failed";

/**
 * Records attendance for `row.date` with `add()`, so a second write for the
 * same date (another tab, a double click) fails instead of awarding twice.
 * Never throws: the outcome is returned.
 */
export async function addAttendance(row: Attendance): Promise<AddAttendanceResult> {
  try {
    const added = await (await getDb()).add("attendance", row);
    if (!added) return "already-awarded";
    notifyChanged(["attendance"]);
    return "awarded";
  } catch {
    return "failed";
  }
}

export async function getAttendance(date: string): Promise<Attendance | undefined> {
  return (await getDb()).get("attendance", date);
}

/** All attendance rows, by date. */
export async function getAllAttendance(): Promise<Attendance[]> {
  return (await getDb()).getAll("attendance");
}
