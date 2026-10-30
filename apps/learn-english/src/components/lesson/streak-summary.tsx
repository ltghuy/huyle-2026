"use client";

import { useCallback } from "react";
import { Flame, Star } from "lucide-react";
import { localDate, streaks } from "@/learning/attendance";
import { pointsBalance } from "@/learning/points";
import { getAllAttendance } from "@/storage/attendance";
import { getAllExtraLessons } from "@/storage/extra-lessons";
import { useStorageQuery } from "@/hooks/use-storage-query";

const STORES = ["attendance", "extraLessons"] as const;

/** Current streak and the points the learner has now (earned minus spent, 013 AC-002), shown on the home page. */
export function StreakSummary({ timeZone }: { timeZone: string }) {
  const query = useCallback(async () => {
    const [rows, extras] = await Promise.all([getAllAttendance(), getAllExtraLessons()]);
    const today = localDate(Date.now(), timeZone);
    return { streak: streaks(rows.map((row) => row.date), today).current, points: Math.max(0, pointsBalance(rows, extras)) };
  }, [timeZone]);
  const summary = useStorageQuery(["streak", timeZone], query, STORES);
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
          <dt className="text-sm text-muted-foreground">Điểm hiện có</dt>
          <dd className="text-xl font-semibold">{points}</dd>
        </div>
      </div>
    </dl>
  );
}
