"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { useProfile } from "@/hooks/use-profile";
import { localDate } from "@/learning/attendance";
import type { BoardRow } from "@/learning/leaderboard";
import { fetchTopStreaks } from "@/lib/leaderboard-client";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Where the join switch lives in Cài đặt. */
export const BOARD_SETTING_HREF = "/settings#bang-xep-hang";

/**
 * The 10 longest live streaks on the board, next to the attendance calendar (feature 017). A learner on the
 * board also sees their own place; one who hasn't joined gets a link to the setting.
 */
export function StreakTopTen({ className }: { className?: string }) {
  const profile = useProfile();
  const ready = profile.status === "ready" ? profile.data : null;
  const timeZone = ready?.timeZone ?? null;
  const entry = ready?.leaderboard?.status === "joined" ? ready.leaderboard : null;
  const top = useQuery({
    queryKey: ["streak-top", timeZone, entry?.id ?? null],
    queryFn: () => fetchTopStreaks(localDate(Date.now(), timeZone!), entry?.id),
    enabled: timeZone !== null,
    staleTime: 60_000,
    retry: 1,
  });

  function handleRetry() {
    void top.refetch();
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="size-5 text-streak" aria-hidden /> Top 10 chuỗi ngày học
        </CardTitle>
        <CardDescription>
          {top.data && top.data.total > 0 ? `${top.data.total} bạn trên bảng xếp hạng, xếp theo số ngày học liên tiếp.` : "Xếp theo số ngày học liên tiếp."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {top.status === "error" ? (
          <div className="grid justify-items-start gap-2">
            <p className="text-sm text-muted-foreground">{top.error.message}</p>
            <Button variant="outline" className="h-11" onClick={handleRetry}>
              Thử lại
            </Button>
          </div>
        ) : top.status !== "success" ? (
          <div className="grid gap-2" aria-busy="true" aria-label="Đang tải bảng xếp hạng">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-9 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {top.data.rows.length === 0 ? (
              <Callout emoji="🏆" title="Bảng xếp hạng đang trống">
                Học bài hôm nay để trở thành người đầu tiên giữ chuỗi nhé!
              </Callout>
            ) : (
              <ol className="grid gap-1" aria-label="Top 10 chuỗi ngày học">
                {top.data.rows.map((row) => (
                  <TopRow key={row.position} row={row} />
                ))}
              </ol>
            )}
            <Footer joined={entry !== null} me={top.data.me} inTop={top.data.rows.some((row) => row.me)} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

/** A short message with a large emoji, for the panel's empty and nudge states. */
function Callout({ emoji, title, children, action }: { emoji: string; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/60 p-3">
      <span className="text-3xl leading-none" aria-hidden>
        {emoji}
      </span>
      <div className="grid min-w-0 flex-1 gap-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{children}</p>
        {action}
      </div>
    </div>
  );
}

function TopRow({ row, as: Tag = "li" }: { row: BoardRow; as?: "li" | "div" }) {
  return (
    <Tag
      aria-current={row.me ? "true" : undefined}
      className={cn("flex h-9 items-center gap-3 rounded-lg px-2 text-sm", row.me && "bg-primary/10 font-semibold ring-1 ring-primary")}
    >
      <span className="w-6 text-right tabular-nums text-muted-foreground">
        {row.position <= MEDALS.length ? (
          <>
            <span className="text-base" aria-hidden>
              {MEDALS[row.position - 1]}
            </span>
            <span className="sr-only">{row.position}</span>
          </>
        ) : (
          row.position
        )}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {row.name}
        {row.me ? <span className="ml-1 font-normal text-muted-foreground">(bạn)</span> : null}
      </span>
      <span className="tabular-nums">{row.streak} ngày</span>
    </Tag>
  );
}

/** Own place below the list (AC-005), the "off the board" note (AC-006), or the join link (AC-007). */
function Footer({ joined, me, inTop }: { joined: boolean; me?: BoardRow; inTop: boolean }) {
  if (!joined) {
    return (
      <Callout
        emoji="🙌"
        title="Bạn chưa có trên bảng"
        action={
          <Link href={BOARD_SETTING_HREF} className="justify-self-start text-sm font-medium text-primary underline-offset-4 hover:underline">
            Tham gia bảng xếp hạng
          </Link>
        }
      >
        Bật trong Cài đặt để chuỗi ngày học của bạn được xếp hạng.
      </Callout>
    );
  }
  if (!me) {
    return (
      <Callout
        emoji="🔥"
        title="Chuỗi của bạn đang bị gián đoạn"
        action={
          <Link href="/" className={cn(buttonVariants({ size: "sm" }), "mt-1 h-9 justify-self-start")}>
            Học bài hôm nay
          </Link>
        }
      >
        Học bài hôm nay để thắp lại chuỗi và trở lại bảng nhé!
      </Callout>
    );
  }
  if (inTop) return null;
  return (
    <div className="grid gap-1 border-t pt-3">
      <p className="text-xs text-muted-foreground">Vị trí của bạn</p>
      <TopRow row={me} as="div" />
    </div>
  );
}
