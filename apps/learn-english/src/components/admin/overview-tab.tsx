"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { TYPE_LABELS } from "@/components/library/exercise-sets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fetchOverview } from "@/lib/admin-client";
import type { AdminOverview, OverviewRange, Windowed } from "@/server/admin/admin.schema";
import { OVERVIEW_KEY } from "./admin-screen";

// "Tổng quan" (feature 038, AC-006 to AC-008): accounts for today, 7 and 30 days, then the
// anonymous stats for the range the admin picks.

export const RANGE_LABELS: Record<OverviewRange, string> = { today: "Hôm nay", week: "7 ngày", month: "30 ngày" };
const RANGES = Object.keys(RANGE_LABELS) as OverviewRange[];
const EXTRA_LABELS: Record<string, string> = {
  writing: "Bài viết",
  "forms-typing": "Gõ dạng động từ",
  "forms-gap": "Điền dạng động từ",
  "forms-listening": "Nghe dạng động từ",
};
const number = new Intl.NumberFormat("vi-VN");

function exerciseLabel(kind: string): string {
  return (TYPE_LABELS as Record<string, string>)[kind] ?? EXTRA_LABELS[kind] ?? kind;
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="grid gap-0.5 rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold tabular-nums">{number.format(value)}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function WindowedRow({ title, values }: { title: string; values: Windowed }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-3 gap-2">
          {RANGES.map((range) => (
            <div key={range} className="grid gap-0.5">
              <dt className="text-xs text-muted-foreground">{RANGE_LABELS[range]}</dt>
              <dd className="text-xl font-semibold tabular-nums">{number.format(values[range])}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function RangeStats({ data }: { data: AdminOverview }) {
  const devices = data.devices.reduce((total, day) => total + day.devices, 0);
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lượt thiết bị" value={devices} hint="Mỗi thiết bị tính một lần mỗi ngày" />
        <Stat label="Bài học hoàn thành" value={data.lessons} />
        <Stat label="Bài kiểm tra trình độ" value={data.placements} />
        <Stat label="Trận Đấu trường" value={data.arenaMatches} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">Thiết bị theo ngày</CardTitle>
          </CardHeader>
          <CardContent>
            {data.devices.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có số liệu.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ngày</TableHead>
                    <TableHead className="text-right">Thiết bị</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.devices.toReversed().map((day) => (
                    <TableRow key={day.day}>
                      <TableCell className="tabular-nums">{day.day}</TableCell>
                      <TableCell className="text-right tabular-nums">{number.format(day.devices)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">Bài tập đã làm</CardTitle>
          </CardHeader>
          <CardContent>
            {data.exercises.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có số liệu.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loại</TableHead>
                    <TableHead className="text-right">Số câu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.exercises.map((row) => (
                    <TableRow key={row.kind}>
                      <TableCell>{exerciseLabel(row.kind)}</TableCell>
                      <TableCell className="text-right tabular-nums">{number.format(row.answered)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-base">Từ hay sai nhất</CardTitle>
          </CardHeader>
          <CardContent>
            {data.wrongWords.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có số liệu.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Từ</TableHead>
                    <TableHead className="text-right">Lần sai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.wrongWords.map((row) => (
                    <TableRow key={row.wordId}>
                      <TableCell lang="en">{row.wordId.replace(/^word:/, "")}</TableCell>
                      <TableCell className="text-right tabular-nums">{number.format(row.wrong)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function OverviewTab() {
  const [range, setRange] = useState<OverviewRange>("today");
  const overview = useQuery({ queryKey: [...OVERVIEW_KEY, range], queryFn: () => fetchOverview(range), retry: false });
  const data = overview.data;

  function handleRangeChange(value: string[]) {
    // A toggle group lets the pressed item be un-pressed; keep a range selected.
    if (value[0]) setRange(value[0] as OverviewRange);
  }

  return (
    <div className="grid gap-6">
      {data ? (
        <section aria-labelledby="accounts-title" className="grid gap-3">
          <h2 id="accounts-title" className="font-semibold">
            Tài khoản
          </h2>
          <div className="grid gap-3 md:grid-cols-[minmax(0,12rem)_1fr_1fr_minmax(0,12rem)]">
            <Stat label="Tổng số tài khoản" value={data.accounts.total} />
            <WindowedRow title="Tài khoản mới" values={data.accounts.created} />
            <WindowedRow title="Đang hoạt động" values={data.accounts.active} />
            <Stat label="Câu chờ duyệt" value={data.pendingClaims} />
          </div>
          <p className="text-xs text-muted-foreground">
            Theo giờ Việt Nam. Hoạt động tính theo lần cuối mở ứng dụng; tài khoản tắt thống kê ẩn danh không được tính vào số mới và đang hoạt động.
          </p>
        </section>
      ) : null}

      <section aria-labelledby="usage-title" className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="usage-title" className="font-semibold">
            Hoạt động học {data ? <span className="font-normal text-muted-foreground tabular-nums">({data.from === data.to ? data.to : `${data.from} – ${data.to}`})</span> : null}
          </h2>
          <ToggleGroup aria-label="Khoảng thời gian" variant="outline" spacing={0} value={[range]} onValueChange={handleRangeChange}>
            {RANGES.map((value) => (
              <ToggleGroupItem key={value} value={value} className="h-11 px-4 aria-pressed:bg-primary/10 aria-pressed:text-foreground">
                {RANGE_LABELS[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        {overview.isPending ? (
          <p role="status" className="flex items-center gap-2 py-8 text-muted-foreground">
            <Loader2 aria-hidden className="size-4 animate-spin" /> Đang tải…
          </p>
        ) : overview.error ? (
          <p role="alert" className="text-destructive">
            {overview.error.message}
          </p>
        ) : data ? (
          <RangeStats data={data} />
        ) : null}
      </section>
    </div>
  );
}
