"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAccount } from "@/hooks/use-account";
import { useStorageQuery } from "@/hooks/use-storage-query";
import { getAllAttendance } from "@/storage/attendance";
import { getAllCards } from "@/storage/cards";
import { SignInButton } from "./sign-in-button";

const SEEN_KEY = "learn-english:guest-notice-seen";
const STORES = ["cards", "attendance"] as const;

function wasSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Blocked storage: it may show again next visit.
  }
}

async function hasProgress(): Promise<boolean> {
  const [cards, attendance] = await Promise.all([getAllCards(), getAllAttendance()]);
  return cards.length > 0 || attendance.length > 0;
}

/**
 * Once, for a learner who used the app before sign-in existed (feature 022, AC-026): the lesson,
 * review and practice need Google now, and their progress is safe here until it moves.
 */
export function GuestNotice() {
  const { status } = useAccount();
  const progress = useStorageQuery(["guest-notice"], hasProgress, STORES);
  const [dismissed, setDismissed] = useState(wasSeen);
  const open = !dismissed && status === "guest" && progress.status === "ready" && progress.data;

  function handleOpenChange(next: boolean) {
    if (next) return;
    markSeen();
    setDismissed(true);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bài học giờ cần đăng nhập</DialogTitle>
          <DialogDescription>
            Từ nay, bài học hôm nay, ôn tập, ngữ pháp và bài tập cần đăng nhập bằng Google; từ vựng vẫn mở cho mọi người. Tiến độ của bạn vẫn an toàn trên
            thiết bị này và sẽ được chuyển vào tài khoản khi bạn đăng nhập.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" size="lg" className="h-11 px-4" onClick={() => handleOpenChange(false)}>
            Để sau
          </Button>
          <SignInButton />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
