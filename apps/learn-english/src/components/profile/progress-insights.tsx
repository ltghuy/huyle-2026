"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContentError } from "@/components/shell/load-states";
import { StorageError } from "@/components/settings/storage-error";
import { useContentIndex } from "@/hooks/use-content-index";
import { ensureProfile } from "@/hooks/use-profile";
import { useStorageQuery } from "@/hooks/use-storage-query";
import { localDate } from "@/learning/attendance";
import { LEVELS } from "@/learning/types";
import { getAttemptsSince } from "@/storage/attempts";
import { getAllCards } from "@/storage/cards";
import { accuracy, dayMonth, percent, type LevelCount, countByLevel } from "./progress-math";

const DAY_MS = 86_400_000;
const STORES = ["cards", "attempts", "meta"] as const;

async function loadProgress() {
  const now = Date.now();
  const [profile, cards, attempts] = await Promise.all([ensureProfile(), getAllCards(), getAttemptsSince(now - 30 * DAY_MS)]);
  return { cards, accuracy: accuracy(attempts, (at) => localDate(at, profile.timeZone)) };
}

/** Words learned per level, grammar topics completed, irregular verbs practised (008 AC-016) and 30-day accuracy (AC-037). */
export function ProgressInsights() {
  const progress = useStorageQuery(["progress"], loadProgress, STORES);
  // Learned words can come from any level (vocabulary browsing, placement), so all levels are loaded.
  const content = useContentIndex(LEVELS);

  if (progress.status === "error") return <StorageError onRetry={progress.reload} />;

  return (
    <div className="grid gap-4 px-4 md:grid-cols-2 md:px-8">
      <Card>
        <CardHeader>
          <CardTitle>Từ đã học theo trình độ</CardTitle>
        </CardHeader>
        <CardContent>
          {content.status === "error" ? (
            <ContentError onRetry={content.retry} />
          ) : content.status === "ready" && progress.status === "ready" ? (
            <LevelBars rows={countByLevel(progress.data.cards, content.index, "word")} unit="từ" label="Từ đã học" />
          ) : (
            <BarsSkeleton />
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Chủ đề ngữ pháp đã học</CardTitle>
        </CardHeader>
        <CardContent>
          {content.status === "error" ? (
            <ContentError onRetry={content.retry} />
          ) : content.status === "ready" && progress.status === "ready" ? (
            <LevelBars rows={countByLevel(progress.data.cards, content.index, "grammar")} unit="chủ đề" label="Chủ đề ngữ pháp đã học" />
          ) : (
            <BarsSkeleton />
          )}
        </CardContent>
      </Card>
      {/* Hidden until verb forms are published (feature 008, AC-016). */}
      {content.status === "ready" && content.index.forms.length > 0 ? (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Động từ bất quy tắc đã học</CardTitle>
            <CardDescription>Động từ bạn đã luyện dạng quá khứ và quá khứ phân từ.</CardDescription>
          </CardHeader>
          <CardContent>
            {progress.status === "ready" ? (
              <LevelBars rows={countByLevel(progress.data.cards, content.index, "forms")} unit="động từ" label="Động từ bất quy tắc đã học" />
            ) : (
              <BarsSkeleton />
            )}
          </CardContent>
        </Card>
      ) : null}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Độ chính xác 30 ngày qua</CardTitle>
          <CardDescription>Tỉ lệ câu trả lời đúng trong bài học, ôn tập và bài tập.</CardDescription>
        </CardHeader>
        <CardContent>{progress.status === "ready" ? <AccuracyView data={progress.data.accuracy} /> : <BarsSkeleton />}</CardContent>
      </Card>
    </div>
  );
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="h-full rounded-full bg-success" style={{ width: `${value}%` }} />
    </div>
  );
}

function LevelBars({ rows, unit, label }: { rows: LevelCount[]; unit: string; label: string }) {
  const shown = rows.filter((row) => row.total > 0 || row.learned > 0);
  if (shown.length === 0) return <p className="text-sm text-muted-foreground">Chưa có nội dung.</p>;
  return (
    <ul className="grid gap-3" aria-label={label}>
      {shown.map((row) => (
        <li key={row.level} className="flex items-center gap-3 text-sm">
          <span lang="en" className="w-7 font-medium">
            {row.level}
          </span>
          <Bar value={row.total ? Math.min(100, (row.learned / row.total) * 100) : 0} />
          <span className="w-28 text-right tabular-nums text-muted-foreground">
            {row.learned}/{row.total} {unit}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AccuracyView({ data }: { data: ReturnType<typeof accuracy> }) {
  if (data.overall.total === 0) {
    return <p className="text-sm text-muted-foreground">Bạn chưa trả lời câu nào trong 30 ngày qua. Làm bài học hôm nay để bắt đầu nhé!</p>;
  }
  return (
    <div className="grid gap-4">
      <p>
        <span className="text-3xl font-semibold tabular-nums">{percent(data.overall)}%</span>
        <span className="ml-2 text-sm text-muted-foreground">
          đúng {data.overall.correct}/{data.overall.total} câu
        </span>
      </p>
      <ul className="grid gap-2" aria-label="Độ chính xác theo tuần">
        {data.weeks.map((week) => (
          <li key={week.week} className="flex items-center gap-3 text-sm">
            <span className="w-24 text-muted-foreground">Tuần {dayMonth(week.week)}</span>
            <Bar value={percent(week)} />
            <span className="w-28 text-right tabular-nums text-muted-foreground">
              {percent(week)}% ({week.correct}/{week.total})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarsSkeleton() {
  return (
    <div className="grid gap-3" aria-busy="true" aria-label="Đang tải">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-4 rounded-full" />
      ))}
    </div>
  );
}
