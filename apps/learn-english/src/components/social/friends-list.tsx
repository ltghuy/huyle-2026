"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal, RotateCw, UserMinus, Users } from "lucide-react";
import { toast } from "sonner";
import { AccountAvatar } from "@/components/account/account-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { removeFriend, SocialError } from "@/lib/social-client";
import { cn } from "@/lib/utils";
import type { Friend, PulseResponse } from "@/server/social/social.schema";
import { lastActive } from "./last-active";
import { SOCIAL_KEY, sortFriends, useSocial } from "./use-social";

// The learner's friends with who is online (feature 031, AC-010 to AC-020): in the sidebar on
// wide screens and on the Đấu trường page on phones. Friend requests live in the bell.

export const LOAD_FAILED = "Không tải được danh sách bạn bè.";
const REMOVE_FAILED = "Chưa xóa được. Bạn thử lại nhé.";

/** "2/7 đang trực tuyến" (AC-014). */
export function onlineSummary(friends: Friend[]): string {
  return `${friends.filter((friend) => friend.online).length}/${friends.length} đang trực tuyến`;
}

/** The friend's picture with a green (online) or grey (offline) dot at its corner (AC-012, AC-013). */
export function FriendAvatar({ friend, className }: { friend: Friend; className?: string }) {
  return (
    <span className={cn("relative shrink-0", className)}>
      <AccountAvatar name={friend.name} image={friend.image} className="size-8" />
      <span
        aria-hidden
        className={cn("absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-background", friend.online ? "bg-success" : "bg-muted-foreground/60")}
      />
    </span>
  );
}

function FriendRow({ friend, now, onRemove }: { friend: Friend; now: number; onRemove: (friend: Friend) => void }) {
  const status = friend.online ? "Đang trực tuyến" : lastActive(friend.lastSeenAt, now);
  return (
    <li className="group/friend flex min-h-12 items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-sidebar-accent">
      <FriendAvatar friend={friend} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{friend.name}</p>
        <p className={cn("truncate text-xs", friend.online ? "text-success" : "text-muted-foreground")}>{status}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Tùy chọn cho ${friend.name}`} className="shrink-0 text-muted-foreground" />}
        >
          <MoreHorizontal aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onClick={() => onRemove(friend)}>
            <UserMinus aria-hidden /> Xóa bạn
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function LoadingRows() {
  return (
    <ul aria-hidden className="grid gap-1 px-2">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-2.5 py-1.5">
          <Skeleton className="size-8 rounded-full" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        </li>
      ))}
    </ul>
  );
}

interface FriendsListProps {
  /** Shows the "Bạn bè" heading row above the list (the sidebar has its own label). */
  heading?: boolean;
  className?: string;
  /** Classes for the scrolling list itself (the sidebar caps its height). */
  listClassName?: string;
}

export function FriendsList({ heading = true, className, listClassName }: FriendsListProps) {
  const { signedIn, query } = useSocial();
  const queryClient = useQueryClient();
  const [removing, setRemoving] = useState<Friend | null>(null);
  const [busy, setBusy] = useState(false);
  // The sidebar and the phone card can both be in the page.
  const titleId = useId();

  if (!signedIn) return null;
  const data = query.data;
  const friends = data ? sortFriends(data.friends) : [];

  async function handleConfirmRemove() {
    if (!removing) return;
    const friend = removing;
    setBusy(true);
    try {
      await removeFriend(friend.id);
      queryClient.setQueryData<PulseResponse>(SOCIAL_KEY, (old) => (old ? { ...old, friends: old.friends.filter((f) => f.id !== friend.id) } : old));
      void queryClient.invalidateQueries({ queryKey: SOCIAL_KEY });
      setRemoving(null);
    } catch (error) {
      toast.error(error instanceof SocialError ? error.message : REMOVE_FAILED);
    } finally {
      setBusy(false);
    }
  }

  function handleRetry() {
    void query.refetch();
  }

  function handleOpenChange(open: boolean) {
    if (!open && !busy) setRemoving(null);
  }

  return (
    <section aria-labelledby={titleId} className={cn("grid min-h-0 gap-1", className)}>
      <div className="flex items-baseline justify-between gap-2 px-2">
        <h2 id={titleId} className={cn("text-sm font-semibold", !heading && "sr-only")}>
          Bạn bè
        </h2>
        {data && friends.length > 0 ? <span className="text-xs text-muted-foreground tabular-nums">{onlineSummary(friends)}</span> : null}
      </div>
      {!data && query.isError ? (
        <div className="grid justify-items-start gap-2 px-2 py-1 text-sm text-muted-foreground">
          <p>{LOAD_FAILED}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RotateCw aria-hidden /> Thử lại
          </Button>
        </div>
      ) : !data ? (
        <LoadingRows />
      ) : friends.length === 0 ? (
        <div className="grid justify-items-start gap-1.5 px-2 py-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <Users aria-hidden className="size-4" /> Bạn chưa có bạn bè nào.
          </p>
          <p>Kết bạn với người bạn đã đấu cùng ở Đấu trường nhé.</p>
          <Link href="/arena" className="font-medium text-primary underline-offset-4 hover:underline">
            Vào Đấu trường
          </Link>
        </div>
      ) : (
        <ul className={cn("grid min-h-0 content-start gap-0.5 overflow-y-auto overscroll-contain", listClassName)}>
          {friends.map((friend) => (
            <FriendRow key={friend.id} friend={friend} now={data.now} onRemove={setRemoving} />
          ))}
        </ul>
      )}
      <AlertDialog open={removing !== null} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa {removing?.name} khỏi bạn bè?</AlertDialogTitle>
            <AlertDialogDescription>Hai bạn sẽ không còn thấy nhau trong danh sách bạn bè. Người kia không nhận được thông báo nào.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmRemove} disabled={busy}>
              Xóa bạn
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
