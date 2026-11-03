"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { SESSION_QUERY_KEY, useAccount } from "@/hooks/use-account";
import { useProfile } from "@/hooks/use-profile";
import { signOutOfGoogle, SIGN_IN_ERROR_PARAM, type SessionAccount } from "@/lib/auth-client";
import type { ProgressSummary } from "@/learning/snapshot";
import type { AccountLink } from "@/learning/types";
import { clearDevice } from "@/storage/replace";

export const SIGN_IN_CANCELLED = "Bạn chưa đăng nhập. Bạn vẫn học từ vựng được như trước nhé.";
const MOVE_FAILED = "Chưa chuyển được tiến độ vào tài khoản. Ứng dụng sẽ thử lại lần sau.";

/** "Đã chuyển 120 từ, 3 chủ điểm ngữ pháp và chuỗi 15 ngày vào tài khoản" (AC-014); null when there was nothing to move. */
export function movedMessage({ wordsLearned, grammarLearned, streak }: ProgressSummary): string | null {
  const parts = [
    wordsLearned > 0 ? `${wordsLearned} từ` : null,
    grammarLearned > 0 ? `${grammarLearned} chủ điểm ngữ pháp` : null,
    streak > 0 ? `chuỗi ${streak} ngày` : null,
  ].filter((part): part is string => part !== null);
  if (parts.length === 0) return null;
  const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} và ${parts.at(-1)}`;
  return `Đã chuyển ${list} vào tài khoản.`;
}

/** Whether the device holds progress of `cached` the account may not have yet. */
function hasUnsynced(cached: AccountLink): boolean {
  return cached.linkedAt === undefined || cached.dirty === true;
}

/** Shows the cancel message once when Google sent the learner back with `?error=` (AC-003), and tidies the URL. */
function useSignInErrorNotice() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(SIGN_IN_ERROR_PARAM)) return;
    url.searchParams.delete(SIGN_IN_ERROR_PARAM);
    window.history.replaceState(window.history.state, "", url);
    toast(SIGN_IN_CANCELLED);
  }, []);
}

async function link(live: SessionAccount, firstTime: boolean) {
  const { linkAccount } = await import("@/sync/sync-client");
  try {
    const summary = await linkAccount(live);
    const message = firstTime ? movedMessage(summary) : null;
    if (message) toast.success(message);
  } catch {
    // The device keeps its progress; the next visit tries again (AC-018).
    if (firstTime) toast.error(MOVE_FAILED);
  }
}

/**
 * After a Google sign-in (feature 022): moves this device's progress into the account the first
 * time, reconnects an expired one, and asks before a different account takes over a device that
 * still holds another account's unsynced progress. Mounted once per layout; renders only that dialog.
 */
export function AccountLinker() {
  const { session } = useAccount();
  const profile = useProfile();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const handled = useRef<string | null>(null);
  useSignInErrorNotice();

  const cached = profile.status === "ready" ? profile.data.account : undefined;
  const live = session ?? null;
  // Another account signed in on a device that still holds this one's unsynced progress: ask first.
  const conflict = live && cached && cached.userId !== live.userId && hasUnsynced(cached) ? { previous: cached, next: live } : null;

  useEffect(() => {
    if (!live || profile.status !== "ready" || handled.current === live.userId) return;
    const needsLink = !cached || cached.userId !== live.userId || cached.linkedAt === undefined || cached.expired === true;
    if (!needsLink) return;
    if (cached && cached.userId !== live.userId) {
      if (hasUnsynced(cached)) return; // the dialog decides
      handled.current = live.userId;
      void clearDevice(Date.now()).then(() => link(live, true));
      return;
    }
    handled.current = live.userId;
    void link(live, cached?.linkedAt === undefined);
  }, [live, cached, profile.status]);

  async function handleContinue() {
    if (!conflict) return;
    const { next } = conflict;
    setBusy(true);
    handled.current = next.userId;
    await clearDevice(Date.now());
    await link(next, true);
    setBusy(false);
  }

  async function handleCancel() {
    setBusy(true);
    // Keep the previous account's progress on this device: undo the new sign-in.
    await signOutOfGoogle().catch(() => {});
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    setBusy(false);
  }

  return (
    <AlertDialog open={conflict !== null && !busy}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Đổi sang tài khoản khác?</AlertDialogTitle>
          <AlertDialogDescription>
            Thiết bị này còn tiến độ chưa đồng bộ của {conflict?.previous.name}. Nếu tiếp tục với {conflict?.next.name}, tiến độ đó sẽ bị
            xóa khỏi thiết bị này. Để giữ lại, bạn hãy hủy rồi đăng nhập bằng tài khoản {conflict?.previous.email} để đồng bộ trước.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>Hủy</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleContinue}>
            Tiếp tục
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
