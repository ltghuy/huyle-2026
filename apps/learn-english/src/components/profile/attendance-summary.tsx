"use client";

import { Check, Flame, Medal, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StorageError } from "@/components/settings/storage-error";
import { useStorageQuery } from "@/hooks/use-storage-query";
import { localDate, streaks, totalPoints } from "@/learning/attendance";
import { cn } from "@/lib/utils";
import { getAllAttendance } from "@/storage/attendance";
import { ensureProfile } from "@/hooks/use-profile";
import { calendarWeeks, dayMonth, type CalendarDay } from "./progress-math";

const STORES = ["meta", "attendance"] as const;
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

async function loadAttendance() {
  const [profile, attendance] = await Promise.all([ensureProfile(), getAllAttendance()]);
  const today = localDate(Date.now(), profile.timeZone);
  const dates = attendance.map((row) => row.date);
  return { today, points: totalPoints(attendance), ...streaks(dates, today), attended: new Set(dates) };
}

/** Total points, current and longest streak, and the attendance calendar (AC-017, AC-018). */
export function AttendanceSummary() {
  const query = useStorageQuery(loadAttendance, STORES);

  if (query.status === "error") return <StorageError onRetry={query.reload} />;
  if (query.status === "loading") {
    return (
      <div className="grid gap-4 px-4 md:px-8" aria-busy="true" aria-label="Đang tải">
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const { points, current, longest, attended, today } = query.data;
  return (
    <div className="grid gap-4 px-4 md:px-8">
      <dl className="grid grid-cols-3 gap-3">
        <Stat icon={Star} label="Tổng điểm" value={points} />
        <Stat icon={Flame} label="Chuỗi hiện tại" value={current} unit="ngày" />
        <Stat icon={Medal} label="Chuỗi dài nhất" value={longest} unit="ngày" />
      </dl>
      <Card>
        <CardHeader>
          <CardTitle>Lịch học 12 tuần gần đây</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <AttendanceCalendar weeks={calendarWeeks(attended, today)} />
          <Legend />
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ icon: Icon, label, value, unit }: { icon: typeof Star; label: string; value: number; unit?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-3 sm:p-4">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
        <Icon className="size-4 shrink-0 text-streak" aria-hidden />
        {label}
      </dt>
      <dd className="text-2xl font-semibold tabular-nums">
        {value}
        {unit ? <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span> : null}
      </dd>
    </div>
  );
}

function AttendanceCalendar({ weeks }: { weeks: CalendarDay[][] }) {
  return (
    <div className="flex gap-1.5">
      <div className="grid grid-rows-7 gap-1 text-[0.65rem] leading-none text-muted-foreground" aria-hidden>
        {WEEKDAYS.map((day) => (
          <span key={day} className="flex size-5 items-center sm:size-6">
            {day}
          </span>
        ))}
      </div>
      <ol className="grid flex-1 grid-flow-col grid-rows-7 justify-start gap-1" aria-label="Các ngày đã học">
        {weeks.flat().map((day) => (
          <CalendarCell key={day.date} day={day} />
        ))}
      </ol>
    </div>
  );
}

function CalendarCell({ day }: { day: CalendarDay }) {
  if (day.future) return <li className="size-5 sm:size-6" aria-hidden />;
  return (
    <li
      className={cn(
        "flex size-5 items-center justify-center rounded-md sm:size-6",
        day.attended ? "bg-success text-background" : "bg-muted",
      )}
      title={dayMonth(day.date)}
    >
      {day.attended ? <Check className="size-3.5" aria-hidden /> : null}
      <span className="sr-only">{`${dayMonth(day.date)}: ${day.attended ? "đã học" : "chưa học"}`}</span>
    </li>
  );
}

function Legend() {
  return (
    <div className="flex gap-4 text-sm text-muted-foreground" aria-hidden>
      <span className="flex items-center gap-1.5">
        <span className="flex size-4 items-center justify-center rounded bg-success text-background">
          <Check className="size-3" />
        </span>
        Đã học
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-4 rounded bg-muted" />
        Chưa học
      </span>
    </div>
  );
}
