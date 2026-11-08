"use client";

import { useCallback } from "react";
import { Star } from "lucide-react";
import { Mascot, type MascotMood } from "@/components/mascot/mascot";
import { localDate, streaks } from "@/learning/attendance";
import { pointsBalance } from "@/learning/points";
import { getAllAttendance } from "@/storage/attendance";
import { getAllExtraLessons } from "@/storage/extra-lessons";
import { useStorageQuery } from "@/hooks/use-storage-query";

const STORES = ["attendance", "extraLessons"] as const;

/** The cat's mood next to the streak (020 AC-005, 021): sleepy until today's lesson, then happy, cheering from 7 days. */
export function mascotMood(streak: number, learnedToday: boolean): MascotMood {
  if (!learnedToday) return "sleepy";
  return streak >= 7 ? "cheer" : "happy";
}

/** Current streak and the points the learner has now (earned minus spent, 013 AC-002), shown on the home page. */
export function StreakSummary({ timeZone }: { timeZone: string }) {
  const query = useCallback(async () => {
    const [rows, extras] = await Promise.all([getAllAttendance(), getAllExtraLessons()]);
    const today = localDate(Date.now(), timeZone);
    const dates = rows.map((row) => row.date);
    return { streak: streaks(dates, today).current, learnedToday: dates.includes(today), points: Math.max(0, pointsBalance(rows, extras)) };
  }, [timeZone]);
  const summary = useStorageQuery(["streak", timeZone], query, STORES);
  if (summary.status !== "ready") return <div className="h-16" aria-hidden />;
  const { streak, learnedToday, points } = summary.data;
  return (
    <dl className="grid grid-cols-2 gap-3" data-tour="streak">
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <Mascot mood={mascotMood(streak, learnedToday)} size={40} />
        <div>
          <dt className="text-sm text-muted-foreground">Chuỗi ngày học</dt>
          <dd className="text-xl font-semibold">{streak} ngày</dd>
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-streak/15 text-streak">
          <Star className="size-5" aria-hidden />
        </span>
        <div>
          <dt className="text-sm text-muted-foreground">Điểm hiện có</dt>
          <dd className="text-xl font-semibold">{points}</dd>
        </div>
      </div>
    </dl>
  );
}
