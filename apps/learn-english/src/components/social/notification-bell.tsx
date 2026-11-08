"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { AccountAvatar } from "@/components/account/account-avatar";
import { Button, buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchNotifications, markNotificationsRead, respondToRequest, SocialError } from "@/lib/social-client";
import { cn } from "@/lib/utils";
import { SOCIAL_MESSAGES, type NotificationItem, type NotificationsResponse, type PulseResponse } from "@/server/social/social.schema";
import { timeAgo } from "./last-active";
import { SOCIAL_KEY, useSocial } from "./use-social";

// The notification bell in the page header (feature 031, AC-022 to AC-031). The unread count
// comes with the pulse; the list loads when the bell opens, which counts everything as read.
// Friend requests are answered here.

export const NOTIFICATIONS_KEY = ["social", "notifications"] as const;
const LOAD_FAILED = "Không tải được thông báo.";
const ANSWER_FAILED = "Chưa gửi được câu trả lời. Bạn thử lại nhé.";

/** "9+" above nine (AC-023). */
export function badgeText(unread: number): string {
  return unread > 9 ? "9+" : String(unread);
}

function itemText(item: NotificationItem) {
  const name = <span className="font-semibold">{item.actor.name}</span>;
  if (item.kind === "friend_request") return <>{name} muốn kết bạn với bạn</>;
  if (item.kind === "friend_added") return <>Bạn và {name} đã là bạn bè</>;
  return <>{name} đã đồng ý kết bạn</>;
}

interface ItemProps {
  item: NotificationItem;
  now: number;
  gone: boolean;
  busy: boolean;
  onAnswer: (item: NotificationItem, accept: boolean) => void;
}

function NotificationRow({ item, now, gone, busy, onAnswer }: ItemProps) {
  return (
    <li className={cn("flex gap-3 rounded-md px-2 py-2.5", !item.read && "bg-primary/5")}>
      <AccountAvatar name={item.actor.name} image={item.actor.image} className="size-9 shrink-0" />
      <div className="grid min-w-0 flex-1 gap-1.5">
        <p className="text-sm leading-snug">{itemText(item)}</p>
        <p className="text-xs text-muted-foreground">{timeAgo(item.createdAt, now)}</p>
        {gone ? (
          <p className="text-xs text-muted-foreground">{SOCIAL_MESSAGES.gone}</p>
        ) : item.pending ? (
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => onAnswer(item, true)}>
              Đồng ý
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => onAnswer(item, false)}>
              Từ chối
            </Button>
          </div>
        ) : null}
      </div>
      {!item.read ? <span aria-label="Chưa đọc" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /> : null}
    </li>
  );
}

function Loading() {
  return (
    <ul aria-hidden className="grid gap-2 p-2">
      {[0, 1].map((i) => (
        <li key={i} className="flex gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NotificationBell({ className }: { className?: string }) {
  const { signedIn, query: social } = useSocial();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState<ReadonlySet<string>>(new Set());
  const [answering, setAnswering] = useState<string | null>(null);
  // Filled by `handleOpenChange` (fetched before marking read, so the unread marks still show).
  const list = useQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: fetchNotifications, enabled: false, retry: false });

  if (!signedIn) return null;
  const unread = social.data?.unread ?? 0;

  async function loadAndMarkRead() {
    try {
      const data = await queryClient.fetchQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: fetchNotifications, staleTime: 0, retry: false });
      if (!data.items.some((item) => !item.read)) return;
      await markNotificationsRead();
      queryClient.setQueryData<PulseResponse>(SOCIAL_KEY, (old) => (old ? { ...old, unread: 0 } : old));
    } catch {
      // The list shows its own error; the count stays until the next pulse.
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void loadAndMarkRead();
  }

  function updateItem(id: string, change: (item: NotificationItem) => NotificationItem | null) {
    queryClient.setQueryData<NotificationsResponse>(NOTIFICATIONS_KEY, (old) =>
      old ? { ...old, items: old.items.flatMap((item) => (item.id === id ? (change(item) ?? []) : [item])) } : old,
    );
  }

  async function handleAnswer(item: NotificationItem, accept: boolean) {
    setAnswering(item.id);
    try {
      await respondToRequest(item.actor.id, accept);
      // Accepted: "Bạn và {tên} đã là bạn bè" (AC-005). Declined: it goes (AC-006).
      updateItem(item.id, (old) => (accept ? { ...old, kind: "friend_added", pending: false } : null));
      void queryClient.invalidateQueries({ queryKey: SOCIAL_KEY, exact: true });
    } catch (error) {
      if (error instanceof SocialError && error.status === 404) {
        setGone((old) => new Set(old).add(item.id));
        void queryClient.invalidateQueries({ queryKey: SOCIAL_KEY, exact: true });
      } else {
        toast.error(error instanceof SocialError && error.status !== 503 ? error.message : ANSWER_FAILED);
      }
    } finally {
      setAnswering(null);
    }
  }

  function handleRetry() {
    void loadAndMarkRead();
  }

  const label = unread > 0 ? `Thông báo, ${unread} chưa đọc` : "Thông báo";
  const data = list.data;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label={label}
        title="Thông báo"
        className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "relative size-11 shrink-0 rounded-full md:size-10", className)}
      >
        <Bell aria-hidden className="size-5" />
        {unread > 0 ? (
          <span aria-hidden className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1 text-[11px] leading-none font-semibold text-white tabular-nums">
            {badgeText(unread)}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[min(22rem,calc(100vw-2rem))] gap-1 p-1.5">
        <PopoverTitle className="px-2 pt-1.5 pb-1 text-sm font-semibold">Thông báo</PopoverTitle>
        <div className="max-h-[min(28rem,70vh)] overflow-y-auto overscroll-contain">
          {data ? (
            data.items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">Chưa có thông báo nào.</p>
            ) : (
              <ul className="grid gap-0.5">
                {data.items.map((item) => (
                  <NotificationRow key={item.id} item={item} now={data.now} gone={gone.has(item.id)} busy={answering === item.id} onAnswer={handleAnswer} />
                ))}
              </ul>
            )
          ) : list.isError ? (
            <div className="grid justify-items-center gap-2 px-2 py-6 text-sm text-muted-foreground">
              <p>{LOAD_FAILED}</p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                Thử lại
              </Button>
            </div>
          ) : (
            <Loading />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
