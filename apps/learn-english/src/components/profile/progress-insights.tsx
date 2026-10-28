"use client";

import { useState } from "react";
import { Award, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { certificateTitle, type CertificateData } from "./certificate";
import { CertificateDialog } from "./certificate-dialog";
import { accuracy, dayMonth, percent, type LevelCount, type ProgressKind, countByLevel } from "./progress-math";

const DAY_MS = 86_400_000;
const STORES = ["cards", "attempts", "meta"] as const;

async function loadProgress() {
  const now = Date.now();
  const [profile, cards, attempts] = await Promise.all([ensureProfile(), getAllCards(), getAttemptsSince(now - 30 * DAY_MS)]);
  return { cards, profile, accuracy: accuracy(attempts, (at) => localDate(at, profile.timeZone)) };
}

/**
 * Words learned per level, grammar topics completed, irregular verbs practised (008 AC-016) and 30-day
 * accuracy (AC-037). Every level row ends with its certificate, earned once the row is finished (009).
 */
export function ProgressInsights() {
  const progress = useStorageQuery(["progress"], loadProgress, STORES);
  // Learned words can come from any level (vocabulary browsing, placement), so all levels are loaded.
  const content = useContentIndex(LEVELS);
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  if (progress.status === "error") return <StorageError onRetry={progress.reload} />;

  function handleOpenCertificate(kind: ProgressKind, row: LevelCount) {
    if (progress.status !== "ready") return;
    const { displayName, timeZone } = progress.data.profile;
    setCertificate({ kind, level: row.level, total: row.total, name: displayName?.trim() || "Bạn", date: localDate(row.lastLearnedAt ?? Date.now(), timeZone) });
  }

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
            <LevelBars kind="word" rows={countByLevel(progress.data.cards, content.index, "word")} unit="từ" onOpenCertificate={handleOpenCertificate} label="Từ đã học" />
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
            <LevelBars kind="grammar" rows={countByLevel(progress.data.cards, content.index, "grammar")} unit="chủ đề" onOpenCertificate={handleOpenCertificate} label="Chủ đề ngữ pháp đã học" />
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
              <LevelBars kind="forms" rows={countByLevel(progress.data.cards, content.index, "forms")} unit="động từ" onOpenCertificate={handleOpenCertificate} label="Động từ bất quy tắc đã học" />
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
      <CertificateDialog data={certificate} onClose={() => setCertificate(null)} />
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

interface LevelBarsProps {
  kind: ProgressKind;
  rows: LevelCount[];
  unit: string;
  label: string;
  onOpenCertificate: (kind: ProgressKind, row: LevelCount) => void;
}

function LevelBars({ kind, rows, unit, label, onOpenCertificate }: LevelBarsProps) {
  const shown = rows.filter((row) => row.total > 0 || row.learned > 0);
  if (shown.length === 0) return <p className="text-sm text-muted-foreground">Chưa có nội dung.</p>;
  return (
    <ul className="grid gap-1.5" aria-label={label}>
      {shown.map((row) => (
        <li key={row.level} className="flex items-center gap-3 text-sm">
          <span lang="en" className="w-7 font-medium">
            {row.level}
          </span>
          <Bar value={row.total ? Math.min(100, (row.learned / row.total) * 100) : 0} />
          <span className="w-28 text-right tabular-nums text-muted-foreground">
            {row.learned}/{row.total} {unit}
          </span>
          <CertificateButton kind={kind} row={row} unit={unit} onOpen={onOpenCertificate} />
        </li>
      ))}
    </ul>
  );
}

const formatCount = (n: number) => n.toLocaleString("vi-VN");

/** Earned: opens the certificate. Locked (dimmed, with a lock): says how much is left (009 AC-001–AC-003, AC-005). */
function CertificateButton({ kind, row, unit, onOpen }: { kind: ProgressKind; row: LevelCount; unit: string; onOpen: LevelBarsProps["onOpenCertificate"] }) {
  const earned = row.total > 0 && row.learned >= row.total;
  const title = certificateTitle(kind, row.level);
  const left = formatCount(Math.max(0, row.total - row.learned));

  function handleClick() {
    if (earned) onOpen(kind, row);
    else toast(`Còn ${left} ${unit} nữa là bạn nhận chứng nhận ${title}.`);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleClick}
      aria-label={earned ? `Xem chứng nhận ${title}` : `Chứng nhận ${title}: chưa đạt, còn ${left} ${unit}`}
      title={earned ? `Xem chứng nhận ${title}` : `Chưa đạt: còn ${left} ${unit}`}
      className={earned ? "shrink-0 text-warning" : "shrink-0 text-muted-foreground/60"}
    >
      <span className="relative">
        <Award className="size-5" aria-hidden />
        {earned ? null : <Lock className="absolute -right-1 -bottom-0.5 size-3 rounded-full bg-card" aria-hidden />}
      </span>
    </Button>
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
