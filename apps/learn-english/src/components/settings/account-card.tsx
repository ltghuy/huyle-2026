"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, LogOut, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AccountAvatar } from "@/components/account/account-avatar";
import { SignInButton } from "@/components/account/sign-in-button";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SESSION_QUERY_KEY, useAccount } from "@/hooks/use-account";
import { signOutOfGoogle, type SessionAccount } from "@/lib/auth-client";
import { clearDevice } from "@/storage/replace";
import { exportProgress } from "./backup-actions";

const PUSH_FAILED = "Chưa gửi được các thay đổi mới nhất lên tài khoản. Nếu đăng xuất bây giờ, những thay đổi đó sẽ mất.";

/** Sends what the account doesn't have yet; false when that couldn't be done. */
async function pushLastChanges(): Promise<boolean> {
  try {
    const { pushNow } = await import("@/sync/sync-client");
    await pushNow();
    return true;
  } catch {
    return false;
  }
}

/**
 * The account in Settings (feature 022, AC-001, AC-005, AC-022, AC-023): sign in as a guest; once
 * signed in, who the learner is, signing out, and deleting the account with all its progress.
 */
export function AccountCard() {
  const { status, account } = useAccount();
  return (
    <Card id="tai-khoan">
      <CardHeader>
        <CardTitle>Tài khoản</CardTitle>
        <CardDescription>
          {status === "guest"
            ? "Đăng nhập với Google để học bài hôm nay, ôn tập, luyện ngữ pháp và giữ tiến độ trên mọi thiết bị."
            : "Tiến độ của bạn được lưu vào tài khoản Google này và giống nhau trên mọi thiết bị bạn đăng nhập."}{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Ứng dụng lưu những gì?
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "unknown" ? <Skeleton className="h-16 w-full" /> : null}
        {status === "guest" ? <SignInButton /> : null}
        {account && (status === "signed-in" || status === "expired") ? <SignedIn account={account} expired={status === "expired"} /> : null}
      </CardContent>
    </Card>
  );
}

function SignedIn({ account, expired }: { account: SessionAccount; expired: boolean }) {
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<"sign-out" | "delete" | null>(null);
  const [pushFailed, setPushFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function finish(message: string) {
    await clearDevice(Date.now());
    await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    setDialog(null);
    setPushFailed(false);
    toast.success(message);
  }

  async function handleSignOut() {
    setBusy(true);
    // First try: send the last changes. If that fails, the second press signs out anyway.
    if (!pushFailed && !(await pushLastChanges())) {
      setPushFailed(true);
      setBusy(false);
      return;
    }
    await signOutOfGoogle().catch(() => {});
    await finish("Đã đăng xuất. Tiến độ của bạn vẫn được lưu trong tài khoản.");
    setBusy(false);
  }

  async function handleExport() {
    try {
      await exportProgress(Date.now());
      toast.success("Đã tải file sao lưu về máy.");
    } catch {
      toast.error("Chưa xuất được file sao lưu. Bạn thử lại nhé.");
    }
  }

  async function handleDelete() {
    setBusy(true);
    const response = await fetch("/api/account", { method: "DELETE", credentials: "same-origin" }).catch(() => null);
    if (!response?.ok) {
      setBusy(false);
      toast.error("Chưa xóa được tài khoản. Bạn kiểm tra mạng rồi thử lại nhé.");
      return;
    }
    await finish("Đã xóa tài khoản và toàn bộ tiến độ.");
    setBusy(false);
  }

  function handleOpenChange(open: boolean) {
    if (open) return;
    setDialog(null);
    setPushFailed(false);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3">
        <AccountAvatar name={account.name} image={account.image} className="size-12 shrink-0 text-base" />
        <div className="min-w-0">
          <p className="truncate font-medium">{account.name}</p>
          <p className="truncate text-sm text-muted-foreground">{account.email}</p>
        </div>
      </div>
      {expired ? (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">Phiên đăng nhập đã hết hạn. Tiến độ vẫn ở trên máy này và sẽ được gửi lên khi bạn đăng nhập lại.</p>
          <SignInButton label="Đăng nhập lại" />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="lg" className="h-11 px-4" onClick={() => setDialog("sign-out")}>
          <LogOut aria-hidden /> Đăng xuất
        </Button>
        <Button variant="ghost" size="lg" className="h-11 px-4 text-destructive" onClick={() => setDialog("delete")}>
          <Trash2 aria-hidden /> Xóa tài khoản
        </Button>
      </div>

      <AlertDialog open={dialog === "sign-out"} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Đăng xuất khỏi thiết bị này?</AlertDialogTitle>
            <AlertDialogDescription>
              {pushFailed ? PUSH_FAILED : "Tiến độ đã được lưu vào tài khoản. Sau khi đăng xuất, thiết bị này sẽ không còn tiến độ của bạn cho đến khi bạn đăng nhập lại."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <AlertDialogAction variant={pushFailed ? "destructive" : "default"} onClick={handleSignOut} disabled={busy}>
              {pushFailed ? "Vẫn đăng xuất" : "Đăng xuất"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === "delete"} onOpenChange={handleOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tài khoản?</AlertDialogTitle>
            <AlertDialogDescription>
              Tài khoản và toàn bộ tiến độ (từ đã học, lịch ôn tập, chuỗi ngày học, điểm) sẽ bị xóa khỏi máy chủ và thiết bị này, không lấy lại được. Bạn nên xuất
              tiến độ ra file trước.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Hủy</AlertDialogCancel>
            <Button variant="outline" onClick={handleExport} disabled={busy}>
              <Download aria-hidden /> Xuất trước
            </Button>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={busy}>
              Xóa tài khoản
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
