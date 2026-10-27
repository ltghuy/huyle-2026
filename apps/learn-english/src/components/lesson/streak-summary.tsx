"use client";

import { useCallback } from "react";
import { Flame, Star } from "lucide-react";
import { localDate, streaks, totalPoints } from "@/learning/attendance";
import { getAllAttendance } from "@/storage/attendance";
import { useStorageQuery } from "@/hooks/use-storage-query";

const STORES = ["attendance"] as const;

/** Current streak and total points, shown on the home page. */
export function StreakSummary({ timeZone }: { timeZone: string }) {
  const query = useCallback(async () => {
    const rows = await getAllAttendance();
    const today = localDate(Date.now(), timeZone);
    return { streak: streaks(rows.map((row) => row.date), today).current, points: totalPoints(rows) };
  }, [timeZone]);
  const summary = useStorageQuery(query, STORES);
  if (summary.status !== "ready") return <div className="h-16" aria-hidden />;
  const { streak, points } = summary.data;
  return (
    <dl className="grid grid-cols-2 gap-3" data-tour="streak">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <Flame className="size-7 text-streak" aria-hidden />
        <div>
          <dt className="text-sm text-muted-foreground">Chuỗi ngày học</dt>
          <dd className="text-xl font-semibold">{streak} ngày</dd>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <Star className="size-7 text-streak" aria-hidden />
        <div>
          <dt className="text-sm text-muted-foreground">Điểm chuyên cần</dt>
          <dd className="text-xl font-semibold">{points}</dd>
        </div>
      </div>
    </dl>
  );
}
